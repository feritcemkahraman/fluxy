import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Polyfill for process (needed by some dependencies in browser environment)
if (typeof window !== 'undefined' && !window.process) {
  window.process = { env: {} };
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
