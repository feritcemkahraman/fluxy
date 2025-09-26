const { app, BrowserWindow, Menu, ipcMain, Notification, /* Tray, */ dialog, clipboard, nativeTheme, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Store = require('electron-store');

let mainWindow;
// let tray = null;

// Initialize electron store
const store = new Store();

// Enable live reload for Electron in development
if (isDev) {
  // require('electron-reload')(__dirname, {
  //   electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
  //   hardResetMethod: 'exit'
  // });
}

function createWindow() {
  // Ana pencere oluştur
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false, // Güvenlik için devre dışı
      contextIsolation: true, // Güvenlik için etkin
      enableRemoteModule: false, // Deprecated, kullanılmamalı
      webSecurity: false, // Geçici olarak devre dışı bırak
      allowRunningInsecureContent: true, // Geçici olarak etkin
      preload: path.join(__dirname, 'preload.js') // Preload script ekle
    },
    // icon: path.join(__dirname, 'public/favicon.ico'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false, // Yüklendikten sonra göster
    frame: true,
    backgroundColor: '#1a1a1a', // Dark theme background
    vibrancy: process.platform === 'darwin' ? 'dark' : null
  });

  // React dev server veya build dosyasını yükle
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Pencere hazır olduğunda göster
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Development modunda DevTools aç (şimdilik her zaman aç)
    mainWindow.webContents.openDevTools();
  });

  // Pencere kapatıldığında minimize et (Discord-like behavior)
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
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

  // Focus/blur events
  mainWindow.on('focus', () => {
    mainWindow.webContents.send('app-focus');
  });

  mainWindow.on('blur', () => {
    mainWindow.webContents.send('app-blur');
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

// Theme change listener
nativeTheme.on('updated', () => {
  if (mainWindow) {
    mainWindow.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors);
  }
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

// Güvenlik: Yeni pencere açmayı engelle
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
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
