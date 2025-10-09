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

  // Auto-update
  restartApp: () => ipcRenderer.send('restart-app'),
  manualCheckForUpdates: () => ipcRenderer.send('manual-check-for-updates'),
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },

  // Check if running in Electron
  isElectron: () => true
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