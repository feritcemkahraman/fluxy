const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Fluxy Electron App (Windows Safe Mode)...');

// Check if React build exists
const buildPath = path.join(__dirname, 'build');
const hasReactBuild = fs.existsSync(buildPath);

if (!hasReactBuild) {
  console.log('📦 No build found, building React app first...');
  
  const buildProcess = spawn('npm', ['run', 'build'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });
  
  buildProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Build completed successfully!');
      startElectron();
    } else {
      console.error('❌ Build failed with code', code);
    }
  });
} else {
  console.log('📦 Using existing build...');
  startElectron();
}

function startElectron() {
  console.log('🖥️ Starting Electron...');
  
  // Start Electron with Windows-safe flags
  const electronProcess = spawn('npx', ['electron', '.', '--no-sandbox', '--disable-gpu-sandbox'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ELECTRON_IS_DEV: 'false', // Force production mode for stability
      NODE_ENV: 'production'
    }
  });
  
  electronProcess.on('close', (code) => {
    console.log(`Electron exited with code ${code}`);
  });
  
  electronProcess.on('error', (error) => {
    console.error('❌ Electron failed to start:', error);
    console.log('💡 Try running: npm run electron-dev instead');
  });
}
