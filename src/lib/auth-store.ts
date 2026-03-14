import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  role: "super_admin" | "cashier";
  status: boolean;
  created_at: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOfflineMode: boolean;
  error: string | null;
  
  // Online authentication
  loginOnline: (email: string, password: string) => Promise<boolean>;
  
  // Offline authentication
  loginOffline: (email: string, password: string) => Promise<boolean>;
  
  // Dual authentication (tries online first, falls back to offline)
  login: (email: string, password: string) => Promise<boolean>;
  
  logout: () => Promise<void>;
  
  // Session management
  restoreSession: () => Promise<boolean>;
  clearSession: () => void;
  
  // Sync functions
  syncUserData: () => Promise<void>;
  
  // Offline detection
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
            console.log('Auth successful, user ID:', data.user.id);
            console.log('Looking for user profile...');
            
            // Get user profile from staff table (for cashiers) or users table (for admins)
            let userProfile;
            let profileError;

            // Try staff table first (for cashiers)
            const { data: staffProfile, error: staffError } = await supabase
              .from("staff")
              .select("*")
              .eq("user_id", data.user.id)
              .single();

            console.log('Staff query result:', { staffProfile, staffError });

            if (!staffError && staffProfile) {
              // Found in staff table
              console.log('Found user in staff table:', staffProfile);
              userProfile = {
                id: staffProfile.id,
                name: staffProfile.name,
                email: staffProfile.email,
                role: staffProfile.role,
                status: staffProfile.status === 'active',
                created_at: staffProfile.created_at
              };
            } else {
              console.log('Not found in staff table, trying users table...');
              // Try users table (for other users)
              const { data: userTableProfile, error: userTableError } = await supabase
                .from("users")
                .select("*")
                .eq("id", data.user.id)
                .single();

              console.log('Users table query result:', { userTableProfile, userTableError });

              if (userTableError || !userTableProfile) {
                console.error('User profile not found in either table');
                set({ error: "User profile not found", isLoading: false });
                return false;
              }
              
              userProfile = userTableProfile;
            }

            // Store user profile locally in IndexedDB
            const passwordHash = await bcrypt.hash(password, 10);
            await saveLocalUser({
              id: userProfile.id,
              name: userProfile.name,
              email: userProfile.email,
              password_hash: passwordHash,
              role: userProfile.role,
              status: userProfile.status,
              last_sync: new Date().toISOString(),
            });

            // Store session in localStorage for fast access
            localStorage.setItem('pos_session', JSON.stringify({
              user: userProfile,
              expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            }));

            set({
              user: userProfile,
              isAuthenticated: true,
              isLoading: false,
              isOfflineMode: false,
            });

            return true;
          }
        } catch (error) {
          set({ error: "Login failed", isLoading: false });
          return false;
        }

        set({ isLoading: false });
        return false;
      },

      loginOffline: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Get user from IndexedDB
          const localUser = await getLocalUserByEmail(email);
          
          if (!localUser) {
            set({ error: "User not found locally", isLoading: false });
            return false;
          }

          // Compare password using bcrypt
          const passwordMatch = await bcrypt.compare(password, localUser.password_hash);
          
          if (!passwordMatch) {
            set({ error: "Invalid credentials", isLoading: false });
            return false;
          }

          // Create user object for store
          const user: User = {
            id: localUser.id,
            name: localUser.name,
            email: localUser.email,
            role: localUser.role,
            status: localUser.status,
            created_at: localUser.last_sync,
          };

          // Store session in localStorage
          localStorage.setItem('pos_session', JSON.stringify({
            user,
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            isOffline: true,
          }));

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            isOfflineMode: true,
          });

          return true;
        } catch (error) {
          set({ error: "Offline login failed", isLoading: false });
          return false;
        }
      },

      login: async (email: string, password: string) => {
        const state = get();
        
        // Try online login first if connected
        if (isOnline()) {
          const onlineSuccess = await state.loginOnline(email, password);
          if (onlineSuccess) {
            return true;
          }
          
          // If online login fails, try offline
          const offlineSuccess = await state.loginOffline(email, password);
          if (offlineSuccess) {
            return true;
          }
        } else {
          // Offline mode, try offline login
          const offlineSuccess = await state.loginOffline(email, password);
          if (offlineSuccess) {
            return true;
          }
        }
        
        return false;
      },

      logout: async () => {
        try {
          // Sign out from Supabase if online
          if (isOnline()) {
            await supabase.auth.signOut();
          }
        } catch (error) {
          console.error('Supabase logout error:', error);
        }
        
        // Clear all session data
        get().clearSession();
        
        // Clear cart
        const { useCartStore } = await import('@/lib/store');
        const cartStore = useCartStore.getState();
        cartStore.clearCart();
      },

      restoreSession: async () => {
        set({ isLoading: true });
        
        try {
          const sessionData = localStorage.getItem('pos_session');
          if (!sessionData) {
            set({ isLoading: false });
            return false;
          }

          const session = JSON.parse(sessionData);
          
          // Validate session has required fields
          if (!session.user || !session.user.id || !session.user.email) {
            localStorage.removeItem('pos_session');
            set({ isLoading: false });
            return false;
          }
          
          // Check if session is expired
          if (session.expiresAt && Date.now() > session.expiresAt) {
            localStorage.removeItem('pos_session');
            set({ isLoading: false });
            return false;
          }

          set({
            user: session.user,
            isAuthenticated: true,
            isOfflineMode: session.isOfflineMode || false,
            isLoading: false,
          });

          return true;
        } catch (error) {
          console.error('Session restore error:', error);
          localStorage.removeItem('pos_session');
          set({ isLoading: false });
          return false;
        }
      },

      clearSession: () => {
        // Clear all localStorage session data
        localStorage.removeItem('pos_session');
        localStorage.removeItem('cashier_session');
        localStorage.removeItem('onyxx-pos-auth-storage');
        localStorage.removeItem('onyxx-pos-cart');
        
        // Clear IndexedDB session if needed
        // This ensures complete session cleanup
        
        set({
          user: null,
          isAuthenticated: false,
          isOfflineMode: false,
          error: null,
        });
      },

      syncUserData: async () => {
        const { user } = get();
        if (!user || !isOnline()) return;

        try {
          // Fetch latest user data from Supabase
          const { data: userProfile, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();

          if (!error && userProfile) {
            await saveLocalUser({
              id: userProfile.id,
              name: userProfile.name,
              email: userProfile.email,
              password_hash: (await getLocalUserById(user.id))?.password_hash || '',
              role: userProfile.role,
              status: userProfile.status,
              last_sync: new Date().toISOString(),
            });

            set({ user: userProfile });
          }
        } catch (error) {
          console.error('Sync error:', error);
        }
      },

      checkOfflineStatus: () => {
        const isCurrentlyOffline = !isOnline();
        set({ isOfflineMode: isCurrentlyOffline });
      },
    }),
    {
      name: "auth-storage",
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
