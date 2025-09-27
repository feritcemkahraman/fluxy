const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, nativeTheme, Notification, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');

// Increase memory limit and stack size to prevent overflow
app.commandLine.appendSwitch('--max-old-space-size', '16384'); // 16GB
app.commandLine.appendSwitch('--js-flags', '--max-old-space-size=16384 --stack-size=4096 --max-stack-size=4096');

// Radical Electron performance fixes - Remove ALL throttling
app.commandLine.appendSwitch('--enable-gpu-rasterization');
app.commandLine.appendSwitch('--enable-zero-copy');
app.commandLine.appendSwitch('--ignore-gpu-blacklist');
app.commandLine.appendSwitch('--ignore-gpu-sandbox-failures');
app.commandLine.appendSwitch('--enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('--enable-gpu-memory-buffer-video-frames');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-features', 'TranslateUI,VizDisplayCompositor');
app.commandLine.appendSwitch('--disable-ipc-flooding-protection');
app.commandLine.appendSwitch('--enable-features', 'VaapiVideoDecoder,CanvasOopRasterization,UseSkiaRenderer');
app.commandLine.appendSwitch('--force-gpu-mem-available-mb', '8192');
app.commandLine.appendSwitch('--max-gum-fps', '120');
app.commandLine.appendSwitch('--disable-frame-rate-limit');
app.commandLine.appendSwitch('--disable-gpu-vsync');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('--enable-accelerated-video-decode');
app.commandLine.appendSwitch('--disable-dev-shm-usage');
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-web-security');
app.commandLine.appendSwitch('--disable-site-isolation-trials');

// Process crash protection
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit, just log
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, just log
});

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
  // Ana pencere oluştur - MAXIMUM PERFORMANCE
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false, // Disabled for performance
      allowRunningInsecureContent: true, // Allow for performance
      preload: path.join(__dirname, 'preload.js'),
      // RADICAL Performance optimizations
      experimentalFeatures: true,
      enableBlinkFeatures: 'CSSColorSchemeUARendering,CanvasOopRasterization,UseSkiaRenderer,AcceleratedSmallCanvases',
      disableBlinkFeatures: 'Auxclick,TranslateUI,VizDisplayCompositor',
      backgroundThrottling: false,
      offscreen: false,
      // Hardware acceleration - FORCE EVERYTHING
      hardwareAcceleration: true,
      // V8 optimizations - MAX PERFORMANCE
      v8CacheOptions: 'code',
      // Disable ALL unnecessary features
      plugins: false,
      java: false,
      webgl: true,
      // Additional performance flags
      spellcheck: false,
      enableWebSQL: false,
      // Force GPU acceleration
      acceleratedCompositing: true,
      // Disable security features for performance
      sandbox: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false
    },
    // Window optimizations
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    frame: true,
    backgroundColor: '#1a1a1a',
    vibrancy: null, // Disable for performance
    // RADICAL Performance optimizations
    paintWhenInitiallyHidden: false,
    thickFrame: false,
    skipTaskbar: false,
    // Force compositing
    transparent: false,
    opacity: 1.0
  });

  // React dev server veya build dosyasını yükle
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, './build/index.html')}`;

  // Production modunda React dev server bekleme
  console.log('Loading URL:', startUrl);
  console.log('isDev:', isDev);
  console.log('__dirname:', __dirname);
  
  // Load URL immediately without CSP for maximum performance
  mainWindow.loadURL(startUrl);
  // Pencere hazır olduğunda göster
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Development modunda DevTools aç - Her zaman aç
    mainWindow.webContents.openDevTools();
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

// Uygulama hazır olduğunda
app.whenReady().then(() => {
  createWindow();
  // createTray();

  // macOS için
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
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
