const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const isDev = process.env.NODE_ENV === "development";

const { PosPrinter } = require("electron-pos-printer");
const dbApi = require("./database");
const licenseApi = require("./license");
const { startBackend } = require("./backend");
const { runSync } = require("./sync");

// Keep a global reference of the window object
let mainWindow;
let backendServer;
let backendPort = 31337;
let userDataPath;
let dbPath;

// Reduce "cache access denied" errors on some Windows setups
try {
  // Must be set before app is ready
  const tentativeUserData = app.getPath("userData");
  const cacheDir = path.join(tentativeUserData, "cache");
  app.commandLine.appendSwitch("disk-cache-dir", cacheDir);
  app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
} catch {}

async function tryStartBackend() {
  const portsToTry = [31337, 31338, 31339, 31340, 31341, 31342, 31343];
  for (const p of portsToTry) {
    try {
      const started = await startBackend({
        port: p,
        dbApi,
        licenseApi,
        userDataPath,
      });
      backendPort = p;
      backendServer = started.server;
      console.log(`Local backend running on http://127.0.0.1:${backendPort}`);
      return;
    } catch (e) {
      if (e?.code === "EADDRINUSE") continue;
      console.error("Failed to start backend:", e);
      return;
    }
  }
  console.error("Failed to start backend: no available ports in range");
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
    },
    // Kiosk-style window for POS
    kiosk: false, // Allow window management for development
    resizable: true,
    maximizable: true,
    minimizable: true,
    alwaysOnTop: false,
    fullscreen: false,
    fullscreenable: true,
    icon: path.join(__dirname, "../public/favicon.ico"),
  });

  // Take full screen size on launch (offline POS should feel native)
  mainWindow.maximize();

  // Load the app
  if (isDev) {
    // Dev keeps online POS unchanged
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    // Production Electron is offline-first: load static UI from out/
    const offlineIndex = path.join(__dirname, "../out/index.html");
    mainWindow.loadFile(offlineIndex);
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle navigation errors
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("Failed to load:", errorCode, errorDescription);
    if (!isDev) {
      const offlineIndex = path.join(__dirname, "../out/index.html");
      if (fs.existsSync(offlineIndex)) mainWindow.loadFile(offlineIndex);
    }
  });

  // Prevent new window creation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow opening external links in OS browser
    if (url.startsWith("http")) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: "deny" };
  });

  // Handle external links
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    if (isDev) return;
    // Block navigation away from local file UI
    if (!navigationUrl.startsWith("file://")) event.preventDefault();
  });
}

// App event handlers
app.whenReady().then(() => {
  userDataPath = app.getPath("userData");
  dbPath = path.join(userDataPath, "pos.db");
  dbApi.initDb(dbPath);

  // Start internal backend (optional for future integrations)
  tryStartBackend().catch((e) => console.error("Backend startup failed:", e));

  // IPC: License
  ipcMain.handle("check-license", async () => licenseApi.checkLicense(userDataPath));
  ipcMain.handle("activate-license", async (_e, key) => licenseApi.activateLicense(userDataPath, key));

  // IPC: Products & Sales
  ipcMain.handle("db:list-products", async (_e, query) => dbApi.listProducts({ query }));
  ipcMain.handle("db:upsert-product", async (_e, product) => dbApi.upsertProduct(product));
  ipcMain.handle("db:create-sale", async (_e, salePayload) => dbApi.createSale(salePayload));
  ipcMain.handle("db:report-today", async () => dbApi.getReports({}));

  // IPC: Sync (does not block offline usage if it fails)
  ipcMain.handle("sync-data", async () => {
    try {
      return await runSync({ dbApi });
    } catch (e) {
      return { ok: false, message: e?.message || "Sync failed" };
    }
  });
  ipcMain.handle("get-sync-status", async () => {
    const queued = dbApi.listUnsyncedTransactions({ limit: 5 });
    return { ok: true, queued: queued.length };
  });

  // IPC: Logging (preload forwards console.* here in production)
  ipcMain.handle("log", async (_e, level, message, data) => {
    const lvl = String(level || "info");
    const msg = String(message || "");
    // Keep logs concise; avoid crashing if renderer sends unexpected shapes
    try {
      const line = `[renderer:${lvl}] ${msg}`;
      if (lvl === "error") console.error(line);
      else if (lvl === "warn") console.warn(line);
      else console.log(line);
    } catch {}
    return { ok: true };
  });

  // IPC: Printers
  ipcMain.handle("get-printers", async () => {
    if (!mainWindow) return [];
    // Electron 28+ supports getPrintersAsync
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers || [];
  });

  ipcMain.handle("print-receipt", async (_e, receipt) => {
    if (!mainWindow) throw new Error("No window");
    const printers = await mainWindow.webContents.getPrintersAsync();
    const defaultPrinter = printers.find((p) => p.isDefault) || printers[0];
    const printerName = defaultPrinter?.name || "";

    const data = receipt?.items?.map((it) => ({
      type: "text",
      value: `${String(it.product_name || it.name).padEnd(18)} ${String(it.quantity).padStart(2)} x ₦${Number(it.price).toLocaleString()}`,
      style: { fontFamily: "monospace", fontSize: "10px" },
    })) || [];

    const header = [
      { type: "text", value: "ONYXX NIGHTLIFE POS", style: { textAlign: "center", fontWeight: "700", fontSize: "12px" } },
      { type: "text", value: `Receipt: ${receipt.receipt_number}`, style: { fontFamily: "monospace", fontSize: "10px" } },
      { type: "text", value: `Date: ${new Date(receipt.created_at).toLocaleString()}`, style: { fontFamily: "monospace", fontSize: "10px" } },
      { type: "text", value: `Cashier: ${receipt.cashier_name || ""}`, style: { fontFamily: "monospace", fontSize: "10px" } },
      { type: "text", value: "------------------------------", style: { fontFamily: "monospace", fontSize: "10px" } },
    ];

    const footer = [
      { type: "text", value: "------------------------------", style: { fontFamily: "monospace", fontSize: "10px" } },
      { type: "text", value: `TOTAL: ₦${Number(receipt.total).toLocaleString()}`, style: { fontFamily: "monospace", fontSize: "12px", fontWeight: "700" } },
      { type: "text", value: "Thank you!", style: { textAlign: "center", fontFamily: "monospace", fontSize: "10px" } },
    ];

    await PosPrinter.print([...header, ...data, ...footer], {
      preview: false,
      silent: true,
      printerName,
      margin: "0 0 0 0",
      timeOutPerLine: 200,
      pageSize: "80mm",
    });

    return { ok: true, printerName };
  });

  // Window controls (existing preload expects these)
  ipcMain.handle("minimize-window", () => mainWindow?.minimize());
  ipcMain.handle("maximize-window", () => (mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize()));
  ipcMain.handle("close-window", () => mainWindow?.close());
  ipcMain.handle("quit-app", () => app.quit());

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  try {
    backendServer?.close?.();
  } catch {}
  if (process.platform !== "darwin") app.quit();
});

// Security: Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Someone tried to run a second instance, we should focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Handle certificate errors (for local development)
app.on("certificate-error", (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    // Ignore certificate errors in development
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // In production, you might want to restart the app or show an error dialog
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
