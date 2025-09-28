// Enhanced Preload Script with Security & Performance Optimizations
const { contextBridge, ipcRenderer } = require('electron');

// ============================================================================
// SECURITY CONFIGURATIONS
// ============================================================================

// Data validation utilities
const MAX_STRING_LENGTH = 100000;
const MAX_OBJECT_SIZE = 1024 * 1024; // 1MB

function validateData(data) {
  if (typeof data === 'string' && data.length > MAX_STRING_LENGTH) {
    throw new Error('String too long');
  }
  
  if (typeof data === 'object' && data !== null) {
    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_OBJECT_SIZE) {
      throw new Error('Object too large');
    }
  }
  
  return true;
}

// Secure wrapper for IPC calls
function createSecureIPCCall(channel) {
  return async (...args) => {
    try {
      // Validate all arguments
      args.forEach(validateData);
      
      // Make the IPC call
      return await ipcRenderer.invoke(channel, ...args);
    } catch (error) {
      console.error(`IPC Error on ${channel}:`, error.message);
      throw new Error('Invalid request');
    }
  };
}

// Rate limiting for IPC calls
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 1000; // 1 second
const MAX_CALLS_PER_WINDOW = 100;

function rateLimitedCall(channel, fn) {
  return (...args) => {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    if (!rateLimits.has(channel)) {
      rateLimits.set(channel, []);
    }
    
    const calls = rateLimits.get(channel);
    
    // Remove old calls
    while (calls.length > 0 && calls[0] < windowStart) {
      calls.shift();
    }
    
    // Check rate limit
    if (calls.length >= MAX_CALLS_PER_WINDOW) {
      throw new Error('Rate limit exceeded');
    }
    
    // Add current call
    calls.push(now);
    
    return fn(...args);
  };
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

let performanceMetrics = {
  ipcCalls: 0,
  errors: 0,
  lastCall: 0
};

function trackPerformance(channel) {
  performanceMetrics.ipcCalls++;
  performanceMetrics.lastCall = Date.now();
}

// ============================================================================
// SECURE API EXPOSURE
// ============================================================================

// Enhanced electronAPI with security and performance features
contextBridge.exposeInMainWorld('electronAPI', {
  // Environment detection
  isElectron: true,
  isDev: process.env.NODE_ENV === 'development',
  
  // Performance monitoring
  getPerformanceMetrics: rateLimitedCall('performance', createSecureIPCCall('get-performance-metrics')),
  
  // Window controls with rate limiting
  minimize: rateLimitedCall('window', () => {
    trackPerformance('minimize');
    return ipcRenderer.invoke('window-minimize');
  }),
  
  maximize: rateLimitedCall('window', () => {
    trackPerformance('maximize');
    return ipcRenderer.invoke('window-maximize');
  }),
  
  close: rateLimitedCall('window', () => {
    trackPerformance('close');
    return ipcRenderer.invoke('window-close');
  }),

  // App info
  getAppVersion: rateLimitedCall('app', createSecureIPCCall('get-app-version')),

  // Secure file operations
  selectFile: rateLimitedCall('file', (options = {}) => {
    // Validate options
    if (typeof options !== 'object') {
      throw new Error('Invalid options');
    }
    
    trackPerformance('selectFile');
    return createSecureIPCCall('select-file')(options);
  }),

  selectDirectory: rateLimitedCall('file', (options = {}) => {
    if (typeof options !== 'object') {
      throw new Error('Invalid options');
    }
    
    trackPerformance('selectDirectory');
    return createSecureIPCCall('select-directory')(options);
  }),

  // Secure clipboard operations
  writeClipboard: rateLimitedCall('clipboard', (text) => {
    if (typeof text !== 'string') {
      throw new Error('Text must be a string');
    }
    
    if (text.length > MAX_STRING_LENGTH) {
      throw new Error('Text too long');
    }
    
    trackPerformance('writeClipboard');
    ipcRenderer.send('write-clipboard', text);
  }),

  readClipboard: rateLimitedCall('clipboard', () => {
    trackPerformance('readClipboard');
    return createSecureIPCCall('read-clipboard')();
  }),

  // Theme operations
  setTheme: rateLimitedCall('theme', (theme) => {
    const validThemes = ['system', 'light', 'dark'];
    if (!validThemes.includes(theme)) {
      throw new Error('Invalid theme');
    }
    
    trackPerformance('setTheme');
    ipcRenderer.send('set-theme', theme);
  }),

  // Secure notifications
  showNotification: rateLimitedCall('notification', (title, body, options = {}) => {
    // Validate inputs
    if (typeof title !== 'string' || typeof body !== 'string') {
      throw new Error('Title and body must be strings');
    }
    
    if (title.length > 100 || body.length > 500) {
      throw new Error('Title or body too long');
    }
    
    trackPerformance('showNotification');
    return createSecureIPCCall('show-notification')({ title, body, ...options });
  }),

  // Secure Electron Store operations
  storeGet: rateLimitedCall('store', (key) => {
    if (typeof key !== 'string' || key.length > 100) {
      throw new Error('Invalid key');
    }
    
    trackPerformance('storeGet');
    return createSecureIPCCall('electron-store-get')(key);
  }),

  storeSet: rateLimitedCall('store', (key, value) => {
    if (typeof key !== 'string' || key.length > 100) {
      throw new Error('Invalid key');
    }
    
    validateData(value);
    
    trackPerformance('storeSet');
    return createSecureIPCCall('electron-store-set')(key, value);
  }),

  storeDelete: rateLimitedCall('store', (key) => {
    if (typeof key !== 'string' || key.length > 100) {
      throw new Error('Invalid key');
    }
    
    trackPerformance('storeDelete');
    return createSecureIPCCall('electron-store-delete')(key);
  }),

  storeGetData: rateLimitedCall('store', () => {
    trackPerformance('storeGetData');
    return createSecureIPCCall('electron-store-get-data')();
  }),

  // Event listeners with cleanup
  onThemeChanged: (callback) => {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    const wrappedCallback = (event, ...args) => {
      try {
        callback(...args);
      } catch (error) {
        console.error('Theme callback error:', error);
      }
    };
    
    ipcRenderer.on('theme-changed', wrappedCallback);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('theme-changed', wrappedCallback);
    };
  },

  onUpdateAvailable: (callback) => {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    const wrappedCallback = (event, ...args) => {
      try {
        callback(...args);
      } catch (error) {
        console.error('Update callback error:', error);
      }
    };
    
    ipcRenderer.on('update-available', wrappedCallback);
    
    return () => {
      ipcRenderer.removeListener('update-available', wrappedCallback);
    };
  },

  onUpdateDownloaded: (callback) => {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    const wrappedCallback = (event, ...args) => {
      try {
        callback(...args);
      } catch (error) {
        console.error('Update downloaded callback error:', error);
      }
    };
    
    ipcRenderer.on('update-downloaded', wrappedCallback);
    
    return () => {
      ipcRenderer.removeListener('update-downloaded', wrappedCallback);
    };
  },

  // Deep link handling
  onDeepLink: (callback) => {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    const wrappedCallback = (event, url) => {
      try {
        // Validate URL
        if (typeof url === 'string' && url.startsWith('fluxy://')) {
          callback(url);
        }
      } catch (error) {
        console.error('Deep link callback error:', error);
      }
    };
    
    ipcRenderer.on('deep-link', wrappedCallback);
    
    return () => {
      ipcRenderer.removeListener('deep-link', wrappedCallback);
    };
  },

  // Utility functions
  utils: {
    // Safe JSON parsing
    safeJSONParse: (str, fallback = null) => {
      try {
        if (typeof str !== 'string' || str.length > MAX_STRING_LENGTH) {
          return fallback;
        }
        return JSON.parse(str);
      } catch {
        return fallback;
      }
    },

    // Safe JSON stringifying
    safeJSONStringify: (obj, fallback = '{}') => {
      try {
        const result = JSON.stringify(obj);
        if (result.length > MAX_OBJECT_SIZE) {
          return fallback;
        }
        return result;
      } catch {
        return fallback;
      }
    },

    // Debounce function for performance
    debounce: (func, wait) => {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // Throttle function for performance
    throttle: (func, limit) => {
      let inThrottle;
      return function executedFunction(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    }
  }
});

// ============================================================================
// GLOBAL SECURITY ENHANCEMENTS
// ============================================================================

// Set global flag for Electron detection
window.isElectron = true;

// Enhanced CSP injection
document.addEventListener('DOMContentLoaded', () => {
  const cspMeta = document.createElement('meta');
  cspMeta.httpEquiv = 'Content-Security-Policy';
  cspMeta.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' ws: wss: http: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "media-src 'self' blob: data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  document.head.appendChild(cspMeta);
});

// Performance monitoring
window.addEventListener('load', () => {
  // Monitor performance
  if (window.performance && window.performance.mark) {
    window.performance.mark('electron-preload-complete');
  }
});

// Memory leak prevention
window.addEventListener('beforeunload', () => {
  // Clear rate limits
  rateLimits.clear();
  
  // Reset performance metrics
  performanceMetrics = {
    ipcCalls: 0,
    errors: 0,
    lastCall: 0
  };
});

// Error tracking
window.addEventListener('error', (event) => {
  performanceMetrics.errors++;
  console.error('Renderer error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  performanceMetrics.errors++;
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('🔒 Secure Electron preload script loaded successfully');
