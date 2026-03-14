import {
  initDB,
  getAllProducts,
  getProduct,
  getProductByBarcode,
  saveProduct,
  saveProducts,
  saveSale,
  getAllSales,
  updateProductStock,
} from "./indexeddb";
import { supabase, Product, Sale } from "./supabase";
import {
  syncFromSupabase,
  queueForSync,
  initNetworkListener,
  processSyncQueue,
  isOnline,
} from "./sync";
import { formatCurrency } from "./currency";

// Central local-first data layer
class LocalDB {
  private initialized = false;

  async init() {
    if (this.initialized) return;

    // Init IndexedDB + network listener
    await initDB();
    initNetworkListener();

    // Initial sync from Supabase
    await syncFromSupabase();

    // Periodic sync check (every 30s when online)
    setInterval(() => {
      if (isOnline) processSyncQueue();
    }, 30000);

    this.initialized = true;
  }

  // ========== PRODUCTS ==========

  // Always check local first (lightning fast POS)
  async getProduct(id: string): Promise<Product | null> {
    await this.init();
    return (await getProduct(id)) || null;
  }

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    await this.init();
    return (await getProductByBarcode(barcode)) || null;
  }

  async getAllProducts(): Promise<Product[]> {
    await this.init();
    return await getAllProducts();
  }

  // Create/Update product (local + queue sync)
  async saveProduct(
    product: Omit<Product, "created_at"> & { created_at?: string },
  ): Promise<Product> {
    await this.init();

    const fullProduct = {
      ...product,
      created_at: product.created_at || new Date().toISOString(),
    } as Product;

    // Save locally first (instant UI feedback)
    await saveProduct(fullProduct);

    // Queue for Supabase sync
    await queueForSync("product", fullProduct);

    return fullProduct;
  }

  // Bulk products (admin sync)
  async syncProducts(products: Product[]) {
    await this.init();
    await saveProducts(products);
  }

  // ========== SALES ==========

  async saveSale(sale: Sale & { items: any[] }): Promise<string> {
    await this.init();

    const saleId = crypto.randomUUID();
    const fullSale = {
      ...sale,
      id: saleId,
      created_at: new Date().toISOString(),
    };

    // Save locally (works offline)
    await saveSale(fullSale);

    // Queue sync payload
    await queueForSync("sale", {
      sale: {
        id: saleId,
        cashier_id: fullSale.cashier_id,
        total_amount: fullSale.total_amount,
        payment_method: fullSale.payment_method,
        created_at: fullSale.created_at,
      },
      items: sale.items.map((item: any) => ({
        id: crypto.randomUUID(),
        sale_id: saleId,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      })),
    });

    // Update local stock instantly
    for (const item of sale.items) {
      await updateProductStock(item.product_id, -(item.quantity as number));
    }

    return saleId;
  }

  async getAllSales(): Promise<(Sale & { items: any[] })[]> {
    await this.init();
    return await getAllSales();
  }

  // ========== STOCK ==========
  async updateStock(productId: string, quantity: number) {
    await this.init();
    await updateProductStock(productId, quantity);

    // Queue inventory log
    await queueForSync("inventory_update", {
      product_id: productId,
      change_type: quantity < 0 ? "sale" : "restock",
      quantity_changed: quantity,
      created_at: new Date().toISOString(),
    });
  }

  // ========== STATUS ==========
  getOnlineStatus() {
    return isOnline;
  }

  async forceSync() {
    await processSyncQueue();
  }
}

// Singleton instance
export const localDB = new LocalDB();
export default localDB;

// Auto-init on import (POS startup)
localDB.init().then(() => {
  console.log("🗄️ LocalDB ready - Offline-first POS enabled");
});
