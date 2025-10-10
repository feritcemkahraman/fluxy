// Preload script for secure Electron communication
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // File operations
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  selectDirectory: (options) => ipcRenderer.invoke('select-directory', options),

  // Clipboard - async methods
  writeClipboard: async (text) => {
    try {
      return await ipcRenderer.invoke('write-clipboard', text);
    } catch (error) {
      console.error('Preload writeClipboard error:', error);
      return false;
    }
  },
  readClipboard: async () => {
    try {
      return await ipcRenderer.invoke('read-clipboard');
    } catch (error) {
      console.error('Preload readClipboard error:', error);
      return '';
    }
  },

  // Theme
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),

  // Notifications
  showNotification: (title, body, options) => ipcRenderer.invoke('show-notification', { title, body, ...options }),

  // Electron Store
  storeGet: (key) => ipcRenderer.invoke('electron-store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('electron-store-set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('electron-store-delete', key),
  storeGetData: () => ipcRenderer.invoke('electron-store-get-data'),

  // Screen capture for Discord-style screen sharing
  getDesktopSources: (options) => ipcRenderer.invoke('get-desktop-sources', options),

  // Cache management
  clearRuntimeCache: () => ipcRenderer.invoke('clear-runtime-cache'),
  clearServiceWorkers: () => ipcRenderer.invoke('clear-service-workers'),

  // Runtime URL management
  updateApiConfig: async (config) => {
    try {
      // Update localStorage
      Object.keys(config).forEach(key => {
        localStorage.setItem(`api_${key}`, config[key]);
      });

      // Clear runtime cache to force reload
      await ipcRenderer.invoke('clear-runtime-cache');

      return { success: true };
    } catch (error) {
      console.error('Preload updateApiConfig error:', error);
      return { success: false, error: error.message };
    }
  },

  // Force app restart
  forceRestart: () => ipcRenderer.send('restart-app'),
});

// Set global flags for Electron detection
window.isElectron = true;
window.__ELECTRON_ENV__ = {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron,
  nodeVersion: process.versions.node
};

// Override user agent to help with detection
Object.defineProperty(navigator, 'userAgent', {
  value: navigator.userAgent + ' Electron/' + process.versions.electron,
  writable: false
});