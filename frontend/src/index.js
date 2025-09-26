import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Electron compatibility checks and polyfills
const isElectron = () => {
  return typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
};

// Polyfill for process (needed by some dependencies in browser environment)
if (typeof window !== 'undefined' && !window.process) {
  window.process = { env: {} };
}

// Electron-specific initialization
if (isElectron()) {
  console.log('🖥️ Running in Electron environment');
  
  // Disable context menu in production
  if (process.env.NODE_ENV === 'production') {
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
  
  // Handle Electron-specific events
  window.addEventListener('beforeunload', (e) => {
    // Prevent accidental close in Electron
    e.returnValue = false;
  });
} else {
  console.log('🌐 Running in web browser environment');
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
