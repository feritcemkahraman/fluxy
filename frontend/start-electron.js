const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Fluxy Electron App in PRODUCTION mode...');

// First build the React app
console.log('📦 Building React app...');
const buildProcess = spawn('npm', ['run', 'build'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Build completed successfully!');
    console.log('🖥️ Starting Electron...');
    
    // Start Electron in production mode
    const electronProcess = spawn('npm', ['run', 'electron'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    electronProcess.on('close', (code) => {
      console.log(`Electron exited with code ${code}`);
    });
    
  } else {
    console.error('❌ Build failed with code', code);
  }
});
