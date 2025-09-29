import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Monitor, 
  AppWindow, 
  X, 
  Check,
  Volume2,
  VolumeX
} from 'lucide-react';
import electronAPI from '../utils/electronAPI';

const ScreenSharePicker = ({ isOpen, onClose, onSelect }) => {
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && electronAPI.isElectron()) {
      loadSources();
    }
  }, [isOpen]);

  const loadSources = async () => {
    try {
      setLoading(true);
      const desktopSources = await electronAPI.getDesktopSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 300, height: 200 },
        fetchWindowIcons: true
      });
      
      // Separate screens and windows
      const screens = desktopSources.filter(source => source.id.startsWith('screen:'));
      const windows = desktopSources.filter(source => source.id.startsWith('window:'));
      
      setSources([...screens, ...windows]);
      
      // Auto-select first screen if available
      if (screens.length > 0) {
        setSelectedSource(screens[0]);
      }
    } catch (error) {
      console.error('Failed to load desktop sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedSource) {
      onSelect({
        source: selectedSource,
        includeAudio
      });
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedSource(null);
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Ekran Paylaş</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Ekranlar yükleniyor...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Source Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 max-h-96 overflow-y-auto">
                {sources.map((source) => {
                  const isScreen = source.id.startsWith('screen:');
                  const isSelected = selectedSource?.id === source.id;
                  
                  return (
                    <div
                      key={source.id}
                      className={`relative cursor-pointer rounded-lg border-2 transition-all duration-200 ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedSource(source)}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-video bg-gray-800 rounded-t-lg overflow-hidden relative">
                        {source.thumbnail ? (
                          <img
                            src={source.thumbnail}
                            alt={source.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        {/* Fallback icon if no thumbnail */}
                        <div 
                          className={`absolute inset-0 w-full h-full flex items-center justify-center ${source.thumbnail ? 'hidden' : 'flex'}`}
                          style={{ display: source.thumbnail ? 'none' : 'flex' }}
                        >
                          {source.id.startsWith('screen:') ? (
                            <Monitor className="w-12 h-12 text-gray-500" />
                          ) : (
                            <AppWindow className="w-12 h-12 text-gray-500" />
                          )}
                        </div>
                      </div>
                      
                      {/* Info */}
                      <div className="p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          {isScreen ? (
                            <Monitor className="w-4 h-4 text-blue-400" />
                          ) : (
                            <AppWindow className="w-4 h-4 text-green-400" />
                          )}
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${
                              isScreen 
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                                : 'bg-green-500/20 text-green-400 border-green-500/30'
                            }`}
                          >
                            {isScreen ? 'Ekran' : 'Pencere'}
                          </Badge>
                        </div>
                        
                        <p className="text-white text-sm font-medium truncate" title={source.name}>
                          {source.name}
                        </p>
                      </div>
                      
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Audio Option */}
              <div className="flex items-center space-x-3 mb-6 p-3 bg-gray-800/50 rounded-lg">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIncludeAudio(!includeAudio)}
                  className={`w-10 h-10 ${
                    includeAudio 
                      ? 'text-green-400 hover:text-green-300' 
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {includeAudio ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </Button>
                <div>
                  <p className="text-white font-medium">Sistem Sesini Paylaş</p>
                  <p className="text-gray-400 text-sm">
                    Bilgisayarınızdan çıkan sesleri de paylaşır
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <p className="text-gray-400 text-sm">
            {selectedSource ? `Seçili: ${selectedSource.name}` : 'Paylaşmak istediğiniz ekran veya pencereyi seçin'}
          </p>
          <div className="flex space-x-3">
            <Button variant="ghost" onClick={handleCancel}>
              İptal
            </Button>
            <Button 
              onClick={handleSelect}
              disabled={!selectedSource || loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Paylaş
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ScreenSharePicker;
