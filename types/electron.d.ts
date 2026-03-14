// Type declarations for Electron API
export interface ElectronAPI {
  platform: string;
  getVersion: () => string;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  saveFile: (data: any, filename: string) => Promise<void>;
  openFile: () => Promise<string>;
  printReceipt: (options: { printerName: string; content: string; options?: any }) => Promise<boolean>;
  getPrinters: () => Promise<Array<{ name: string; isDefault: boolean; [key: string]: any }>>;
  detectPrinters: () => Promise<Array<{ name: string; isDefault: boolean; [key: string]: any }>>;
  getNetworkStatus: () => Promise<boolean>;
  quitApp: () => Promise<void>;
  restartApp: () => Promise<void>;
  openDevTools: () => Promise<void>;
  clearCache: () => Promise<void>;
  reportError: (error: any) => Promise<void>;
  getPreferences: () => Promise<any>;
  setPreferences: (preferences: any) => Promise<void>;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  encryptData: (data: any) => Promise<string>;
  decryptData: (encryptedData: string) => Promise<any>;
  getPerformanceMetrics: () => Promise<any>;
  log: (level: string, message: string, data?: any) => Promise<void>;
  createBackup: () => Promise<string>;
  restoreBackup: (backupPath: string) => Promise<void>;
  checkLicense: () => Promise<any>;
  activateLicense: (licenseKey: string) => Promise<boolean>;
}

export interface ElectronEvents {
  onNetworkChange: (callback: (status: boolean) => void) => void;
  onPrinterConnected: (callback: (printer: any) => void) => void;
  onPrinterDisconnected: (callback: (printer: any) => void) => void;
  onUpdateAvailable: (callback: (info: any) => void) => void;
  onUpdateDownloaded: (callback: (info: any) => void) => void;
  onError: (callback: (error: any) => void) => void;
  onSyncProgress: (callback: (progress: number) => void) => void;
  onSyncComplete: (callback: (result: any) => void) => void;
  removeAllListeners: (channel: string) => void;
}

export interface NodeEnv {
  isElectron: boolean;
  isDevelopment: boolean;
  platform: string;
  arch: string;
  version: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    electronEvents?: ElectronEvents;
    nodeEnv?: NodeEnv;
  }
}
