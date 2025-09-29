// Electron API utilities using contextBridge for security
class ElectronAPI {
  constructor() {
    // Check if running in Electron with contextBridge
    this.isElectronEnv = typeof window !== 'undefined' && window.electronAPI;
    this.api = this.isElectronEnv ? window.electronAPI : null;
  }

  // Check if running in Electron
  isElectron() {
    return this.isElectronEnv;
  }

  // Window controls
  minimizeWindow() {
    if (this.api) {
      this.api.minimize();
    }
  }

  maximizeWindow() {
    if (this.api) {
      this.api.maximize();
    }
  }

  closeWindow() {
    if (this.api) {
      this.api.close();
    }
  }

  // App info
  async getAppVersion() {
    if (this.api) {
      return await this.api.getAppVersion();
    }
    return process.env.REACT_APP_VERSION || '1.0.0';
  }

  // File operations
  async selectFile(options = {}) {
    if (this.api) {
      return await this.api.selectFile(options);
    }
    return null;
  }

  async selectDirectory(options = {}) {
    if (this.api) {
      return await this.api.selectDirectory(options);
    }
    return null;
  }

  // Screen capture for Electron
  async getDesktopSources(options = {}) {
    if (this.api) {
      return await this.api.getDesktopSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 150, height: 150 },
        fetchWindowIcons: true,
        ...options
      });
    }
    return [];
  }

  // Clipboard
  writeClipboard(text) {
    if (this.api) {
      this.api.writeClipboard(text);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }

  async readClipboard() {
    if (this.api) {
      return await this.api.readClipboard();
    } else if (navigator.clipboard) {
      return await navigator.clipboard.readText();
    }
    return '';
  }

  // Theme
  setTheme(theme) {
    if (this.api) {
      this.api.setTheme(theme);
    }
  }

  // Notifications
  showNotification(title, body, options = {}) {
    if (this.api) {
      this.api.showNotification(title, body, options);
    } else if ('Notification' in window) {
      // Fallback to browser notifications
      new Notification(title, { body, ...options });
    }
  }

  // Request notification permission
  async requestNotificationPermission() {
    if (this.api) {
      // Electron apps have notification permission by default
      return 'granted';
    } else if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  }

  // Electron Store methods
  async storeGet(key) {
    if (this.api) {
      return await this.api.storeGet(key);
    }
    return null;
  }

  async storeSet(key, value) {
    if (this.api) {
      return await this.api.storeSet(key, value);
    }
  }

  async storeDelete(key) {
    if (this.api) {
      return await this.api.storeDelete(key);
    }
  }

  async storeGetData() {
    if (this.api) {
      return await this.api.storeGetData();
    }
    return {};
  }

  // System tray (commented out for now)
  /*
  setTrayIcon(iconPath) {
    if (this.api) {
      this.api.setTrayIcon(iconPath);
    }
  }
  */

  // Auto updater (placeholder for future)
  checkForUpdates() {
    // Placeholder - implement when needed
    console.log('Update check requested');
  }

  onUpdateAvailable(callback) {
    // Placeholder - implement when needed
  }

  onUpdateDownloaded(callback) {
    // Placeholder - implement when needed
  }

  // Deep links (placeholder for future)
  onDeepLink(callback) {
    // Placeholder - implement when needed
  }

  // Theme changed listener (placeholder)
  onThemeChanged(callback) {
    // Placeholder - implement when needed
  }

  // App state listeners (placeholder)
  onAppFocus(callback) {
    // Placeholder - implement when needed
  }

  onAppBlur(callback) {
    // Placeholder - implement when needed
  }

  // Cleanup
  removeAllListeners() {
    // Placeholder - implement when needed
  }
}

// Export singleton instance
export default new ElectronAPI();
