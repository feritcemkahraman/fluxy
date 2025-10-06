import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LoginForm from './LoginForm';
import RegisterView from './RegisterView';
import FluxyApp from './FluxyApp';
import LandingPage from './LandingPage';
import UpdateProgress from './UpdateProgress';

export default function AuthWrapper() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Electron uygulaması mı kontrol et
  const isElectron = typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron');
  
  const [view, setView] = useState(isElectron ? 'login' : 'landing');

  // Update progress overlay (always render, component handles visibility)
  const updateProgressOverlay = <UpdateProgress />;

  const showLogin = () => setView('login');
  const showRegister = () => setView('register');
  const showLanding = () => setView('landing');

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    switch (view) {
      case 'login':
        return (
          <>
            {updateProgressOverlay}
            <LoginForm
              onToggleMode={showRegister}
              onBack={showLanding}
            />
          </>
        );
      case 'register':
        return (
          <>
            {updateProgressOverlay}
            <RegisterView
              onToggleMode={showLogin}
              onBack={showLanding}
            />
          </>
        );
      default:
        return (
          <>
            {updateProgressOverlay}
            <LandingPage onLogin={showLogin} onRegister={showRegister} />
          </>
        );
    }
  }

  return (
    <>
      {updateProgressOverlay}
      <FluxyApp />
    </>
  );
}
