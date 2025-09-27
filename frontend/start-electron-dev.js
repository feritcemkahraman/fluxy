const { spawn } = require('child_process');
const path = require('path');
const { exec } = require('child_process');

console.log('🚀 Starting Fluxy Electron App in DEV mode...');

// Function to check if React dev server is running
function checkReactServer() {
  return new Promise((resolve) => {
    exec('curl -s http://localhost:3000', (error) => {
      resolve(!error);
    });
  });
}

// Function to start React dev server
function startReactServer() {
  console.log('📦 Starting React dev server...');
  return spawn('npm', ['start'], {
    cwd: __dirname,
    stdio: 'pipe',
    shell: true
  });
}

// Function to wait for React server to be ready
async function waitForReactServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const isRunning = await checkReactServer();
    if (isRunning) {
      console.log('✅ React dev server is ready!');
      return true;
    }
    console.log(`⏳ Waiting for React dev server... (${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return false;
}

async function main() {
  // Check if React server is already running
  const isAlreadyRunning = await checkReactServer();
  
  let reactProcess;
  if (!isAlreadyRunning) {
    // Start React dev server
    reactProcess = startReactServer();
    
    // Wait for React server to be ready
    const isReady = await waitForReactServer();
    if (!isReady) {
      console.error('❌ React dev server failed to start');
      if (reactProcess) reactProcess.kill();
      process.exit(1);
    }
  } else {
    console.log('✅ React dev server is already running!');
  }
  
  console.log('🖥️ Starting Electron...');
  
  // Start Electron
  const electronProcess = spawn('npm', ['run', 'electron'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
  });
  
  // Handle cleanup
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    if (reactProcess) reactProcess.kill();
    electronProcess.kill();
    process.exit(0);
  });
  
  electronProcess.on('close', (code) => {
    console.log(`Electron exited with code ${code}`);
    if (reactProcess) reactProcess.kill();
  });
}

main().catch(console.error);
