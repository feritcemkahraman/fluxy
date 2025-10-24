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
  restartApp: () => ipcRenderer.send('restart-app'),

  // Auto-update events
  on: (channel, callback) => {
    const validChannels = [
      'update-available',
      'update-not-available',
      'update-progress',
      'update-downloaded',
      'update-download-started',
      'update-check-error',
      'show-update-progress',
      'show-update-check-modal',
      'theme-changed',
      'deep-link',
      'window-focused'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  off: (channel, callback) => {
    const validChannels = [
      'update-available',
      'update-not-available',
      'update-progress',
      'update-downloaded',
      'update-download-started',
      'update-check-error',
      'show-update-progress',
      'show-update-check-modal',
      'theme-changed',
      'deep-link',
      'window-focused'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },

  // Sound files access
  getSoundPath: (filename) => {
    const path = require('path');
    const fs = require('fs');

    // Try multiple possible paths
    const possiblePaths = [
      path.join(process.resourcesPath, 'app.asar.unpacked', 'sounds', filename),
      path.join(process.resourcesPath, 'sounds', filename),
      path.join(__dirname, 'build', 'sounds', filename),
      path.join(__dirname, 'public', 'sounds', filename)
    ];

    for (const soundPath of possiblePaths) {
      if (fs.existsSync(soundPath)) {
        // Convert to file:// URL for Electron
        return `file://${soundPath.replace(/\\/g, '/')}`;
      }
    }

    console.warn(`Sound file not found: ${filename}`);
    return null;
  },

  // Manual update check
  manualCheckForUpdates: () => ipcRenderer.send('manual-check-for-updates'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),

  // Discord-like badge count (unread messages)
  setBadgeCount: (count) => ipcRenderer.send('set-badge-count', count),
  incrementBadgeCount: (increment) => ipcRenderer.send('increment-badge-count', increment),
  decrementBadgeCount: (decrement) => ipcRenderer.send('decrement-badge-count', decrement),
  clearBadgeCount: () => ipcRenderer.send('clear-badge-count'),
  getBadgeCount: () => ipcRenderer.invoke('get-badge-count'),
});

// Override user agent to help with detection
Object.defineProperty(navigator, 'userAgent', {
  value: navigator.userAgent + ' Electron/' + process.versions.electron,
  writable: false
});