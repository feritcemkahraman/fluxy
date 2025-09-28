const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Fluxy - Simple Mode');

// React server'ı başlat
console.log('📦 Starting React development server...');
const reactProcess = spawn('npm', ['start'], {
  cwd: __dirname,
  stdio: 'pipe',
  shell: true
});

reactProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('[React]', output.trim());
  
  // React server hazır olduğunda Electron'u başlat
  if (output.includes('webpack compiled successfully') || output.includes('Local:')) {
    setTimeout(() => {
      console.log('🖥️ Starting Electron...');
      
      const electronProcess = spawn('npx', ['electron', '.', '--no-sandbox', '--disable-gpu-sandbox', '--disable-web-security'], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true,
        env: {
          ...process.env,
          ELECTRON_IS_DEV: 'true'
        }
      });
      
      electronProcess.on('error', (error) => {
        console.error('❌ Electron error:', error);
      });
      
    }, 2000); // 2 saniye bekle
  }
});

reactProcess.stderr.on('data', (data) => {
  console.error('[React Error]', data.toString());
});

reactProcess.on('close', (code) => {
  console.log(`React process exited with code ${code}`);
});
