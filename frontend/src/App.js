import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AuthWrapper from './components/AuthWrapper';
import { initElectronOptimizations } from './utils/electronOptimizer';
import './index.css';
import '@radix-ui/themes/styles.css';
import './App.css';

function App() {
  useEffect(() => {
    // Apply radical Electron optimizations
    initElectronOptimizations();
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