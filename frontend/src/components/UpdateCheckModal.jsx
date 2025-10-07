import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Download, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * Update Check Modal - Discord-like update interface
 * Shows checking, downloading, and result states
 */
const UpdateCheckModal = ({ isOpen, onClose, initialState = 'checking' }) => {
  const [state, setState] = useState(initialState);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setState(initialState);
      setProgress(0);

      // Listen for update events
      if (typeof window !== 'undefined' && window.electronAPI) {
        const handleUpdateAvailable = (info) => {
          setState('downloading');
        };

        const handleUpdateProgress = (progressInfo) => {
          setProgress(Math.round(progressInfo.percent));
        };

        const handleUpdateDownloaded = () => {
          setState('ready');
        };

        const handleUpdateNotAvailable = () => {
          setState('up-to-date');
        };

        window.electronAPI.on?.('update-available', handleUpdateAvailable);
        window.electronAPI.on?.('update-progress', handleUpdateProgress);
        window.electronAPI.on?.('update-downloaded', handleUpdateDownloaded);
        window.electronAPI.on?.('update-not-available', handleUpdateNotAvailable);

        return () => {
          window.electronAPI.off?.('update-available', handleUpdateAvailable);
          window.electronAPI.off?.('update-progress', handleUpdateProgress);
          window.electronAPI.off?.('update-downloaded', handleUpdateDownloaded);
          window.electronAPI.off?.('update-not-available', handleUpdateNotAvailable);
        };
      }
    }
  }, [isOpen, initialState]);

  const handleRestart = () => {
    if (window.electronAPI?.restartApp) {
      window.electronAPI.restartApp();
    }
  };

  const getContent = () => {
    switch (state) {
      case 'checking':
        return {
          icon: <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />,
          title: 'Güncellemeler Kontrol Ediliyor',
          message: 'Fluxy için yeni güncellemeler kontrol ediliyor...',
          showClose: true
        };

      case 'downloading':
        return {
          icon: <Download className="w-12 h-12 text-cyan-400" />,
          title: 'Güncelleme İndiriliyor',
          message: 'Yeni güncelleme indiriliyor, lütfen bekleyin...',
          progress: true,
          showClose: false
        };

      case 'ready':
        return {
          icon: <CheckCircle className="w-12 h-12 text-green-400" />,
          title: 'Güncelleme Hazır',
          message: 'Güncelleme indirildi. Uygulamayı yeniden başlatmak istiyor musunuz?',
          buttons: [
            { label: 'Daha Sonra', variant: 'secondary', onClick: onClose },
            { label: 'Şimdi Yeniden Başlat', variant: 'primary', onClick: handleRestart }
          ],
          showClose: false
        };

      case 'up-to-date':
        return {
          icon: <CheckCircle className="w-12 h-12 text-green-400" />,
          title: 'Fluxy Tamamen Güncel',
          message: 'Tebrikler! Fluxy uygulamanız en son sürüme sahip.',
          buttons: [
            { label: 'Tamam', variant: 'primary', onClick: onClose }
          ],
          showClose: true
        };

      case 'error':
        return {
          icon: <XCircle className="w-12 h-12 text-red-400" />,
          title: 'Güncelleme Hatası',
          message: 'Güncelleme kontrolü sırasında bir hata oluştu. İnternet bağlantınızı kontrol edin.',
          buttons: [
            { label: 'Tekrar Dene', variant: 'secondary', onClick: () => setState('checking') },
            { label: 'İptal', variant: 'outline', onClick: onClose }
          ],
          showClose: true
        };

      default:
        return {
          icon: <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />,
          title: 'Güncellemeler Kontrol Ediliyor',
          message: 'Fluxy için yeni güncellemeler kontrol ediliyor...',
          showClose: true
        };
    }
  };

  const content = getContent();

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-700 shadow-2xl">
        {/* Close button */}
        {content.showClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        )}

        {/* Content */}
        <div className="text-center space-y-6">
          {/* Logo and Icon */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src="fluxy.png" alt="Fluxy" className="h-12 w-12" />
            {content.icon}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white">{content.title}</h2>

          {/* Message */}
          <p className="text-gray-300">{content.message}</p>

          {/* Progress Bar */}
          {content.progress && (
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Progress Text */}
          {content.progress && (
            <p className="text-sm text-gray-400">% {progress}</p>
          )}

          {/* Buttons */}
          {content.buttons && (
            <div className="flex gap-3 justify-center mt-6">
              {content.buttons.map((button, index) => (
                <button
                  key={index}
                  onClick={button.onClick}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    button.variant === 'primary'
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-white'
                      : button.variant === 'secondary'
                      ? 'bg-gray-600 hover:bg-gray-500 text-white'
                      : 'border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white'
                  }`}
                >
                  {button.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body level
  return createPortal(modalContent, document.body);
};

export default UpdateCheckModal;
