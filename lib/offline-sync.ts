// Offline sync engine for POS system
// Handles synchronization between local IndexedDB and Supabase

import { localDB, OfflineQueueItem, Sale, Product } from './localDB';
import { supabase } from '../src/lib/supabase';

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: string | null;
  pendingItems: number;
  failedItems: number;
  syncInProgress: boolean;
  lastError: string | null;
}

export interface SyncProgress {
  total: number;
  completed: number;
  current: string;
  percentage: number;
}

class OfflineSyncEngine {
  private static instance: OfflineSyncEngine;
  private syncInProgress = false;
  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    lastSyncTime: null,
    pendingItems: 0,
    failedItems: 0,
    syncInProgress: false,
    lastError: null
  };
  private syncCallbacks: Array<(status: SyncStatus) => void> = [];
  private progressCallbacks: Array<(progress: SyncProgress) => void> = [];
  private syncInterval: NodeJS.Timeout | null = null;

  static getInstance(): OfflineSyncEngine {
    if (!OfflineSyncEngine.instance) {
      OfflineSyncEngine.instance = new OfflineSyncEngine();
    }
    return OfflineSyncEngine.instance;
  }

  constructor() {
    this.initializeEventListeners();
    this.startPeriodicSync();
  }

  private initializeEventListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true;
      this.notifyStatusChange();
      this.syncPendingItems();
    });

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false;
      this.notifyStatusChange();
    });
  }

  private startPeriodicSync(): void {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.syncStatus.isOnline && !this.syncInProgress) {
        this.syncPendingItems();
      }
    }, 30000);
  }

  // Public methods
  public onStatusChange(callback: (status: SyncStatus) => void): void {
    this.syncCallbacks.push(callback);
    callback(this.syncStatus);
  }

  public onProgress(callback: (progress: SyncProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  private notifyStatusChange(): void {
    this.syncCallbacks.forEach(callback => callback(this.syncStatus));
  }

  private notifyProgress(progress: SyncProgress): void {
    this.progressCallbacks.forEach(callback => callback(progress));
  }

  public async getStatus(): Promise<SyncStatus> {
    const pendingItems = await localDB.getPendingQueueItems();
    this.syncStatus.pendingItems = pendingItems.length;
    return { ...this.syncStatus };
  }

  // Queue management
  public async queueSale(sale: Sale): Promise<void> {
    const queueItem: OfflineQueueItem = {
      id: `sale_${sale.id}`,
      type: 'sale',
      data: sale,
      timestamp: new Date().toISOString(),
      retry_count: 0,
      status: 'pending'
    };

    await localDB.addToOfflineQueue(queueItem);
    this.syncStatus.pendingItems++;
    this.notifyStatusChange();

    // Try to sync immediately if online
    if (this.syncStatus.isOnline && !this.syncInProgress) {
      this.syncPendingItems();
    }
  }

  public async queueProduct(product: Product): Promise<void> {
    const queueItem: OfflineQueueItem = {
      id: `product_${product.id}`,
      type: 'product',
      data: product,
      timestamp: new Date().toISOString(),
      retry_count: 0,
      status: 'pending'
    };

    await localDB.addToOfflineQueue(queueItem);
    this.syncStatus.pendingItems++;
    this.notifyStatusChange();

    // Try to sync immediately if online
    if (this.syncStatus.isOnline && !this.syncInProgress) {
      this.syncPendingItems();
    }
  }

  // Sync methods
  public async syncPendingItems(): Promise<boolean> {
    if (this.syncInProgress || !this.syncStatus.isOnline) {
      return false;
    }

    this.syncInProgress = true;
    this.syncStatus.syncInProgress = true;
    this.notifyStatusChange();

    try {
      const pendingItems = await localDB.getPendingQueueItems();
      
      if (pendingItems.length === 0) {
        this.syncStatus.lastSyncTime = new Date().toISOString();
        this.syncStatus.syncInProgress = false;
        this.notifyStatusChange();
        return true;
      }

      const progress: SyncProgress = {
        total: pendingItems.length,
        completed: 0,
        current: '',
        percentage: 0
      };

      let successCount = 0;
      let failureCount = 0;

      for (const item of pendingItems) {
        progress.current = `Syncing ${item.type}: ${item.id}`;
        progress.completed = successCount + failureCount;
        progress.percentage = Math.round((progress.completed / progress.total) * 100);
        this.notifyProgress(progress);

        try {
          const success = await this.syncItem(item);
          
          if (success) {
            successCount++;
            await localDB.removeQueueItem(item.id);
          } else {
            failureCount++;
            await this.markItemAsFailed(item);
          }
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          failureCount++;
          await this.markItemAsFailed(item);
        }
      }

      // Update status
      this.syncStatus.lastSyncTime = new Date().toISOString();
      this.syncStatus.pendingItems = await this.getPendingCount();
      this.syncStatus.failedItems = failureCount;
      this.syncStatus.lastError = failureCount > 0 ? `${failureCount} items failed to sync` : null;

      return failureCount === 0;
    } catch (error) {
      console.error('Sync failed:', error);
      this.syncStatus.lastError = error instanceof Error ? error.message : 'Unknown error';
      return false;
    } finally {
      this.syncInProgress = false;
      this.syncStatus.syncInProgress = false;
      this.notifyStatusChange();
    }
  }

  private async syncItem(item: OfflineQueueItem): Promise<boolean> {
    switch (item.type) {
      case 'sale':
        return await this.syncSale(item.data as Sale);
      case 'product':
        return await this.syncProduct(item.data as Product);
      default:
        console.warn(`Unknown item type: ${item.type}`);
        return false;
    }
  }

  private async syncSale(sale: Sale): Promise<boolean> {
    try {
      // Check if sale already exists in Supabase
      const { data: existingSale } = await supabase
        .from('sales')
        .select('id')
        .eq('id', sale.id)
        .single();

      if (existingSale) {
        // Update existing sale
        const { error } = await supabase
          .from('sales')
          .update({
            ...sale,
            synced: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', sale.id);

        if (error) throw error;
      } else {
        // Insert new sale
        const { error } = await supabase
          .from('sales')
          .insert({
            ...sale,
            synced: true,
            created_at: sale.created_at,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      // Mark sale as synced in local database
      const updatedSale = { ...sale, synced: true };
      await localDB.saveSale(updatedSale);

      return true;
    } catch (error) {
      console.error('Failed to sync sale:', error);
      return false;
    }
  }

  private async syncProduct(product: Product): Promise<boolean> {
    try {
      // Check if product already exists in Supabase
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('id', product.id)
        .single();

      if (existingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            ...product,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id);

        if (error) throw error;
      } else {
        // Insert new product
        const { error } = await supabase
          .from('products')
          .insert({
            ...product,
            created_at: product.created_at,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to sync product:', error);
      return false;
    }
  }

  private async markItemAsFailed(item: OfflineQueueItem): Promise<void> {
    const updatedItem = {
      ...item,
      retry_count: item.retry_count + 1,
      last_attempt: new Date().toISOString(),
      status: (item.retry_count >= 3 ? 'failed' : 'pending') as 'pending' | 'syncing' | 'failed' | 'completed'
    };

    await localDB.updateQueueItem(updatedItem);

    if (updatedItem.status === 'failed') {
      this.syncStatus.failedItems++;
    }
  }

  private async getPendingCount(): Promise<number> {
    const pendingItems = await localDB.getPendingQueueItems();
    return pendingItems.length;
  }

  // Force sync method
  public async forceSync(): Promise<boolean> {
    if (!this.syncStatus.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    return await this.syncPendingItems();
  }

  // Manual retry for failed items
  public async retryFailedItems(): Promise<boolean> {
    const allItems = await localDB.getOfflineQueue();
    const failedItems = allItems.filter(item => item.status === 'failed');

    for (const item of failedItems) {
      const resetItem = {
        ...item,
        status: 'pending' as const,
        retry_count: 0,
        last_attempt: undefined,
        error_message: undefined
      };
      await localDB.updateQueueItem(resetItem);
    }

    return await this.syncPendingItems();
  }

  // Conflict resolution
  public async resolveConflicts(): Promise<void> {
    // Implementation for resolving conflicts between local and remote data
    // This would involve comparing timestamps and deciding which version to keep
    console.log('Conflict resolution not implemented yet');
  }

  // Cleanup old queue items
  public async cleanupOldItems(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const allItems = await localDB.getOfflineQueue();
    const oldItems = allItems.filter(item => 
      new Date(item.timestamp) < cutoffDate && 
      (item.status === 'completed' || item.status === 'failed')
    );

    for (const item of oldItems) {
      await localDB.removeQueueItem(item.id);
    }

    console.log(`Cleaned up ${oldItems.length} old queue items`);
  }

  // Export/Import for backup
  public async exportSyncData(): Promise<any> {
    const queueItems = await localDB.getOfflineQueue();
    return {
      queueItems,
      status: this.syncStatus,
      exportedAt: new Date().toISOString()
    };
  }

  public async importSyncData(data: any): Promise<void> {
    if (data.queueItems) {
      for (const item of data.queueItems) {
        await localDB.updateQueueItem(item);
      }
    }
  }

  // Destroy method
  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.syncCallbacks = [];
    this.progressCallbacks = [];
  }
}

// Export singleton instance
export const offlineSync = OfflineSyncEngine.getInstance();
