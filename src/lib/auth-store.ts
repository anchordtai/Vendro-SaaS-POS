import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import bcrypt from "bcryptjs";
import { supabase } from "./supabase";
import { 
  saveLocalUser, 
  getLocalUserByEmail, 
  getLocalUserById 
} from "./indexeddb";
import { isOnline, setupOfflineDetection } from "./offline-utils";
import { syncManager } from "./sync-manager";

interface User {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "tenant_admin" | "manager" | "cashier" | "staff";
  status: boolean; // maps from public.users.is_active
  created_at: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOfflineMode: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginOnline: (email: string, password: string) => Promise<boolean>;
  loginOffline: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  clearSession: () => void;
  syncUserData: () => Promise<void>;
  checkOfflineStatus: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isOfflineMode: false,
      error: null,

      login: async (email: string, password: string) => {
        // Try online login first, fall back to offline
        const onlineResult = await get().loginOnline(email, password);
        if (onlineResult) return true;
        
        // If online fails, try offline
        return await get().loginOffline(email, password);
      },

      loginOnline: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Authenticate with Supabase
          const { data, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) {
            set({ error: authError.message, isLoading: false });
            return false;
          }

          if (data.user && data.session) {
            // Get user profile from staff table (for cashiers) or users table (for admins)
            const { data: profile, error: profileError } = await supabase
              .from('staff')
              .select('*')
              .eq('email', email)
              .single();

            let userRecord = null;

            if (!profileError && profile) {
              userRecord = profile;
            } else {
              const { data: adminProfile, error: adminError } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

              if (!adminError && adminProfile) {
                userRecord = adminProfile;
              }
            }

            if (userRecord) {
              // Users table may not have role column; default to super_admin for admin logins
              const user: User = {
                id: userRecord.id,
                name: userRecord.name,
                email: userRecord.email,
                role: userRecord.role ?? "super_admin",
                status: userRecord.status,
                created_at: userRecord.created_at,
              };

              set({ 
                user, 
                isAuthenticated: true, 
                isLoading: false,
                error: null
              });

              // Store session data
              localStorage.setItem('pos_session', JSON.stringify({
                user,
                session: data.session,
                timestamp: Date.now()
              }));

              return true;
            } else {
              set({ error: 'User profile not found', isLoading: false });
              return false;
            }
          }
          return false;
        } catch (error) {
          console.error('Login error:', error);
          set({ error: 'Login failed', isLoading: false });
          return false;
        }
      },

      loginOffline: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Try to authenticate with local database
          const localUser = await getLocalUserByEmail(email);
          
          if (localUser && await bcrypt.compare(password, localUser.password_hash)) {
            const user: User = {
              id: localUser.id,
              name: localUser.name,
              email: localUser.email,
              role: localUser.role,
              status: localUser.status,
              created_at: localUser.last_sync,
            };

            set({ 
              user, 
              isAuthenticated: true, 
              isLoading: false,
              isOfflineMode: true,
              error: null
            });

            // Store session data
            localStorage.setItem('pos_session', JSON.stringify({
              user,
              timestamp: Date.now(),
              offline: true
            }));

            return true;
          } else {
            set({ error: 'Invalid credentials', isLoading: false });
            return false;
          }
        } catch (error) {
          console.error('Offline login error:', error);
          set({ error: 'Login failed', isLoading: false });
          return false;
        }
      },

      logout: () => {
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false,
          error: null
        });
        
        // Clear session data
        localStorage.removeItem('pos_session');
        
        // Sign out from Supabase if online
        supabase.auth.signOut().catch(console.error);
      },

      restoreSession: async () => {
        try {
          const sessionData = localStorage.getItem('pos_session');
          if (sessionData) {
            const session = JSON.parse(sessionData);
            if (session.user && session.timestamp) {
              // Check if session is still valid (24 hours)
              const now = Date.now();
              const sessionAge = now - session.timestamp;
              const maxAge = 24 * 60 * 60 * 1000; // 24 hours

              if (sessionAge < maxAge) {
                set({
                  user: session.user,
                  isAuthenticated: true,
                  isOfflineMode: session.offline || false,
                  error: null
                });
                return;
              }
            }
          }

          // Cookie-backed session (server-side /api/auth/login & /api/auth/signup)
          try {
            const res = await fetch("/api/auth/user", { credentials: "include" });
            if (res.ok) {
              const apiUser = await res.json();
              set({
                user: {
                  id: apiUser.id,
                  name: apiUser.name,
                  email: apiUser.email,
                  role: apiUser.role,
                  status: Boolean(apiUser.is_active),
                  created_at: apiUser.created_at,
                },
                isAuthenticated: true,
                isOfflineMode: false,
                error: null,
              });
              return;
            }
          } catch (e) {
            // Ignore and fall through to clearing local session
          }

          // Clear invalid session
          localStorage.removeItem('pos_session');
          set({
            user: null,
            isAuthenticated: false,
            isOfflineMode: false,
            error: null
          });
        } catch (error) {
          console.error('Session restore error:', error);
          localStorage.removeItem('pos_session');
          set({
            user: null,
            isAuthenticated: false,
            isOfflineMode: false,
            error: null
          });
        }
      },

      clearSession: () => {
        localStorage.removeItem('pos_session');
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isOfflineMode: false,
          error: null
        });
      },

      syncUserData: async () => {
        const { user } = get();
        if (!user || !isOnline()) return;

        try {
          // Sync user data with Supabase
          const { data, error } = await supabase
            .from('staff')
            .upsert({
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              status: user.status,
              last_sync: new Date().toISOString()
            })
            .select()
            .single();

          if (!error && data) {
            set({ user: data });
          }
        } catch (error) {
          console.error('Sync user data error:', error);
        }
      },

      checkOfflineStatus: () => {
        const isOffline = !isOnline();
        set({ isOfflineMode: isOffline });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isOfflineMode: state.isOfflineMode,
      }),
    }
  )
);

// Setup offline detection when the store is created
if (typeof window !== 'undefined') {
  setupOfflineDetection((isOnline: boolean) => {
    if (isOnline) {
      // When coming back online, try to sync data
      useAuthStore.getState().checkOfflineStatus();
      syncManager.forceSync();
    } else {
      // When going offline
      useAuthStore.getState().checkOfflineStatus();
    }
  });
}
