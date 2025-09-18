import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import AuthWrapper from './components/AuthWrapper';
import '@radix-ui/themes/styles.css';
import './App.css';

function App() {
  return (
    <Theme>
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
    </Theme>
  );
}

export default App;