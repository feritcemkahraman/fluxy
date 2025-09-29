// Preload script for secure Electron communication
const { contextBridge, ipcRenderer } = require('electron');

// Set Content Security Policy for security
document.addEventListener('DOMContentLoaded', () => {
  const cspMeta = document.createElement('meta');
  cspMeta.httpEquiv = 'Content-Security-Policy';
  cspMeta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https: blob:; connect-src 'self' ws: wss: http: https: http://localhost:5000 ws://localhost:5000 http://127.0.0.1:5000 ws://127.0.0.1:5000; font-src 'self' data:; media-src 'self' blob: data:; object-src 'none'; base-uri 'self'; form-action 'self';";
  document.head.appendChild(cspMeta);
});

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

  // Clipboard
  writeClipboard: (text) => ipcRenderer.invoke('write-clipboard', text),
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),

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

  // Check if running in Electron
  isElectron: true
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