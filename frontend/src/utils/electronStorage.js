// Electron-compatible storage utility
const isElectron = () => {
  return typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
};

class ElectronStorage {
  constructor() {
    this.isElectronEnv = isElectron();
    
    if (this.isElectronEnv) {
      // In Electron, we can use both localStorage and electron-store for persistence
      try {
        this.electronStore = window.require('electron-store');
        this.store = new this.electronStore();
      } catch (error) {
        console.warn('electron-store not available, falling back to localStorage');
        this.store = null;
      }
    }
  }

  setItem(key, value) {
    try {
      // Always use localStorage as primary storage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      
      // Additionally use electron-store for persistence across app restarts
      if (this.store) {
        this.store.set(key, value);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  }

  getItem(key) {
    try {
      // Try localStorage first
      if (typeof window !== 'undefined' && window.localStorage) {
        const value = window.localStorage.getItem(key);
        if (value !== null) {
          return value;
        }
      }
      
      // Fallback to electron-store
      if (this.store) {
        return this.store.get(key, null);
      }
      
      return null;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  removeItem(key) {
    try {
      // Remove from localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      
      // Remove from electron-store
      if (this.store) {
        this.store.delete(key);
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
