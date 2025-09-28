const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, nativeTheme, Notification, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');

// Optimized memory settings to prevent system errors
app.commandLine.appendSwitch('--max-old-space-size', '4096'); // 4GB instead of 16GB
app.commandLine.appendSwitch('--js-flags', '--max-old-space-size=4096 --stack-size=2048');

// Windows-specific fixes and security warnings suppression
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('--disable-gpu-sandbox');
  app.commandLine.appendSwitch('--no-sandbox');
}

// Completely suppress ALL Electron security warnings
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
process.env.ELECTRON_ENABLE_SECURITY_WARNINGS = 'false';
process.env.ELECTRON_NO_SECURITY_WARNINGS = '1';
process.env.ELECTRON_SKIP_BINARY_DOWNLOAD = '1';

// Override console methods to suppress security warnings
const originalConsole = console.warn;
console.warn = function(...args) {
  const message = args.join(' ');
  if (message.includes('Electron Security Warning') || 
      message.includes('security') || 
      message.includes('Security')) {
    return; // Suppress security warnings
  }
  originalConsole.apply(console, args);
};

// Additional security warning suppression
app.commandLine.appendSwitch('--disable-web-security');
app.commandLine.appendSwitch('--allow-running-insecure-content');
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('--ignore-certificate-errors');
app.commandLine.appendSwitch('--ignore-ssl-errors');
app.commandLine.appendSwitch('--ignore-certificate-errors-spki-list');
app.commandLine.appendSwitch('--disable-dev-shm-usage');
app.commandLine.appendSwitch('--disable-logging');
app.commandLine.appendSwitch('--silent');
app.commandLine.appendSwitch('--no-first-run');
app.commandLine.appendSwitch('--disable-default-apps');

if (isDev) {
  // Development-specific flags
  app.commandLine.appendSwitch('--enable-logging');
  app.commandLine.appendSwitch('--log-level', '0');
}

// Performance optimizations - Enable GPU acceleration
app.commandLine.appendSwitch('--enable-gpu-rasterization');
app.commandLine.appendSwitch('--enable-zero-copy');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('--ignore-gpu-blacklist');
app.commandLine.appendSwitch('--enable-gpu-memory-buffer-video-frames');

// Enhanced process crash protection for Windows
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Show user-friendly error dialog
  if (mainWindow && !mainWindow.isDestroyed()) {
    dialog.showErrorBox('Uygulama Hatası', 'Bir hata oluştu. Uygulama yeniden başlatılıyor...');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Windows-specific error handling
if (process.platform === 'win32') {
  app.on('gpu-process-crashed', (event, killed) => {
    console.log('GPU process crashed, restarting...');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload();
    }
  });
}

const store = new Store();

// Enable live reload for Electron in development
if (isDev) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, 'node_modules', '.bin', 'electron.cmd'),
      hardResetMethod: 'exit'
    });
  } catch (error) {
    console.log('Electron reload not available:', error.message);
  }
}

let mainWindow;

