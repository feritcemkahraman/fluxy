import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { AuthWrapper } from './features/auth';
import { initPerformanceOptimizations } from './utils/performance';
// import performanceMonitor from './utils/performanceMonitor';
import './index.css';
import '@radix-ui/themes/styles.css';
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