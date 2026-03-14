import { openDB, DBSchema, IDBPDatabase } from "idb";
import { CartItem, Product, Sale, SaleItem } from "./supabase";

interface OnyxxPOSDB extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: { "by-category": string; "by-barcode": string };
  };
  sales: {
    key: string;
    value: Sale & { items: SaleItem[] };
    indexes: { "by-date": string; "by-cashier": string };
  };
  pendingSync: {
    key: string;
    value: {
      id: string;
      type: "sale" | "inventory_update" | "product";
      data: any;
      timestamp: string;
    };
  };
  local_users: {
    key: string;
    value: {
      id: string;
      name: string;
      email: string;
      password_hash: string;
      role: "super_admin" | "cashier";
      status: boolean;
      last_sync: string;
    };
    indexes: { "by-email": string };
  };
}

let db: IDBPDatabase<OnyxxPOSDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<OnyxxPOSDB>> {
  if (db) return db;

  db = await openDB<OnyxxPOSDB>("onyxx-pos-db", 1, {
    upgrade(database) {
      // Products store
      const productStore = database.createObjectStore("products", {
        keyPath: "id",
      });
      productStore.createIndex("by-category", "category");
      productStore.createIndex("by-barcode", "barcode");

      // Sales store
      const salesStore = database.createObjectStore("sales", { keyPath: "id" });
      salesStore.createIndex("by-date", "created_at");
      salesStore.createIndex("by-cashier", "cashier_id");

      // Pending sync store
      database.createObjectStore("pendingSync", { keyPath: "id" });

      // Local users store
      const usersStore = database.createObjectStore("local_users", { keyPath: "id" });
      usersStore.createIndex("by-email", "email");
    },
  });

  return db;
}

// Product operations
export async function saveProduct(product: Product): Promise<void> {
  const database = await initDB();
  await database.put("products", product);
}

export async function saveProducts(products: Product[]): Promise<void> {
  const database = await initDB();
  const tx = database.transaction("products", "readwrite");
  await Promise.all([
    ...products.map((product) => tx.store.put(product)),
    tx.done,
  ]);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const database = await initDB();
  return database.get("products", id);
}

export async function getProductByBarcode(
  barcode: string,
): Promise<Product | undefined> {
  const database = await initDB();
  return database.getFromIndex("products", "by-barcode", barcode);
}

export async function getAllProducts(): Promise<Product[]> {
  const database = await initDB();
  return database.getAll("products");
}

export async function getProductsByCategory(
  category: string,
): Promise<Product[]> {
  const database = await initDB();
  return database.getAllFromIndex("products", "by-category", category);
}

export async function deleteProduct(id: string): Promise<void> {
  const database = await initDB();
  await database.delete("products", id);
}

// Sales operations
export async function saveSale(
  sale: Sale & { items: SaleItem[] },
): Promise<void> {
  const database = await initDB();
  await database.put("sales", sale);
}

export async function getSale(
  id: string,
): Promise<(Sale & { items: SaleItem[] }) | undefined> {
  const database = await initDB();
  return database.get("sales", id);
}

export async function getAllSales(): Promise<(Sale & { items: SaleItem[] })[]> {
  const database = await initDB();
  return database.getAll("sales");
}

export async function getSalesByDate(
  date: string,
): Promise<(Sale & { items: SaleItem[] })[]> {
  const database = await initDB();
  return database.getAllFromIndex("sales", "by-date", date);
}

export async function getSalesByCashier(
  cashierId: string,
): Promise<(Sale & { items: SaleItem[] })[]> {
  const database = await initDB();
  return database.getAllFromIndex("sales", "by-cashier", cashierId);
}

// Pending sync operations
export async function addPendingSync(item: {
  id: string;
  type: "sale" | "inventory_update" | "product";
  data: any;
  timestamp: string;
}): Promise<void> {
  const database = await initDB();
  await database.put("pendingSync", item);
}

export async function getPendingSync(): Promise<any[]> {
  const database = await initDB();
  return database.getAll("pendingSync");
}

export async function removePendingSync(id: string): Promise<void> {
  const database = await initDB();
  await database.delete("pendingSync", id);
}

export async function clearPendingSync(): Promise<void> {
  const database = await initDB();
  await database.clear("pendingSync");
}

// Update product stock in IndexedDB
export async function updateProductStock(
  productId: string,
  newQuantity: number,
): Promise<void> {
  const database = await initDB();
  const product = await database.get("products", productId);
  if (product) {
    product.stock_quantity = newQuantity;
    await database.put("products", product);
  }
}

// Local users operations
export async function saveLocalUser(user: {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "super_admin" | "cashier";
  status: boolean;
  last_sync: string;
}): Promise<void> {
  const database = await initDB();
  await database.put("local_users", user);
}

export async function getLocalUserByEmail(
  email: string,
): Promise<{
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "super_admin" | "cashier";
  status: boolean;
  last_sync: string;
} | undefined> {
  const database = await initDB();
  return database.getFromIndex("local_users", "by-email", email);
}

export async function getLocalUserById(
  id: string,
): Promise<{
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "super_admin" | "cashier";
  status: boolean;
  last_sync: string;
} | undefined> {
  const database = await initDB();
  return database.get("local_users", id);
}

export async function getAllLocalUsers(): Promise<{
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "super_admin" | "cashier";
  status: boolean;
  last_sync: string;
}[]> {
  const database = await initDB();
  return database.getAll("local_users");
}

export async function deleteLocalUser(id: string): Promise<void> {
  const database = await initDB();
  await database.delete("local_users", id);
}

// Clear all data (for testing/reset)
export async function clearAllData(): Promise<void> {
  const database = await initDB();
  
  // Clear all object stores
  const stores = ['products', 'sales', 'pendingSync', 'local_users'] as const;
  
  for (const store of stores) {
    const transaction = database.transaction(store, 'readwrite');
    await transaction.objectStore(store).clear();
    await transaction.done;
  }
  
  console.log('All IndexedDB data cleared');
}
