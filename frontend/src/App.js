import React, { useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { AuthWrapper } from './features/auth';
import { initPerformanceOptimizations } from './utils/performance';

// Use HashRouter for Electron (file://) and BrowserRouter for web
const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;
// import performanceMonitor from './utils/performanceMonitor';
import './index.css';
// Removed @radix-ui/themes - not used (shadcn/ui components use individual packages)
import './App.css';
function App() {
  useEffect(() => {
    initPerformanceOptimizations();
  }, []);

  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <AuthWrapper />
            <Toaster position="top-right" richColors />
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}
export default App;