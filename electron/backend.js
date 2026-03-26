const express = require("express");
const cors = require("cors");

async function startBackend({ port, dbApi, licenseApi, userDataPath }) {
  const app = express();
  app.use(cors({ origin: "*" }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.get("/license", (_req, res) => {
    res.json(licenseApi.checkLicense(userDataPath));
  });

  app.post("/license/activate", (req, res) => {
    const { key } = req.body || {};
    res.json(licenseApi.activateLicense(userDataPath, key));
  });

  app.get("/products", (req, res) => {
    const q = req.query.q ? String(req.query.q) : "";
    const products = dbApi.listProducts({ query: q });
    res.json({ ok: true, products });
  });

  app.post("/products", (req, res) => {
    try {
      const product = dbApi.upsertProduct(req.body || {});
      res.json({ ok: true, product });
    } catch (e) {
      res.status(400).json({ ok: false, message: e?.message || "Invalid product" });
    }
  });

  app.post("/sales", (req, res) => {
    try {
      const result = dbApi.createSale(req.body || {});
      res.json({ ok: true, sale: result });
    } catch (e) {
      res.status(400).json({ ok: false, message: e?.message || "Sale failed" });
    }
  });

  app.get("/reports/today", (_req, res) => {
    const report = dbApi.getReports({});
    res.json({ ok: true, report });
  });

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(port, "127.0.0.1");
    s.once("listening", () => resolve(s));
    s.once("error", (err) => reject(err));
  });

  return { app, server };
}

module.exports = { startBackend };


