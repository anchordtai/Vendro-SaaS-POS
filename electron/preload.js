const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // System information
  platform: process.platform,
  
  // App information
  getVersion: () => process.env.npm_package_version || '1.0.0',
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // File system operations
  saveFile: (data, filename) => ipcRenderer.invoke('save-file', data, filename),
  openFile: () => ipcRenderer.invoke('open-file'),
  
  // Printer operations
  printReceipt: (receiptData) => ipcRenderer.invoke('print-receipt', receiptData),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  
  // Database operations (if needed for advanced features)
  exportData: (data, format) => ipcRenderer.invoke('export-data', data, format),
  
  // Network status
  getNetworkStatus: () => ipcRenderer.invoke('get-network-status'),
  
  // App lifecycle
  quitApp: () => ipcRenderer.invoke('quit-app'),
  restartApp: () => ipcRenderer.invoke('restart-app'),
  
  // Development helpers
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  
  // Error reporting
  reportError: (error) => ipcRenderer.invoke('report-error', error),
  
  // Theme and preferences
  getPreferences: () => ipcRenderer.invoke('get-preferences'),
  setPreferences: (preferences) => ipcRenderer.invoke('set-preferences', preferences),
  
  // Auto-update (for future implementation)
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // Hardware detection
  detectPrinters: () => ipcRenderer.invoke('detect-printers'),
  detectScanners: () => ipcRenderer.invoke('detect-scanners'),
  
  // Data synchronization
  syncData: () => ipcRenderer.invoke('sync-data'),
  getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),
  
  // Security
  encryptData: (data) => ipcRenderer.invoke('encrypt-data', data),
  decryptData: (encryptedData) => ipcRenderer.invoke('decrypt-data', encryptedData),
  
  // Performance monitoring
  getPerformanceMetrics: () => ipcRenderer.invoke('get-performance-metrics'),
  
  // Logging
  log: (level, message, data) => ipcRenderer.invoke('log', level, message, data),
  
  // Backup and restore
  createBackup: () => ipcRenderer.invoke('create-backup'),
  restoreBackup: (backupPath) => ipcRenderer.invoke('restore-backup', backupPath),
  
  // License management (for future commercial versions)
  checkLicense: () => ipcRenderer.invoke('check-license'),
  activateLicense: (licenseKey) => ipcRenderer.invoke('activate-license', licenseKey)
});

// Handle IPC events from main process
contextBridge.exposeInMainWorld('electronEvents', {
  onNetworkChange: (callback) => ipcRenderer.on('network-change', callback),
  onPrinterConnected: (callback) => ipcRenderer.on('printer-connected', callback),
  onPrinterDisconnected: (callback) => ipcRenderer.on('printer-disconnected', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  onError: (callback) => ipcRenderer.on('error', callback),
  onSyncProgress: (callback) => ipcRenderer.on('sync-progress', callback),
  onSyncComplete: (callback) => ipcRenderer.on('sync-complete', callback),
  
  // Remove all listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Expose Node.js environment info
contextBridge.exposeInMainWorld('nodeEnv', {
  isElectron: true,
  isDevelopment: process.env.NODE_ENV === 'development',
  platform: process.platform,
  arch: process.arch,
  version: process.version
});

// Console override for better debugging in production
if (process.env.NODE_ENV === 'production') {
  const originalConsole = console;
  console = {
    ...originalConsole,
    log: (...args) => {
      originalConsole.log(...args);
      ipcRenderer.invoke('log', 'info', args.join(' '), args);
    },
    error: (...args) => {
      originalConsole.error(...args);
      ipcRenderer.invoke('log', 'error', args.join(' '), args);
    },
    warn: (...args) => {
      originalConsole.warn(...args);
      ipcRenderer.invoke('log', 'warn', args.join(' '), args);
    }
  };
}
