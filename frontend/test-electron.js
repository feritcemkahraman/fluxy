const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('🔍 Testing Electron...');

// Windows uyumluluğu için
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('--no-sandbox');
  app.commandLine.appendSwitch('--disable-gpu-sandbox');
  app.commandLine.appendSwitch('--disable-web-security');
}

let testWindow;

function createTestWindow() {
  console.log('📱 Creating test window...');
  
  testWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      sandbox: false
    },
    show: true, // Hemen göster
    backgroundColor: '#2e2c29'
  });

  // Test HTML yükle
  testWindow.loadURL('data:text/html,<h1 style="color:white;text-align:center;margin-top:200px;">🚀 Electron Test - Çalışıyor!</h1>');
  
  testWindow.on('closed', () => {
    testWindow = null;
  });

  console.log('✅ Test window created successfully!');
}

app.whenReady().then(() => {
  console.log('⚡ Electron is ready!');
  createTestWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createTestWindow();
  }
});

console.log('🎯 Electron test script loaded');
