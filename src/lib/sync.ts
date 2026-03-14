import { supabase } from "./supabase";
import {
  initDB,
  getPendingSync,
  addPendingSync,
  removePendingSync,
  saveProducts,
  saveSale,
  updateProductStock,
} from "./indexeddb";
import { formatCurrency } from "./currency";

// Network status detection
export let isOnline = navigator.onLine;

export const checkOnlineStatus = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (navigator.onLine) {
      // Ping Supabase to confirm
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: "HEAD",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      })
        .then(() => resolve(true))
        .catch(() => resolve(false));
    } else {
      resolve(false);
    }
  });
};

// Listen for network changes
export const initNetworkListener = () => {
  window.addEventListener("online", async () => {
    isOnline = true;
    console.log("🌐 Online - Starting sync...");
    await processSyncQueue();
  });

  window.addEventListener("offline", () => {
    isOnline = false;
    console.log("📴 Offline mode");
  });
};

// Process pending sync queue
export const processSyncQueue = async () => {
  if (!isOnline) return;

  try {
    const db = await initDB();
    let pending = await getPendingSync();
    // Fix TS: ensure proper type
    const typedPending: Array<{id: string, type: "product"|"sale"|"inventory_update", data: any, timestamp: string}> = pending;

    for (const item of pending) {
      try {
        await syncItem(item);
        await removePendingSync(item.id);
        console.log(`✅ Synced: ${item.type} ${item.id}`);
      } catch (error) {
        console.error(`❌ Sync failed: ${item.id}`, error);
        // Retry later
        break;
      }
    }
  } catch (error) {
    console.error("Sync queue error:", error);
  }
};

// Individual sync operations
async function syncItem(item: any) {
  switch (item.type) {
    case "product":
      const { data, error } = await supabase
        .from("products")
        .upsert(item.data)
        .select()
        .single();
      if (data) await saveProducts([data]);
      break;

    case "sale":
      // Insert sale first
      const { data: saleData } = await supabase
        .from("sales")
        .insert(item.data.sale)
        .select()
        .single();

      if (saleData) {
        // Insert sale_items
        await supabase.from("sale_items").insert(item.data.items);

        // Update product stock
        for (const saleItem of item.data.items) {
          await updateProductStock(saleItem.product_id, saleItem.quantity);
        }

        // Update inventory logs
        for (const saleItem of item.data.items) {
          await supabase.from("inventory_logs").insert({
            product_id: saleItem.product_id,
            change_type: "sale",
            quantity_changed: -saleItem.quantity,
            created_at: new Date().toISOString(),
          });
        }

        await saveSale({ ...saleData, items: item.data.items });
      }
      break;

    case "inventory_update":
      await supabase.from("inventory_logs").insert(item.data);
      break;
  }
}

// Queue item for later sync
export const queueForSync = async (
  type: "product" | "sale" | "inventory_update",
  data: any,
) => {
  const syncItem = {
    id: crypto.randomUUID(),
    type,
    data,
    timestamp: new Date().toISOString(),
  };
  await addPendingSync(syncItem);
  console.log(`⏳ Queued for sync: ${type}`);

  if (isOnline) {
    // Try immediate sync
    setTimeout(processSyncQueue, 1000);
  }
};

// Initial data sync (load Supabase → IndexedDB)
export const syncFromSupabase = async () => {
  if (!isOnline) return;

  try {
    // Sync products
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (products) {
      await saveProducts(products);
      console.log(`📦 Synced ${products.length} products`);
    }

    // Sync recent sales (last 30 days)
    const { data: sales } = await supabase
      .from("sales")
      .select(
        `
        *,
        sale_items (
          *,
          products (*)
        )
      `,
      )
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      );

    if (sales) {
      // Transform for IndexedDB
      const salesWithItems = sales.map((sale: any) => ({
        ...sale,
        items: sale.sale_items.map((item: any) => ({
          ...item,
          product_name: item.products?.name,
        })),
      }));
      // Save sales (batch)
      for (const sale of salesWithItems) {
        await saveSale(sale);
      }
    }
  } catch (error) {
    console.error("Initial sync failed:", error);
  }
};
