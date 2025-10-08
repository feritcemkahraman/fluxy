import React from 'react';

/**
 * LoadingSpinner Component - Fluxy Style
 * Beautiful animated loading screen with Fluxy logo
 */
const LoadingSpinner = ({ 
  message = '', 
  size = 'default',
  className = '',
  fullScreen = true 
}) => {
  const content = (
    <div className="text-center">
      {/* Fluxy Logo with Pulse Animation */}
      <div className="relative mb-8">
        {/* Glow Effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 bg-cyan-500/30 rounded-full blur-3xl animate-pulse"></div>
        </div>
        
        {/* Logo Container */}
        <div className="relative flex items-center justify-center gap-4 animate-bounce-slow">
          <img 
            src="fluxy.png" 
            alt="Fluxy" 
            className="h-20 w-20 drop-shadow-[0_0_25px_rgba(94,234,212,0.7)] animate-pulse" 
          />
          <h1 className="text-5xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500 drop-shadow-[0_0_20px_rgba(94,234,212,0.6)]">
            FLUXY
          </h1>
        </div>
      </div>

      {/* Loading Dots Animation */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>

      {/* Message */}
      {message && (
        <p className="text-gray-400 text-base font-medium animate-pulse">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 bg-gradient-to-br from-[#030712] via-[#0a0e1a] to-[#030712] flex items-center justify-center overflow-hidden z-50 ${className}`}>
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(94, 234, 212, 0.15) 1px, transparent 0)',
            backgroundSize: '48px 48px'
          }}></div>
        </div>
        
        {/* Animated Rays */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent rotate-0 animate-spin-slow"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent rotate-45 animate-spin-slow" style={{ animationDelay: '-1s' }}></div>
          </div>
        </div>

        <div className="relative z-10">
          {content}
        </div>
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
