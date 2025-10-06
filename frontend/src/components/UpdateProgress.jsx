import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function UpdateProgress() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const handleShowProgress = (info) => {
        setUpdateInfo(info);
      };

      const handleProgress = (progressInfo) => {
        setProgress(Math.round(progressInfo.percent));
      };

      window.electronAPI.on?.('show-update-progress', handleShowProgress);
      window.electronAPI.on?.('update-progress', handleProgress);

      return () => {
        window.electronAPI.off?.('show-update-progress', handleShowProgress);
        window.electronAPI.off?.('update-progress', handleProgress);
      };
    }
  }, []);

  if (!updateInfo) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#030712]">
      <div className="text-center space-y-6 max-w-md px-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="fluxy.png" alt="Fluxy" className="h-16 w-16" />
          <h1 className="text-4xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500 animate-pulse drop-shadow-[0_0_15px_rgba(94,234,212,0.5)]">
            FLUXY
          </h1>
        </div>

        {/* Update Info */}
        <div className="space-y-4">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />
          <h2 className="text-2xl font-bold text-white">Güncelleme Yükleniyor</h2>
          <p className="text-gray-400">
            Versiyon {updateInfo.version} indiriliyor...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-500">%{progress}</p>

        <p className="text-xs text-gray-600 mt-8">
          Lütfen bekleyin, güncelleme tamamlandığında uygulama otomatik olarak yeniden başlatılacak.
        </p>
      </div>
    </div>
  );
}
