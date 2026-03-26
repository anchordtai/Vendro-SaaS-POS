const { createClient } = require("@supabase/supabase-js");

function getSupabaseClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon) return { anonClient: null, serviceClient: null };

  const anonClient = createClient(url, anon, { auth: { persistSession: false } });
  const serviceClient = service
    ? createClient(url, service, { auth: { persistSession: false } })
    : null;

  return { anonClient, serviceClient };
}

async function isOnline(url) {
  try {
    const res = await fetch(`${url}/rest/v1/`, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function pullProductsToSqlite({ dbApi }) {
  const { anonClient } = getSupabaseClients();
  if (!anonClient) return { ok: false, message: "Supabase env vars not set" };

  const { data, error } = await anonClient
    .from("products")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return { ok: false, message: error.message };
  const products = data || [];
  for (const p of products) {
    // Map online schema -> offline schema
    dbApi.upsertProduct({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock_quantity ?? p.stock ?? 0,
      barcode: p.barcode ?? null,
      category: p.category ?? null,
    });
  }
  return { ok: true, pulled: products.length };
}

async function pushOfflineSalesToSupabase({ dbApi }) {
  const { serviceClient } = getSupabaseClients();
  if (!serviceClient) {
    // We intentionally do NOT block offline usage.
    return {
      ok: false,
      message:
        "SUPABASE_SERVICE_ROLE_KEY not set. Sales remain queued locally for later sync.",
    };
  }

  const txs = dbApi.listUnsyncedTransactions({ type: "sale", limit: 100 });
  let pushed = 0;
  for (const tx of txs) {
    const payload = JSON.parse(tx.payload_json || "{}");
    const sale = payload.sale;
    if (!sale?.id) {
      dbApi.markTransactionSynced(tx.id);
      continue;
    }

    // Insert into existing online sales table without changing online logic.
    // Uses service role to bypass RLS.
    const { error } = await serviceClient.from("sales").insert([
      {
        id: sale.id,
        cashier_id: null,
        cashier_name: sale.cashier_name,
        total_amount: sale.total,
        payment_method: sale.payment_method,
        receipt_number: sale.receipt_number,
        created_at: sale.created_at,
        items: sale.items ?? [],
      },
    ]);

    if (!error) {
      dbApi.markTransactionSynced(tx.id);
      pushed += 1;
    } else {
      // Stop on first failure to retry later
      return { ok: false, pushed, message: error.message };
    }
  }

  return { ok: true, pushed };
}

async function runSync({ dbApi }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return { ok: false, message: "Supabase URL missing" };
  const online = await isOnline(url);
  if (!online) return { ok: false, message: "Offline" };

  const pull = await pullProductsToSqlite({ dbApi });
  const push = await pushOfflineSalesToSupabase({ dbApi });
  return { ok: true, pull, push };
}

module.exports = { runSync };

