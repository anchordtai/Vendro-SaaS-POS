import { openDB, IDBPDatabase } from 'idb';

// Database schema definitions
export interface Product {
  id: string;
  name: string;
  price_naira: number;
  barcode: string;
  stock_quantity: number;
  image_url: string;
  created_at: string;
  updated_at?: string;
  category?: string;
  description?: string;
  low_stock_threshold?: number;
  is_active: boolean;
}

export interface Sale {
  id: string;
  cashier_id: string;
  cashier_name: string;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'pos_card';
  receipt_number: string;
  created_at: string;
  items: SaleItem[];
  synced?: boolean;
  sync_attempt_count?: number;
  last_sync_attempt?: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  barcode?: string;
}

export interface OfflineQueueItem {
  id: string;
  type: 'sale' | 'product' | 'inventory_update';
  data: any;
  timestamp: string;
  retry_count: number;
  last_attempt?: string;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  error_message?: string;
}

export interface Settings {
  id: string;
  key: string;
  value: any;
  updated_at: string;
}

export interface DashboardStats {
  total_sales_today: number;
  transaction_count_today: number;
  top_products: Array<{
    product_id: string;
    product_name: string;
    quantity_sold: number;
    total_revenue: number;
  }>;
  recent_sales: Sale[];
  last_updated: string;
}

// Database configuration
const DB_NAME = 'onyxx-pos-db';
const DB_VERSION = 1;

// Object store names
export const STORES = {
  PRODUCTS: 'products',
  SALES: 'sales',
  SALE_ITEMS: 'sale_items',
  OFFLINE_QUEUE: 'offline_queue',
  SETTINGS: 'settings',
  DASHBOARD_STATS: 'dashboard_stats'
} as const;

// Database class
class LocalDB {
  private db: IDBPDatabase | null = null;

  async init(): Promise<IDBPDatabase> {
    if (this.db) return this.db;

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Products store
        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
          productStore.createIndex('barcode', 'barcode', { unique: true });
          productStore.createIndex('name', 'name');
          productStore.createIndex('category', 'category');
          productStore.createIndex('created_at', 'created_at');
          productStore.createIndex('is_active', 'is_active');
        }

        // Sales store
        if (!db.objectStoreNames.contains(STORES.SALES)) {
          const salesStore = db.createObjectStore(STORES.SALES, { keyPath: 'id' });
          salesStore.createIndex('cashier_id', 'cashier_id');
          salesStore.createIndex('receipt_number', 'receipt_number', { unique: true });
          salesStore.createIndex('created_at', 'created_at');
          salesStore.createIndex('payment_method', 'payment_method');
          salesStore.createIndex('synced', 'synced');
        }

        // Sale items store
        if (!db.objectStoreNames.contains(STORES.SALE_ITEMS)) {
          const saleItemsStore = db.createObjectStore(STORES.SALE_ITEMS, { keyPath: 'id' });
          saleItemsStore.createIndex('sale_id', 'sale_id');
          saleItemsStore.createIndex('product_id', 'product_id');
          saleItemsStore.createIndex('barcode', 'barcode');
        }

