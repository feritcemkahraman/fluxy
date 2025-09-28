import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Enhanced environment detection
const detectElectron = () => {
  // Multiple detection methods for reliability
  const hasElectronAPI = !!(window.electronAPI && window.electronAPI.isElectron);
  const hasElectronFlag = !!window.isElectron;
  const hasElectronEnv = !!window.__ELECTRON_ENV__;
  const hasElectronUserAgent = navigator.userAgent.includes('Electron');
  
  return hasElectronAPI || hasElectronFlag || hasElectronEnv || hasElectronUserAgent;
};

const isElectron = detectElectron();
const isBrowser = !isElectron;

// Set global environment flags
window.__FLUXY_ENV__ = {
  isElectron,
  isBrowser,
  isDevelopment: process.env.NODE_ENV === 'development',
  version: process.env.REACT_APP_VERSION || '1.0.0'
};

if (isElectron) {
  console.log('🖥️ Running in Electron environment');
  // Electron-specific optimizations
  document.body.classList.add('electron-app');
} else {
  console.log('🌐 Running in web browser environment');
  // Browser-specific optimizations
  document.body.classList.add('web-app');
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
