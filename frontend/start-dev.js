const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

console.log('🚀 Starting Fluxy in Development Mode...');

// Function to check if React dev server is running
function checkReactServer() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000', (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1000);
  });
}

// Function to wait for React dev server
async function waitForReactServer() {
  console.log('⏳ Waiting for React dev server...');
  while (true) {
    const isRunning = await checkReactServer();
    if (isRunning) {
      console.log('✅ React dev server is ready!');
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function startDevelopment() {
  // Start React dev server
  console.log('📦 Starting React dev server...');
  const reactProcess = spawn('npm', ['start'], {
    cwd: __dirname,
    stdio: 'pipe',
    shell: true
  });

  // Log React output
  reactProcess.stdout.on('data', (data) => {
    console.log(`React: ${data.toString().trim()}`);
  });

  reactProcess.stderr.on('data', (data) => {
    console.log(`React Error: ${data.toString().trim()}`);
  });

  // Wait for React server to be ready
  await waitForReactServer();

  // Start Electron
  console.log('🖥️ Starting Electron with DevTools...');
  const electronProcess = spawn('npm', ['run', 'electron'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  electronProcess.on('close', (code) => {
    console.log(`Electron exited with code ${code}`);
    // Kill React process when Electron closes
    reactProcess.kill();
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    electronProcess.kill();
    reactProcess.kill();
    process.exit(0);
  });
}

startDevelopment().catch(console.error);
