import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LoadingSpinner Component - Discord Style
 * Reusable loading spinner with customizable message and size
 */
const LoadingSpinner = ({ 
  message = 'Yükleniyor...', 
  size = 'default',
  className = '',
  fullScreen = true 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  const spinnerSize = sizeClasses[size] || sizeClasses.default;

  const content = (
    <div className="text-center">
      <div className={`animate-spin rounded-full border-b-2 border-blue-500 mx-auto mb-4 ${spinnerSize}`}>
        <Loader2 className={`${spinnerSize} text-blue-500`} />
      </div>
      {message && (
        <p className="text-gray-400 text-sm">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 bg-gray-900 flex items-center justify-center overflow-hidden z-50 ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      {content}
    </div>
  );
};

export default LoadingSpinner;