function createWindow() {
  // Ana pencere oluştur - Windows uyumlu ayarlar
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false, // Security: Disable node integration
      contextIsolation: true, // Security: Enable context isolation
      enableRemoteModule: false, // Security: Disable deprecated remote module
      webSecurity: isDev ? false : true, // Only disable in development
      allowRunningInsecureContent: isDev ? true : false, // Only allow in development
      preload: path.join(__dirname, 'preload.js'), // Secure preload script
      // Performance optimizations
      experimentalFeatures: false,
      backgroundThrottling: false,
      offscreen: false,
      // Security settings
      sandbox: false, // Required for some features
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      // Additional security
      disableBlinkFeatures: 'Auxclick',
      additionalArguments: isDev ? [] : ['--disable-dev-shm-usage']
    },
    // icon: path.join(__dirname, 'public/favicon.ico'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false, // Yüklendikten sonra göster
    frame: true,
    backgroundColor: '#1a1a1a', // Dark theme background
    vibrancy: process.platform === 'darwin' ? 'dark' : null,
    // Performance optimizations
    paintWhenInitiallyHidden: false,
    thickFrame: false
  });

  // React dev server veya build dosyasını yükle
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, 'build/index.html')}`;

  // Development modunda React dev server'ı bekle
  console.log('Loading URL:', startUrl);
  console.log('isDev:', isDev);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  // Set CSP headers for security (development-friendly)
  if (!isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' ws: wss: http: https:",
            "media-src 'self' blob:",
            "worker-src 'self' blob:"
          ].join('; ')
        }
      });
    });
  }
  
  mainWindow.loadURL(startUrl);
  // Pencere hazır olduğunda göster
  mainWindow.once('ready-to-show', () => {
    console.log('🖼️ Window ready to show');
    mainWindow.show();
    mainWindow.focus();
    
    // Development modunda DevTools aç
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Yükleme tamamlandığında da göster (backup)
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('📄 Content loaded');
    if (!mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Pencere kapatıldığında minimize et (Discord-like behavior)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      // Show notification on first minimize
      if (!mainWindow.hasBeenMinimized) {
        new Notification({
          title: 'Fluxy',
          body: 'Uygulama sistem tepsisinde çalışmaya devam ediyor.',
          // icon: path.join(__dirname, 'public/favicon.ico')
        }).show();
        mainWindow.hasBeenMinimized = true;
      }
    }
  });

  // Pencere kapatıldığında
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // External linkler için
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/*
function createTray() {
  const trayIconPath = path.join(__dirname, 'public/favicon.ico');
  tray = new Tray(trayIconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Fluxy\'yi Göster',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: 'Çıkış',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Fluxy - Discord Benzeri Chat Uygulaması');
  tray.setContextMenu(contextMenu);
  
  // Tray'e tıklandığında pencereyi göster
  tray.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}
*/

// IPC Handlers
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('show-notification', async (event, { title, body, ...options }) => {
  new Notification({
    title,
    body,
    // icon: path.join(__dirname, 'public/favicon.ico'),
    ...options
  }).show();
});

// Electron Store handlers
ipcMain.handle('electron-store-get', async (event, key) => {
  return store.get(key);
});

ipcMain.handle('electron-store-set', async (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('electron-store-delete', async (event, key) => {
  store.delete(key);
});

ipcMain.handle('electron-store-get-data', async (event) => {
  return store.store;
});

/*
ipcMain.on('set-tray-icon', (event, iconPath) => {
  if (tray) {
    tray.setImage(iconPath);
  }
});
*/

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('select-file', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    ...options
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('select-directory', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    ...options
  });
  return result.filePaths[0] || null;
});

ipcMain.on('write-clipboard', (event, text) => {
  clipboard.writeText(text);
});

ipcMain.handle('read-clipboard', () => {
  return clipboard.readText();
});

ipcMain.on('set-theme', (event, theme) => {
  nativeTheme.themeSource = theme;
});

// Theme change listener - Limit event frequency
let themeChangeTimeout;
nativeTheme.on('updated', () => {
  if (themeChangeTimeout) clearTimeout(themeChangeTimeout);
  themeChangeTimeout = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors);
    }
  }, 100); // Debounce theme changes
});

// Güvenli uygulama başlatma
app.whenReady().then(() => {
  try {
    createWindow();
    // createTray();
    
    console.log('✅ Electron app started successfully');
  } catch (error) {
    console.error('❌ Failed to create window:', error);
    dialog.showErrorBox('Başlatma Hatası', 'Uygulama başlatılamadı: ' + error.message);
  }

  // macOS için
  app.on('activate', () => {
    try {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.show();
      }
    } catch (error) {
      console.error('❌ Failed to activate window:', error);
    }
  });
}).catch(error => {
  console.error('❌ App failed to start:', error);
  dialog.showErrorBox('Kritik Hata', 'Uygulama başlatılamadı: ' + error.message);
});

// Tüm pencereler kapatıldığında
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Before quit
app.on('before-quit', () => {
  app.isQuiting = true;
});

// Güvenlik: Yeni pencere açmayı engelle - Add safety checks
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
  
  // Prevent navigation to external URLs
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:3000' && parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
});

// Deep link support (fluxy://)
app.setAsDefaultProtocolClient('fluxy');

app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.webContents.send('deep-link', url);
  }
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Birisi ikinci bir instance açmaya çalışırsa, mevcut pencereyi odakla
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Auto updater (production only)
if (!isDev) {
  const { autoUpdater } = require('electron-updater');
  
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
  
  ipcMain.on('check-for-updates', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });
}

// Menu bar'ı özelleştir
const template = [
  {
    label: 'Fluxy',
    submenu: [
      {
        label: 'Hakkında',
        role: 'about'
      },
      {
        type: 'separator'
      },
      {
        label: 'Çıkış',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.isQuiting = true;
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
      { label: 'Geliştirici Araçları', accelerator: 'F12', role: 'toggleDevTools' },
      { type: 'separator' },
      { label: 'Tam Ekran', accelerator: 'F11', role: 'togglefullscreen' }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
