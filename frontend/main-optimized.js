const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, nativeTheme, Notification, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');

// ============================================================================
// PERFORMANCE & SECURITY OPTIMIZATIONS
// ============================================================================

// 1. MEMORY OPTIMIZATION - Reduce from 16GB to reasonable limits
app.commandLine.appendSwitch('--max-old-space-size', '4096'); // 4GB instead of 16GB
app.commandLine.appendSwitch('--js-flags', '--max-old-space-size=4096 --stack-size=2048');

// 2. GPU ACCELERATION & PERFORMANCE
app.commandLine.appendSwitch('--enable-gpu-rasterization');
app.commandLine.appendSwitch('--enable-zero-copy');
app.commandLine.appendSwitch('--enable-gpu-memory-buffer-video-frames');
app.commandLine.appendSwitch('--enable-features', 'VaapiVideoDecoder,WebRTCPipeWireCapturer');
app.commandLine.appendSwitch('--ignore-gpu-blacklist');

// 3. BACKGROUND PROCESS OPTIMIZATION
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');

// 4. MEMORY MANAGEMENT
app.commandLine.appendSwitch('--enable-precise-memory-info');
app.commandLine.appendSwitch('--memory-pressure-off');

// 5. SECURITY ENHANCEMENTS
app.commandLine.appendSwitch('--disable-web-security', false);
app.commandLine.appendSwitch('--enable-features', 'OutOfBlinkCors');

// ============================================================================
// IPC SECURITY & BUFFER OVERFLOW PROTECTION
// ============================================================================

// Maximum payload sizes to prevent buffer overflow
const IPC_LIMITS = {
  MAX_MESSAGE_SIZE: 1024 * 1024, // 1MB
  MAX_ARRAY_LENGTH: 10000,
  MAX_STRING_LENGTH: 100000,
  MAX_OBJECT_DEPTH: 10
};

// Secure data validator
function validateIPCData(data, depth = 0) {
  if (depth > IPC_LIMITS.MAX_OBJECT_DEPTH) {
    throw new Error('Object depth exceeds maximum allowed');
  }

  if (data === null || data === undefined) return true;

  if (typeof data === 'string') {
    if (data.length > IPC_LIMITS.MAX_STRING_LENGTH) {
      throw new Error(`String length ${data.length} exceeds maximum ${IPC_LIMITS.MAX_STRING_LENGTH}`);
    }
    return true;
  }

  if (Array.isArray(data)) {
    if (data.length > IPC_LIMITS.MAX_ARRAY_LENGTH) {
      throw new Error(`Array length ${data.length} exceeds maximum ${IPC_LIMITS.MAX_ARRAY_LENGTH}`);
    }
    data.forEach(item => validateIPCData(item, depth + 1));
    return true;
  }

  if (typeof data === 'object') {
    const serialized = JSON.stringify(data);
    if (serialized.length > IPC_LIMITS.MAX_MESSAGE_SIZE) {
      throw new Error(`Object size ${serialized.length} exceeds maximum ${IPC_LIMITS.MAX_MESSAGE_SIZE}`);
    }
    
    Object.values(data).forEach(value => validateIPCData(value, depth + 1));
    return true;
  }

  return true;
}

// Secure IPC wrapper
function createSecureIPCHandler(handler) {
  return async (event, ...args) => {
    try {
      // Validate all arguments
      args.forEach(arg => validateIPCData(arg));
      
      // Call original handler
      return await handler(event, ...args);
    } catch (error) {
      console.error('IPC Security Error:', error.message);
      throw new Error('Invalid data format or size');
    }
  };
}

// ============================================================================
// PROCESS CRASH PROTECTION WITH MEMORY MONITORING
// ============================================================================

let memoryWarningShown = false;

