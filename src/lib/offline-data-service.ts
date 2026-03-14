import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/supabase';
import { 
  getAllProducts, 
  saveProducts,
  getAllSales,
  saveSale,
  addPendingSync
} from '@/lib/indexeddb';
import { isOnline } from '@/lib/offline-utils';

interface InventoryItem {
  id: string;
  name: string;
  barcode: string;
  stock_quantity: number;
  category: string;
  price: number;
  image: string;
  created_at: string;
  status: boolean;
}

export class OfflineDataService {
  // Universal data fetching with offline fallback
  static async fetchProducts() {
    try {
      if (isOnline()) {
        const { data: productsData, error } = await supabase
          .from('products')
          .select('*')
          .eq('status', true)
          .order('name', { ascending: true });
          
        if (!error && productsData) {
          // Save to IndexedDB for offline use
          await saveProducts(productsData);
          return productsData;
        }
      }
      
      // Fallback to IndexedDB
      return await getAllProducts();
    } catch (error) {
      console.error('Error fetching products:', error);
      return await getAllProducts();
    }
  }

  static async fetchSales(startDate?: string, endDate?: string) {
    try {
      if (isOnline()) {
        let query = supabase
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (startDate) {
          query = query.gte('created_at', startDate);
        }
        if (endDate) {
          query = query.lte('created_at', endDate);
        }
          
        const { data: salesData, error } = await query;
        
        if (!error && salesData) {
          // Save to IndexedDB for offline use
          for (const sale of salesData) {
            await saveSale(sale);
          }
          return salesData;
        }
      }
      
      // Fallback to IndexedDB
      return await getAllSales();
    } catch (error) {
      console.error('Error fetching sales:', error);
      return await getAllSales();
    }
  }

  static async fetchInventory(): Promise<InventoryItem[]> {
    try {
      if (isOnline()) {
        const { data: inventoryData, error } = await supabase
          .from('products')
          .select('id, name, barcode, stock_quantity, category, price, image, created_at')
          .order('name', { ascending: true });
          
        if (!error && inventoryData) {
          // Save to IndexedDB using products store (convert to Product type)
          const productsData: Product[] = inventoryData.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            barcode: item.barcode,
            stock_quantity: item.stock_quantity,
            category: item.category,
            image: item.image,
            created_at: item.created_at
          }));
          
          await saveProducts(productsData);
          
          // Return as InventoryItem with status
          return inventoryData.map(item => ({
            ...item,
            status: true // Default status for inventory view
          }));
        }
      }
      
      // Fallback to IndexedDB - get all products and map to inventory format
      const products = await getAllProducts();
      return products.map(product => ({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        stock_quantity: product.stock_quantity,
        category: product.category,
        price: product.price,
        image: product.image,
        created_at: product.created_at,
        status: true // Add default status for inventory view
      }));
    } catch (error) {
      console.error('Error fetching inventory:', error);
      // Fallback to IndexedDB
      const products = await getAllProducts();
      return products.map(product => ({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        stock_quantity: product.stock_quantity,
        category: product.category,
        price: product.price,
        image: product.image,
        created_at: product.created_at,
        status: true // Add default status for inventory view
      }));
    }
  }

  static async fetchReports(startDate?: string, endDate?: string) {
    try {
      if (isOnline()) {
        let query = supabase
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (startDate) {
          query = query.gte('created_at', startDate);
        }
        if (endDate) {
          query = query.lte('created_at', endDate);
        }
          
        const { data: reportsData, error } = await query;
        
        if (!error && reportsData) {
          return reportsData;
        }
      }
      
      // Fallback to IndexedDB
      return await getAllSales();
    } catch (error) {
      console.error('Error fetching reports:', error);
      return await getAllSales();
    }
  }

  static async fetchStaff() {
    try {
      if (isOnline()) {
        const { data: staffData, error } = await supabase
          .from('staff')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (!error && staffData) {
          return staffData;
        }
      }
      
      // Staff management requires online mode
      throw new Error('Staff management requires internet connection');
    } catch (error) {
      console.error('Error fetching staff:', error);
      throw error;
    }
  }

  // Universal data saving with offline queuing
  static async saveProduct(product: any) {
    try {
      if (isOnline()) {
        const { data, error } = await supabase
          .from('products')
          .upsert(product)
          .select()
          .single();
          
        if (error) throw error;
        return data;
      } else {
        // Queue for sync when online
        await addPendingSync({
          id: `product_${Date.now()}`,
          type: 'inventory_update',
          data: product,
          timestamp: new Date().toISOString()
        });
        throw new Error('Product changes will be synced when online');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      throw error;
    }
  }

  static async deleteProduct(productId: string) {
    try {
      if (isOnline()) {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);
          
        if (error) throw error;
      } else {
        // Queue for sync when online
        await addPendingSync({
          id: `delete_product_${Date.now()}`,
          type: 'inventory_update',
          data: { id: productId, action: 'delete' },
          timestamp: new Date().toISOString()
        });
        throw new Error('Product deletion will be synced when online');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  static async updateStock(productId: string, quantity: number) {
    try {
      if (isOnline()) {
        const { data, error } = await supabase
          .from('products')
          .update({ stock_quantity: quantity })
          .eq('id', productId)
          .select()
          .single();
          
        if (error) throw error;
        return data;
      } else {
        // Queue for sync when online
        await addPendingSync({
          id: `stock_${Date.now()}`,
          type: 'inventory_update',
          data: { id: productId, stock_quantity: quantity },
          timestamp: new Date().toISOString()
        });
        throw new Error('Stock update will be synced when online');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }

  static async createStaff(staffData: any) {
    try {
      if (isOnline()) {
        // This requires the StaffService implementation
        throw new Error('Staff creation requires StaffService');
      } else {
        throw new Error('Staff management requires internet connection');
      }
    } catch (error) {
      console.error('Error creating staff:', error);
      throw error;
    }
  }

  // Sync status indicator
  static getSyncStatus() {
    return {
      isOnline: isOnline(),
      message: isOnline() ? 'Connected' : 'Offline - Limited functionality',
      canManageStaff: isOnline(),
      canManageProducts: true, // Can queue for sync
      canViewReports: true, // Can view cached data
      canProcessSales: true, // Can process sales offline
    };
  }
}
