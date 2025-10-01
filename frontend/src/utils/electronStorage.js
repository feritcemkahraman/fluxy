// Electron-compatible storage utility
const isElectron = () => {
  // Enhanced Electron detection
  const hasElectronAPI = !!(window.electronAPI && window.electronAPI.isElectron);
  const hasElectronFlag = !!window.isElectron;
  const hasElectronEnv = !!window.__ELECTRON_ENV__;
  const hasElectronUserAgent = navigator.userAgent.includes('Electron');
  const hasElectronProcess = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
  
  return hasElectronAPI || hasElectronFlag || hasElectronEnv || hasElectronUserAgent || hasElectronProcess;
};

class ElectronStorage {
  constructor() {
    this.isElectronEnv = isElectron();
    
    if (this.isElectronEnv) {
      // In Electron, use electronAPI for storage
      try {
        if (window.electronAPI && window.electronAPI.storeGet) {
          this.useElectronAPI = true;
        } else {
          this.useElectronAPI = false;
        }
      } catch (error) {
        console.warn('Electron storage initialization failed:', error);
        this.useElectronAPI = false;
      }
    }
  }

  async setItem(key, value) {
    try {
      // Always use localStorage as primary storage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      
      // Additionally use Electron API for persistence
      if (this.useElectronAPI && window.electronAPI) {
        await window.electronAPI.storeSet(key, value);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  }

  async getItem(key) {
    try {
      // Try localStorage first
      if (typeof window !== 'undefined' && window.localStorage) {
        const value = window.localStorage.getItem(key);
        if (value !== null) {
          return value;
        }
      }
      
      // Fallback to Electron API
      if (this.useElectronAPI && window.electronAPI) {
        return await window.electronAPI.storeGet(key);
      }
      
      return null;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  async removeItem(key) {
    try {
      // Remove from localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      
      // Remove from Electron API
      if (this.useElectronAPI && window.electronAPI) {
        await window.electronAPI.storeDelete(key);
      }
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  }

  clear() {
    try {
      // Clear localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      
      // Clear electron-store
      if (this.store) {
        this.store.clear();
      }
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }

  // Electron-specific methods
  getStorePath() {
    if (this.store) {
      return this.store.path;
    }
    return null;
  }

  // Check if running in Electron
  isElectron() {
    return this.isElectronEnv;
  }
}

// Export singleton instance
export default new ElectronStorage();
