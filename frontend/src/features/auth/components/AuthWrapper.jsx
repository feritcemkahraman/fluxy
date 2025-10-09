import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import FluxyApp from '../../../components/FluxyApp';
import LandingPage from '../../../components/LandingPage';
import RegistrationSuccess from '../../../components/RegistrationSuccess';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import UpdateProgress from '../../../components/UpdateProgress';
import UpdateCheckModal from '../../../components/UpdateCheckModal';

import { AUTH_MODES } from '../constants';

/**
 * AuthWrapper Component - Discord Style
 * Main authentication router with clean state management
 */
export default function AuthWrapper() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  
  // Electron uygulaması mı kontrol et
  const isElectron = typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron');
  
  // Electron: Login göster (tab'lı), Web: Landing page göster
  const [currentMode, setCurrentMode] = useState(
    isElectron ? AUTH_MODES.LOGIN : 'landing'
  );
  
  // Registration success state (only for web)
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  
  // Update check modal state (works for all users, even not logged in)
  const [showUpdateCheckModal, setShowUpdateCheckModal] = useState(false);
  const [updateCheckState, setUpdateCheckState] = useState('checking');

  const handleModeChange = (mode) => {
    setCurrentMode(mode);
    setRegistrationSuccess(false);
  };

  const showLogin = () => handleModeChange(AUTH_MODES.LOGIN);
  const showRegister = () => handleModeChange(AUTH_MODES.REGISTER);
  const showLanding = () => handleModeChange('landing');
  
  const handleRegistrationSuccess = async (email) => {
    // If from web (not Electron), show success page instead of auto-login
    if (!isElectron) {
      setRegisteredEmail(email);
      setRegistrationSuccess(true);
      // Logout to prevent auto-login
      await logout();
    }
  };

  // Electron update check modal handler - works for ALL users (logged in or not)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const handleShowUpdateCheckModal = () => {
        setUpdateCheckState('checking');
        setShowUpdateCheckModal(true);
        // Trigger manual update check
        if (window.electronAPI.manualCheckForUpdates) {
          window.electronAPI.manualCheckForUpdates();
        }
      };

      const handleUpdateNotAvailable = () => {
        setUpdateCheckState('up-to-date');
      };

      const handleUpdateDownloadStarted = () => {
        setUpdateCheckState('downloading');
      };

      const handleUpdateCheckError = () => {
        setUpdateCheckState('error');
      };

      window.electronAPI.on?.('show-update-check-modal', handleShowUpdateCheckModal);
      window.electronAPI.on?.('update-not-available', handleUpdateNotAvailable);
      window.electronAPI.on?.('update-download-started', handleUpdateDownloadStarted);
      window.electronAPI.on?.('update-check-error', handleUpdateCheckError);

      return () => {
        window.electronAPI.off?.('show-update-check-modal', handleShowUpdateCheckModal);
        window.electronAPI.off?.('update-not-available', handleUpdateNotAvailable);
        window.electronAPI.off?.('update-download-started', handleUpdateDownloadStarted);
        window.electronAPI.off?.('update-check-error', handleUpdateCheckError);
      };
    }
  }, []);

  // Loading state
  if (isLoading) {
    return <LoadingSpinner message="Yükleniyor..." />;
  }
  
  // Show registration success page (only for web)
  if (registrationSuccess && !isElectron) {
    return <RegistrationSuccess email={registeredEmail} />;
  }

  // Authenticated - show main app
  if (isAuthenticated) {
    return <FluxyApp />;
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
            onBack={!isElectron ? showLanding : null}
            onSuccess={handleRegistrationSuccess}
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

  return (
    <>
      {/* Update components - work for all users */}
      <UpdateProgress />
      <UpdateCheckModal 
        isOpen={showUpdateCheckModal} 
        onClose={() => setShowUpdateCheckModal(false)}
        initialState={updateCheckState}
      />
      
      {renderAuthView()}
    </>
  );
}