        // Offline queue store
        if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
          const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: 'id' });
          queueStore.createIndex('type', 'type');
          queueStore.createIndex('status', 'status');
          queueStore.createIndex('timestamp', 'timestamp');
        }

        // Settings store
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          const settingsStore = db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
          settingsStore.createIndex('updated_at', 'updated_at');
        }

        // Dashboard stats store
        if (!db.objectStoreNames.contains(STORES.DASHBOARD_STATS)) {
          const statsStore = db.createObjectStore(STORES.DASHBOARD_STATS, { keyPath: 'id' });
          statsStore.createIndex('last_updated', 'last_updated');
        }
      }
    });

    return this.db;
  }

  // Product operations
  async saveProduct(product: Product): Promise<void> {
    const db = await this.init();
    await db.put(STORES.PRODUCTS, {
      ...product,
      updated_at: new Date().toISOString()
    });
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const db = await this.init();
    return await db.get(STORES.PRODUCTS, id);
  }

  async getProducts(): Promise<Product[]> {
    const db = await this.init();
    return await db.getAll(STORES.PRODUCTS);
  }

  async getActiveProducts(): Promise<Product[]> {
    const db = await this.init();
    const allProducts = await db.getAll(STORES.PRODUCTS);
    return allProducts.filter(product => product.is_active === true);
  }

  async searchProducts(query: string): Promise<Product[]> {
    const db = await this.init();
    const allProducts = await db.getAll(STORES.PRODUCTS);
    const searchTerm = query.toLowerCase();
    
    return allProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      product.barcode.includes(searchTerm) ||
      (product.category && product.category.toLowerCase().includes(searchTerm))
    );
  }

  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    const db = await this.init();
    return await db.getFromIndex(STORES.PRODUCTS, 'barcode', barcode);
  }

  async deleteProduct(id: string): Promise<void> {
    const db = await this.init();
    await db.delete(STORES.PRODUCTS, id);
  }

  // Sales operations
  async saveSale(sale: Sale): Promise<void> {
    const db = await this.init();
    
    // Save the sale
    await db.put(STORES.SALES, sale);
    
    // Save sale items
    for (const item of sale.items) {
      await db.put(STORES.SALE_ITEMS, item);
    }
    
    // Add to offline queue if not synced
    if (!sale.synced) {
      await this.addToOfflineQueue({
        id: `sale_${sale.id}`,
        type: 'sale',
        data: sale,
        timestamp: new Date().toISOString(),
        retry_count: 0,
        status: 'pending'
      });
    }
  }

  async getSale(id: string): Promise<Sale | undefined> {
    const db = await this.init();
    const sale = await db.get(STORES.SALES, id);
    
    if (sale) {
      // Get sale items
      const items = await db.getAllFromIndex(STORES.SALE_ITEMS, 'sale_id', id);
      sale.items = items;
    }
    
    return sale;
  }

  async getSales(limit?: number): Promise<Sale[]> {
    const db = await this.init();
    let sales = await db.getAll(STORES.SALES);
    
    // Sort by created_at descending
    sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Apply limit if specified
    if (limit) {
      sales = sales.slice(0, limit);
    }
    
    // Get items for each sale
    for (const sale of sales) {
      const items = await db.getAllFromIndex(STORES.SALE_ITEMS, 'sale_id', sale.id);
      sale.items = items;
    }
    
    return sales;
  }

  async getTodaySales(): Promise<Sale[]> {
    const db = await this.init();
    const today = new Date().toDateString();
    const allSales = await db.getAll(STORES.SALES);
    
    return allSales.filter(sale => 
      new Date(sale.created_at).toDateString() === today
    );
  }

  // Offline queue operations
  async addToOfflineQueue(item: OfflineQueueItem): Promise<void> {
    const db = await this.init();
    await db.put(STORES.OFFLINE_QUEUE, item);
  }

  async getOfflineQueue(): Promise<OfflineQueueItem[]> {
    const db = await this.init();
    return await db.getAll(STORES.OFFLINE_QUEUE);
  }

  async getPendingQueueItems(): Promise<OfflineQueueItem[]> {
    const db = await this.init();
    return await db.getAllFromIndex(STORES.OFFLINE_QUEUE, 'status', 'pending');
  }

  async updateQueueItem(item: OfflineQueueItem): Promise<void> {
    const db = await this.init();
    await db.put(STORES.OFFLINE_QUEUE, item);
  }

  async removeQueueItem(id: string): Promise<void> {
    const db = await this.init();
    await db.delete(STORES.OFFLINE_QUEUE, id);
  }

  // Settings operations
  async getSetting(key: string): Promise<any> {
    const db = await this.init();
    const setting = await db.get(STORES.SETTINGS, key);
    return setting ? setting.value : null;
  }

  async setSetting(key: string, value: any): Promise<void> {
    const db = await this.init();
    await db.put(STORES.SETTINGS, {
      key,
      value,
      updated_at: new Date().toISOString()
    });
  }

  // Dashboard stats operations
  async updateDashboardStats(stats: DashboardStats): Promise<void> {
    const db = await this.init();
    await db.put(STORES.DASHBOARD_STATS, {
      ...stats,
      id: 'current',
      last_updated: new Date().toISOString()
    });
  }

  async getDashboardStats(): Promise<DashboardStats | undefined> {
    const db = await this.init();
    return await db.get(STORES.DASHBOARD_STATS, 'current');
  }

  // Utility operations
  async clearAllData(): Promise<void> {
    const db = await this.init();
    const transaction = db.transaction(Object.values(STORES), 'readwrite');
    
    for (const store of Object.values(STORES)) {
      await transaction.objectStore(store).clear();
    }
    
    await transaction.done;
  }

  async exportData(): Promise<any> {
    const db = await this.init();
    const data: any = {};
    
    for (const store of Object.values(STORES)) {
      data[store] = await db.getAll(store);
    }
    
    return data;
  }

  async importData(data: any): Promise<void> {
    const db = await this.init();
    const transaction = db.transaction(Object.values(STORES), 'readwrite');
    
    // Import products
    if (data.products) {
      const store = transaction.objectStore(STORES.PRODUCTS);
      for (const record of data.products) {
        await store.put(record);
      }
    }
    
    // Import sales
    if (data.sales) {
      const store = transaction.objectStore(STORES.SALES);
      for (const record of data.sales) {
        await store.put(record);
      }
    }
    
    // Import sale items
    if (data.sale_items) {
      const store = transaction.objectStore(STORES.SALE_ITEMS);
      for (const record of data.sale_items) {
        await store.put(record);
      }
    }
    
    // Import offline queue
    if (data.offline_queue) {
      const store = transaction.objectStore(STORES.OFFLINE_QUEUE);
      for (const record of data.offline_queue) {
        await store.put(record);
      }
    }
    
    // Import settings
    if (data.settings) {
      const store = transaction.objectStore(STORES.SETTINGS);
      for (const record of data.settings) {
        await store.put(record);
      }
    }
    
    // Import dashboard stats
    if (data.dashboard_stats) {
      const store = transaction.objectStore(STORES.DASHBOARD_STATS);
      for (const record of data.dashboard_stats) {
        await store.put(record);
      }
    }
    
    await transaction.done;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const localDB = new LocalDB();
