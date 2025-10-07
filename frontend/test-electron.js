const { app, BrowserWindow } = require('electron');

console.log('Electron test starting...');

app.whenReady().then(() => {
  console.log('Electron ready!');
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.loadURL('data:text/html,<h1>Hello Electron!</h1>');
});
