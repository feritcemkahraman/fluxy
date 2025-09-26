import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import { Button } from './ui/button';
import electronAPI from '../utils/electronAPI';

const DesktopTitleBar = ({ title = 'Fluxy' }) => {
  // Only render in Electron
  if (!electronAPI.isElectron()) {
    return null;
  }

  const handleMinimize = () => {
    electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    electronAPI.maximizeWindow();
  };

  const handleClose = () => {
    electronAPI.closeWindow();
  };

  return (
    <div className="flex items-center justify-between h-8 bg-gray-900 border-b border-gray-700 select-none drag-region">
      {/* App Title */}
      <div className="flex items-center px-4">
        <span className="text-sm font-medium text-gray-300">{title}</span>
      </div>

      {/* Window Controls */}
      <div className="flex items-center no-drag">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-700 rounded-none"
          onClick={handleMinimize}
          title="Küçült"
        >
          <Minus className="w-4 h-4 text-gray-400" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-700 rounded-none"
          onClick={handleMaximize}
          title="Büyüt/Küçült"
        >
          <Square className="w-3 h-3 text-gray-400" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-red-600 rounded-none"
          onClick={handleClose}
          title="Kapat"
        >
          <X className="w-4 h-4 text-gray-400 hover:text-white" />
        </Button>
      </div>
    </div>
  );
};

export default DesktopTitleBar;
