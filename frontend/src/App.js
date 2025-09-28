import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AuthWrapper from './components/AuthWrapper';
import { initPerformanceOptimizations } from './utils/performance';
// import performanceMonitor from './utils/performanceMonitor';
import './index.css';
import '@radix-ui/themes/styles.css';
import './App.css';

function App() {
  useEffect(() => {
    initPerformanceOptimizations();
    
    // Performance monitoring disabled for now
    console.log('🚀 App started');
  }, []);

  return (
    <SocketProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<AuthWrapper />} />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </AuthProvider>
    </SocketProvider>
  );
}

export default App;