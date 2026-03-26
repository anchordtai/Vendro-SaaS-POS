const path = require("path");
const Database = require("better-sqlite3");

let db;

function openDb(dbPath) {
  if (db) return db;
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

function initDb(dbPath) {
  const d = openDb(dbPath);

  d.prepare(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      barcode TEXT,
      category TEXT,
      updated_at TEXT NOT NULL
    )
  `).run();

  d.prepare(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`).run();
  d.prepare(`CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at)`).run();

  d.prepare(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      receipt_number TEXT NOT NULL,
      cashier_name TEXT,
      payment_method TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL NOT NULL,
      total REAL NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();
  d.prepare(`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)`).run();

  d.prepare(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )
  `).run();
  d.prepare(`CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)`).run();

  // Generic transaction log for sync/activation/etc.
  d.prepare(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced_at TEXT
    )
  `).run();
  d.prepare(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`).run();
  d.prepare(`CREATE INDEX IF NOT EXISTS idx_transactions_synced_at ON transactions(synced_at)`).run();

  return d;
}

function listProducts({ query, limit = 200 } = {}) {
  const q = (query || "").trim();
  if (!q) {
    return db
      .prepare(`SELECT * FROM products ORDER BY name COLLATE NOCASE LIMIT ?`)
      .all(limit);
  }
  return db
    .prepare(
      `SELECT * FROM products
       WHERE name LIKE ? OR barcode LIKE ?
       ORDER BY name COLLATE NOCASE
       LIMIT ?`,
    )
    .all(`%${q}%`, `%${q}%`, limit);
}

function upsertProduct(product) {
  const now = new Date().toISOString();
  const p = {
    id: product.id || crypto.randomUUID(),
    name: String(product.name || "").trim(),
    price: Number(product.price || 0),
    stock: Number.isFinite(product.stock) ? product.stock : Number(product.stock_quantity || 0),
    barcode: product.barcode ? String(product.barcode) : null,
    category: product.category ? String(product.category) : null,
    updated_at: now,
  };
  if (!p.name) throw new Error("Product name is required");
  if (!Number.isFinite(p.price) || p.price < 0) throw new Error("Invalid price");
  if (!Number.isInteger(p.stock) || p.stock < 0) throw new Error("Invalid stock");

  db.prepare(
    `
    INSERT INTO products (id, name, price, stock, barcode, category, updated_at)
    VALUES (@id, @name, @price, @stock, @barcode, @category, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      price = excluded.price,
      stock = excluded.stock,
      barcode = excluded.barcode,
      category = excluded.category,
      updated_at = excluded.updated_at
  `,
  ).run(p);

  return getProductById(p.id);
}

function getProductById(id) {
  return db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
}

function createSale({ cashier_name, payment_method, items, taxRate = 0.05 } = {}) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("Cart is empty");
  const now = new Date().toISOString();
  const saleId = crypto.randomUUID();
  const receipt_number = `RCP${Date.now()}`;

  const normalized = items.map((it) => {
    if (!it?.product_id) throw new Error("Missing product_id");
    const quantity = Number(it.quantity || 0);
    const price = Number(it.price || 0);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Invalid quantity");
    if (!Number.isFinite(price) || price < 0) throw new Error("Invalid price");
    const subtotal = Number((quantity * price).toFixed(2));
    return {
      id: crypto.randomUUID(),
      sale_id: saleId,
      product_id: String(it.product_id),
      product_name: String(it.product_name || it.name || ""),
      quantity,
      price,
      subtotal,
    };
  });

  const subtotal = normalized.reduce((sum, it) => sum + it.subtotal, 0);
  const tax = Number((subtotal * taxRate).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  const tx = db.transaction(() => {
    db.prepare(
      `
      INSERT INTO sales (id, receipt_number, cashier_name, payment_method, subtotal, tax, total, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(saleId, receipt_number, cashier_name || null, payment_method, subtotal, tax, total, now);

    const insertItem = db.prepare(
      `
      INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, price, subtotal)
      VALUES (@id, @sale_id, @product_id, @product_name, @quantity, @price, @subtotal)
    `,
    );
    for (const it of normalized) insertItem.run(it);

    // Update stock
    const updateStock = db.prepare(`UPDATE products SET stock = stock - ? , updated_at = ? WHERE id = ?`);
    const checkStock = db.prepare(`SELECT stock FROM products WHERE id = ?`);
    for (const it of normalized) {
      const row = checkStock.get(it.product_id);
      if (!row) throw new Error(`Product not found: ${it.product_id}`);
      if (row.stock < it.quantity) throw new Error(`Insufficient stock for ${it.product_name}`);
      updateStock.run(it.quantity, now, it.product_id);
    }

    db.prepare(
      `INSERT INTO transactions (id, type, payload_json, created_at, synced_at) VALUES (?, ?, ?, ?, NULL)`,
    ).run(
      crypto.randomUUID(),
      "sale",
      JSON.stringify({
        sale: {
          id: saleId,
          receipt_number,
          cashier_name: cashier_name || null,
          payment_method,
          subtotal,
          tax,
          total,
          created_at: now,
          items: normalized.map((it) => ({
            product_id: it.product_id,
            product_name: it.product_name,
            quantity: it.quantity,
            price: it.price,
            subtotal: it.subtotal,
          })),
        },
      }),
      now,
    );
  });

  tx();

  return getSaleById(saleId);
}

function getSaleById(id) {
  const sale = db.prepare(`SELECT * FROM sales WHERE id = ?`).get(id);
  if (!sale) return null;
  const items = db.prepare(`SELECT * FROM sale_items WHERE sale_id = ? ORDER BY product_name`).all(id);
  return { ...sale, items };
}

function getReports({ date } = {}) {
  const day = date ? new Date(date) : new Date();
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const totals = db
    .prepare(
      `
      SELECT
        COALESCE(SUM(total), 0) as total_sales,
        COUNT(*) as total_transactions
      FROM sales
      WHERE created_at BETWEEN ? AND ?
    `,
    )
    .get(startIso, endIso);

  const bestSellers = db
    .prepare(
      `
      SELECT product_id, product_name, SUM(quantity) as qty
      FROM sale_items
      WHERE sale_id IN (
        SELECT id FROM sales WHERE created_at BETWEEN ? AND ?
      )
      GROUP BY product_id, product_name
      ORDER BY qty DESC
      LIMIT 10
    `,
    )
    .all(startIso, endIso);

  return { ...totals, best_sellers: bestSellers, range: { startIso, endIso } };
}

function listUnsyncedTransactions({ type, limit = 50 } = {}) {
  if (type) {
    return db
      .prepare(
        `SELECT * FROM transactions WHERE type = ? AND synced_at IS NULL ORDER BY created_at ASC LIMIT ?`,
      )
      .all(type, limit);
  }
  return db
    .prepare(`SELECT * FROM transactions WHERE synced_at IS NULL ORDER BY created_at ASC LIMIT ?`)
    .all(limit);
}

function markTransactionSynced(id) {
  const now = new Date().toISOString();
  db.prepare(`UPDATE transactions SET synced_at = ? WHERE id = ?`).run(now, id);
}

module.exports = {
  initDb,
  listProducts,
  upsertProduct,
  createSale,
  getSaleById,
  getReports,
  listUnsyncedTransactions,
  markTransactionSynced,
};


