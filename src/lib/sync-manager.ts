import { supabase } from "./supabase";
import { getAllLocalUsers, saveLocalUser } from "./indexeddb";
import { useAuthStore } from "./auth-store";
import { setupOfflineDetection, isOnline } from "./offline-utils";

class SyncManager {
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;
  private isSyncing = false;
  private eventCleanup: (() => void) | null = null;

  constructor() {
    this.setupSyncListeners();
    this.startPeriodicSync();
  }

  private setupSyncListeners() {
    // Only set up listeners in browser environment
    if (typeof window === 'undefined') {
      return;
    }
    
    this.eventCleanup = setupOfflineDetection((isOnline) => {
      this.isOnline = isOnline;
      if (isOnline) {
        console.log('Back online - syncing data...');
        this.forceSync();
      }
    });
  }

  // Start periodic sync when online
  public startPeriodicSync() {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      return;
    }
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sync every 5 minutes when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncUserData();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Stop periodic sync
  public stopPeriodicSync() {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      return;
    }
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Sync user data
  public async syncUserData() {
    if (this.isSyncing || !isOnline()) {
      return;
    }

    this.isSyncing = true;
    console.log('Starting user data synchronization...');

    try {
      await this.syncUsers();
      await this.verifyUserSession();
      console.log('User data synchronization completed');
    } catch (error) {
      console.error('User sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Sync all data
  public async syncAllData() {
    if (this.isSyncing || !isOnline()) {
      return;
    }

    this.isSyncing = true;
    console.log('Starting data synchronization...');

    try {
      await this.syncUsers();
      await this.verifyUserSession();
      console.log('Data synchronization completed');
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Sync user data
  private async syncUsers() {
    try {
      const localUsers = await getAllLocalUsers();
      
      for (const localUser of localUsers) {
        // Fetch latest user data from Supabase
        const { data: remoteUser, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", localUser.id)
          .single();

        if (!error && remoteUser) {
          // Update local user with latest data
          await saveLocalUser({
            ...localUser,
            name: remoteUser.name,
            email: remoteUser.email,
            role: remoteUser.role,
            status: remoteUser.status,
            last_sync: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('User sync error:', error);
    }
  }

  // Verify current user session
  private async verifyUserSession() {
    const authStore = useAuthStore.getState();
    
    if (!authStore.isAuthenticated || !authStore.user) {
      return;
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        // Session invalid, logout user
        authStore.clearSession();
        console.log('Session invalidated, user logged out');
        return;
      }

      // Fetch updated user profile
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profileError && userProfile) {
        // Update local user data
        await saveLocalUser({
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          password_hash: (await getAllLocalUsers())
            .find(u => u.id === userProfile.id)?.password_hash || '',
          role: userProfile.role,
          status: userProfile.status,
          last_sync: new Date().toISOString(),
        });

        // Update store with latest user data
        authStore.user = userProfile;
      }
    } catch (error) {
      console.error('Session verification error:', error);
    }
  }

  // Force immediate sync
  public async forceSync() {
    await this.syncUserData();
  }

  // Cleanup
  public cleanup() {
    this.stopPeriodicSync();
    if (this.eventCleanup) {
      this.eventCleanup();
      this.eventCleanup = null;
    }
  }

  // Get sync status
  public getSyncStatus() {
    return {
      isOnline: isOnline(),
      isSyncing: this.isSyncing,
      hasPeriodicSync: !!this.syncInterval,
    };
  }
}

// Export singleton instance
export const syncManager = new SyncManager();

// Auto-start periodic sync when online
if (typeof window !== 'undefined') {
  if (isOnline()) {
    syncManager.startPeriodicSync();
  }
}
