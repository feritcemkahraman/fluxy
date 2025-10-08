const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, Notification, Menu, Tray, desktopCapturer } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');

// PRODUCTION: Optimized memory settings
app.commandLine.appendSwitch('--max-old-space-size', '4096');
app.commandLine.appendSwitch('--js-flags', '--max-old-space-size=4096 --stack-size=2048');

// PRODUCTION: Minimal GPU optimization (removed unsafe flags)
app.commandLine.appendSwitch('--enable-gpu-rasterization');
app.commandLine.appendSwitch('--enable-zero-copy');
app.commandLine.appendSwitch('--enable-hardware-overlays');
app.commandLine.appendSwitch('--enable-accelerated-video-decode');

// PRODUCTION: High refresh rate display support
app.commandLine.appendSwitch('--disable-frame-rate-limit');

// PRODUCTION: Enhanced process crash protection
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
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
let mainWindow;
let tray = null;
let isAppJustStarted = true; // Uygulama yeni mi başladı?
let isManualUpdateCheck = false; // Manuel güncelleme kontrolü mü?

function createWindow() {
  // Ana pencere oluştur - Production güvenli ayarlar
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'Fluxy',
    frame: false, // Remove native title bar
    icon: path.join(process.resourcesPath, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false, // Security: ALWAYS false
      contextIsolation: true, // Security: ALWAYS true
      enableRemoteModule: false, // Security: ALWAYS false
      webSecurity: true, // Security: ALWAYS true in production
      allowRunningInsecureContent: false, // Security: ALWAYS false
      preload: path.join(__dirname, 'preload.js'),
      experimentalFeatures: false,
      backgroundThrottling: false,
      sandbox: true, // Security: Enable sandbox in production
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      disableBlinkFeatures: 'Auxclick'
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    backgroundColor: '#030712',
    vibrancy: process.platform === 'darwin' ? 'dark' : null,
    paintWhenInitiallyHidden: false,
    thickFrame: false
  });

  // Production: Load from build folder
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, 'build/index.html')}`;

  console.log('Loading URL:', startUrl);
  console.log('isDev:', isDev);
  
  // PRODUCTION: Set strict CSP headers
  if (!isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' http://localhost:5000 wss://localhost:5000 ws://localhost:5000 https:",
            "media-src 'self' blob:",
            "worker-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'"
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
    
    // 5 saniye sonra "yeni başlatma" modundan çık
    setTimeout(() => {
      isAppJustStarted = false;
      console.log('App is now considered running (not just started)');
    }, 5000);
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
          body: 'Uygulama sistem tepsisinde çalışmaya devam ediyor.'
        }).show();
        mainWindow.hasBeenMinimized = true;
      }
    }
  });

  // Pencere kapatıldığında
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (tray) {
      tray.destroy();
      tray = null;
    }
  });

  // External linkler için
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Media permissions (microphone, camera, screen sharing)
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'microphone', 'camera', 'audioCapture', 'videoCapture', 'desktopCapture'];
    
    if (allowedPermissions.includes(permission)) {
      console.log(`✅ Granting permission: ${permission}`);
      callback(true);
    } else {
      console.log(`❌ Denying permission: ${permission}`);
      callback(false);
    }
  });

  // Handle permission checks
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    const allowedPermissions = ['media', 'microphone', 'camera', 'audioCapture', 'videoCapture', 'desktopCapture'];
    return allowedPermissions.includes(permission);
  });

  // Create system tray
  createTray();
}

function createTray() {
  // Dev ve production için icon yolu
  const iconPath = isDev 
    ? path.join(__dirname, 'public/icon.ico')
    : path.join(process.resourcesPath, 'icon.ico');
  
  console.log('Tray icon path:', iconPath);
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Fluxy',
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: 'Uygulamayı Göster',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Güncellemeleri Denetle',
      click: () => {
        if (!isDev) {
          // Send event to frontend to show update check modal
          if (mainWindow) {
            mainWindow.webContents.send('show-update-check-modal');
          }
        } else {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Geliştirme Modu',
            message: 'Geliştirme modunda güncelleme kontrolü yapılamaz.',
            buttons: ['Tamam']
          });
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Çıkış',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Fluxy - Sesli Sohbet Platformu');
  tray.setContextMenu(contextMenu);
  
  // Tray icon'a tıklandığında pencereyi göster
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

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

// Screen capture for Discord-style screen sharing
ipcMain.handle('get-desktop-sources', async (event, options = {}) => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 300, height: 200 },
      fetchWindowIcons: true,
      ...options
    });
    
    // Convert thumbnails to data URLs for frontend
    const sourcesWithDataUrls = sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : null,
      display_id: source.display_id,
      appIcon: source.appIcon ? source.appIcon.toDataURL() : null
    }));
    
    console.log(`🖥️ Found ${sourcesWithDataUrls.length} desktop sources`);
    return sourcesWithDataUrls;
  } catch (error) {
    console.error('❌ Failed to get desktop sources:', error);
    throw error;
  }
});

// Theme change listener
let themeChangeTimeout;
nativeTheme.on('updated', () => {
  if (themeChangeTimeout) clearTimeout(themeChangeTimeout);
  themeChangeTimeout = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors);
    }
  }, 100);
});

// Güvenli uygulama başlatma
app.whenReady().then(() => {
  try {
    createWindow();
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
  app.isQuitting = true;
});

// PRODUCTION: Strict navigation control
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
  
  // Prevent navigation to external URLs
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Only allow localhost in dev, file:// in production
    if (isDev) {
      if (parsedUrl.origin !== 'http://localhost:3000') {
        event.preventDefault();
      }
    } else {
      if (parsedUrl.protocol !== 'file:') {
        event.preventDefault();
      }
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

// PRODUCTION: Single instance lock (ENABLED)
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
  // Discord-like auto update: Silent background updates
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // Auto-install on quit (Discord-like)
  
  // Check for updates silently on startup (no notification if no update)
  // Only show notification if update is actually available
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000); // Wait 3 seconds after app start
  
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info.version);

    // Send event to frontend for manual checks
    if (mainWindow && isManualUpdateCheck) {
      mainWindow.webContents.send('update-not-available');
      isManualUpdateCheck = false; // Reset flag
    }
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);

      // For manual checks, notify that download started
      if (isManualUpdateCheck) {
        mainWindow.webContents.send('update-download-started');
        isManualUpdateCheck = false; // Reset flag
      }
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded');
    }
  });
  
  ipcMain.on('check-for-updates', () => {
    autoUpdater.checkForUpdates();
  });

  ipcMain.on('manual-check-for-updates', () => {
    isManualUpdateCheck = true;
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('Manual update check error:', error);
      if (mainWindow) {
        mainWindow.webContents.send('update-check-error');
      }
      isManualUpdateCheck = false;
    });
  });

  ipcMain.on('restart-app', () => {
    autoUpdater.quitAndInstall();
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
      { label: 'Tam Ekran', accelerator: 'F11', role: 'togglefullscreen' }
    ]
  }
];

// Discord-like: No menu bar
Menu.setApplicationMenu(null);
