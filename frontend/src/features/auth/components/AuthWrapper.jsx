import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import FluxyApp from '../../../components/FluxyApp';
import LandingPage from '../../../components/LandingPage';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import UpdateProgress from '../../../components/UpdateProgress';

import { AUTH_MODES } from '../constants';

/**
 * AuthWrapper Component - Discord Style
 * Main authentication router with clean state management
 */
export default function AuthWrapper() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Electron uygulaması mı kontrol et
  const isElectron = typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron');
  
  // Electron: Login göster (tab'lı), Web: Landing page göster
  const [currentMode, setCurrentMode] = useState(
    isElectron ? AUTH_MODES.LOGIN : 'landing'
  );

  const handleModeChange = (mode) => {
    setCurrentMode(mode);
  };

  const showLogin = () => handleModeChange(AUTH_MODES.LOGIN);
  const showRegister = () => handleModeChange(AUTH_MODES.REGISTER);
  const showLanding = () => handleModeChange('landing');

  // Loading state
  if (isLoading) {
    return <LoadingSpinner message="Yükleniyor..." />;
  }

  // Authenticated - show main app
  if (isAuthenticated) {
    return (
      <>
        <UpdateProgress />
        <FluxyApp />
      </>
    );
  }

  // Not authenticated - show auth flow
  const renderAuthView = () => {
    switch (currentMode) {
      case AUTH_MODES.LOGIN:
        return (
          <LoginForm
            onToggleMode={showRegister}
            onBack={!isElectron ? showLanding : null}
          />
        );
      
      case AUTH_MODES.REGISTER:
        return (
          <RegisterForm
            onToggleMode={showLogin}
            onBack={isElectron ? showLogin : null}  // Sadece Electron'da geri butonu
          />
        );
      
      default:
        return (
          <LandingPage 
            onLogin={showLogin} 
            onRegister={showRegister} 
          />
        );
    }
  };

  return renderAuthView();
}