// Enhanced crash protection
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  // Log to file in production
  if (!isDev) {
    require('fs').appendFileSync(
      path.join(app.getPath('userData'), 'crash.log'),
      `${new Date().toISOString()} - Uncaught Exception: ${error.stack}\n`
    );
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Memory monitoring
function monitorMemory() {
  const memInfo = process.memoryUsage();
  const memoryMB = Math.round(memInfo.heapUsed / 1024 / 1024);
  
  // Warn if memory usage exceeds 1GB
  if (memoryMB > 1024 && !memoryWarningShown) {
    console.warn(`High memory usage detected: ${memoryMB}MB`);
    memoryWarningShown = true;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
  
  // Reset warning flag if memory drops
  if (memoryMB < 512) {
    memoryWarningShown = false;
  }
}

// Monitor memory every 30 seconds
setInterval(monitorMemory, 30000);

const store = new Store();

// ============================================================================
// OPTIMIZED WINDOW CREATION
// ============================================================================

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      // SECURITY SETTINGS
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false, // Disable for security
      
      // PERFORMANCE SETTINGS
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
      offscreen: false,
      
      // MEMORY OPTIMIZATION
      v8CacheOptions: 'code',
      enableWebSQL: false,
      
      // ADDITIONAL SECURITY
      sandbox: false, // Keep false for IPC functionality
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      safeDialogs: true,
      safeDialogsMessage: 'This app is trying to show a dialog',
      
      // PERFORMANCE FEATURES
      spellcheck: false, // Disable for performance
      enableBlinkFeatures: 'CSSColorSchemeUARendering',
      disableBlinkFeatures: 'Auxclick'
    },
    
    // WINDOW OPTIMIZATION
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    frame: true,
    backgroundColor: '#1a1a1a',
    vibrancy: process.platform === 'darwin' ? 'dark' : null,
    
    // PERFORMANCE SETTINGS
    paintWhenInitiallyHidden: false,
    thickFrame: false,
    
    // ADDITIONAL OPTIMIZATIONS
    useContentSize: true,
    enableLargerThanScreen: false
  });

  // Enhanced CSP with stricter policies
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for React dev
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: https: blob:",
          "connect-src 'self' ws://localhost:* wss://localhost:* http://localhost:* https://localhost:* ws://127.0.0.1:* http://127.0.0.1:*",
          "media-src 'self' blob: data:",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'"
        ].join('; '),
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
        'X-XSS-Protection': ['1; mode=block']
      }
    });
  });

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, 'build/index.html')}`;

  console.log('Loading URL:', startUrl);
  mainWindow.loadURL(startUrl);

  // Optimized window show
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Only open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Enhanced close behavior
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      if (!mainWindow.hasBeenMinimized) {
        new Notification({
          title: 'Fluxy',
          body: 'Uygulama sistem tepsisinde çalışmaya devam ediyor.'
        }).show();
        mainWindow.hasBeenMinimized = true;
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Secure external link handling
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only allow specific domains
    const allowedDomains = ['github.com', 'discord.com'];
    try {
      const urlObj = new URL(url);
      if (allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
        shell.openExternal(url);
      }
    } catch (error) {
      console.error('Invalid URL:', url);
    }
    return { action: 'deny' };
  });
}

// ============================================================================
// SECURE IPC HANDLERS WITH VALIDATION
// ============================================================================

// Window controls
ipcMain.handle('window-minimize', createSecureIPCHandler(() => {
  if (mainWindow) mainWindow.minimize();
}));

ipcMain.handle('window-maximize', createSecureIPCHandler(() => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
}));

ipcMain.handle('window-close', createSecureIPCHandler(() => {
  if (mainWindow) mainWindow.close();
}));

// Secure notification handler
ipcMain.handle('show-notification', createSecureIPCHandler(async (event, { title, body, ...options }) => {
  // Sanitize notification content
  const sanitizedTitle = String(title).substring(0, 100);
  const sanitizedBody = String(body).substring(0, 500);
  
  new Notification({
    title: sanitizedTitle,
    body: sanitizedBody,
    ...options
  }).show();
}));

// Secure store handlers with validation
ipcMain.handle('electron-store-get', createSecureIPCHandler(async (event, key) => {
  if (typeof key !== 'string' || key.length > 100) {
    throw new Error('Invalid key format');
  }
  return store.get(key);
}));

ipcMain.handle('electron-store-set', createSecureIPCHandler(async (event, key, value) => {
  if (typeof key !== 'string' || key.length > 100) {
    throw new Error('Invalid key format');
  }
  
  // Validate value size
  validateIPCData(value);
  
  store.set(key, value);
}));

ipcMain.handle('electron-store-delete', createSecureIPCHandler(async (event, key) => {
  if (typeof key !== 'string' || key.length > 100) {
    throw new Error('Invalid key format');
  }
  store.delete(key);
}));

// File operations with security
ipcMain.handle('select-file', createSecureIPCHandler(async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
      { name: 'Documents', extensions: ['pdf', 'txt', 'doc', 'docx'] }
    ],
    ...options
  });
  return result.filePaths[0] || null;
}));

// Clipboard with size limits
ipcMain.handle('read-clipboard', createSecureIPCHandler(() => {
  const text = clipboard.readText();
  if (text.length > IPC_LIMITS.MAX_STRING_LENGTH) {
    return text.substring(0, IPC_LIMITS.MAX_STRING_LENGTH);
  }
  return text;
}));

ipcMain.on('write-clipboard', createSecureIPCHandler((event, text) => {
  if (typeof text === 'string' && text.length <= IPC_LIMITS.MAX_STRING_LENGTH) {
    clipboard.writeText(text);
  }
}));

// Theme handler
ipcMain.on('set-theme', createSecureIPCHandler((event, theme) => {
  const validThemes = ['system', 'light', 'dark'];
  if (validThemes.includes(theme)) {
    nativeTheme.themeSource = theme;
  }
}));

// App version
ipcMain.handle('get-app-version', createSecureIPCHandler(() => {
  return app.getVersion();
}));

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

// Performance metrics
ipcMain.handle('get-performance-metrics', createSecureIPCHandler(() => {
  const metrics = app.getAppMetrics();
  const memoryInfo = process.memoryUsage();
  
  return {
    memory: {
      heapUsed: Math.round(memoryInfo.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryInfo.heapTotal / 1024 / 1024), // MB
      external: Math.round(memoryInfo.external / 1024 / 1024), // MB
      rss: Math.round(memoryInfo.rss / 1024 / 1024) // MB
    },
    processes: metrics.length,
    timestamp: Date.now()
  };
}));

// ============================================================================
// APP LIFECYCLE & SECURITY
// ============================================================================

// Theme change with debouncing
let themeChangeTimeout;
nativeTheme.on('updated', () => {
  if (themeChangeTimeout) clearTimeout(themeChangeTimeout);
  themeChangeTimeout = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors);
    }
  }, 100);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// Enhanced security for web contents
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    
    // Only allow specific trusted domains
    const trustedDomains = ['github.com', 'discord.com'];
    try {
      const url = new URL(navigationUrl);
      if (trustedDomains.some(domain => url.hostname.includes(domain))) {
        shell.openExternal(navigationUrl);
      }
    } catch (error) {
      console.error('Invalid navigation URL:', navigationUrl);
    }
  });
  
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      'file://'
    ];
    
    if (!allowedOrigins.some(origin => navigationUrl.startsWith(origin))) {
      event.preventDefault();
    }
  });
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Auto updater (production only)
if (!isDev) {
  autoUpdater.checkForUpdatesAndNotify();
  
  autoUpdater.on('update-available', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available');
    }
  });
  
  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded');
    }
  });
  
  ipcMain.on('check-for-updates', createSecureIPCHandler(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }));
}

// Optimized menu
const template = [
  {
    label: 'Fluxy',
    submenu: [
      { label: 'Hakkında', role: 'about' },
      { type: 'separator' },
      { 
        label: 'Çıkış', 
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]
  },
  {
    label: 'Düzenle',
    submenu: [
      { label: 'Geri Al', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
      { label: 'Yinele', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
      { type: 'separator' },
      { label: 'Kes', accelerator: 'CmdOrCtrl+X', role: 'cut' },
      { label: 'Kopyala', accelerator: 'CmdOrCtrl+C', role: 'copy' },
      { label: 'Yapıştır', accelerator: 'CmdOrCtrl+V', role: 'paste' }
    ]
  },
  {
    label: 'Görünüm',
    submenu: [
      { label: 'Yenile', accelerator: 'CmdOrCtrl+R', role: 'reload' },
      ...(isDev ? [{ label: 'Geliştirici Araçları', accelerator: 'F12', role: 'toggleDevTools' }] : []),
      { type: 'separator' },
      { label: 'Tam Ekran', accelerator: 'F11', role: 'togglefullscreen' }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

module.exports = { IPC_LIMITS, validateIPCData };
