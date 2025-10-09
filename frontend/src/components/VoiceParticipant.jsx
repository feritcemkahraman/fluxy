import React, { useState } from 'react';
import { MicOff, HeadphonesIcon, Volume2, VolumeX, User, MessageSquare } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';

/**
 * VoiceParticipant Component
 * Clean, reusable component for displaying voice channel participants
 * Handles mute/deafen states, current user highlighting, etc.
 */
const VoiceParticipant = ({ 
  participant, 
  size = 'default',
  showMuteIcons = true,
  className = '' 
}) => {
  const { user, isMuted, isDeafened, isCurrentUser, isSpeaking } = participant;
  const [localVolume, setLocalVolume] = useState(100);

  // Size variants
  const sizeClasses = {
    small: {
      container: 'px-2 py-1',
      avatar: 'w-5 h-5',
      text: 'text-sm',
      icon: 'w-3 h-3'
    },
    default: {
      container: 'px-2 py-1',
      avatar: 'w-6 h-6',
      text: 'text-base',
      icon: 'w-4 h-4'
    },
    large: {
      container: 'px-3 py-2',
      avatar: 'w-8 h-8',
      text: 'text-lg',
      icon: 'w-5 h-5'
    }
  };

  const sizes = sizeClasses[size] || sizeClasses.default;

  // User display name
  const displayName = user?.displayName || user?.username || 'Unknown User';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  // Dynamic styles based on state
  const containerClasses = `
    flex items-center justify-between ${sizes.container} ${sizes.text}
    text-gray-300 hover:text-white hover:bg-white/5 transition-colors group cursor-pointer rounded
    ${isSpeaking ? 'bg-green-500/10' : ''}
    ${className}
  `.trim();

  const avatarRingClass = isCurrentUser 
    ? 'ring-1 ring-green-400/60 group-hover:ring-green-400/80'
    : isSpeaking 
      ? 'ring-1 ring-green-400/80'
      : 'ring-1 ring-white/20 group-hover:ring-white/40';

  const nameColorClass = isCurrentUser
    ? 'text-white'
    : isSpeaking
      ? 'text-green-400'
      : 'text-gray-300';

  const handleVolumeChange = (newVolume) => {
    setLocalVolume(newVolume);
    // TODO: Implement actual volume control via WebRTC
    console.log(`Setting volume for ${displayName} to ${newVolume}%`);
  };

  const handleClick = (e) => {
    // Prevent triggering when clicking on dropdown menu
    if (e.defaultPrevented) return;
    console.log('Participant clicked:', displayName);
    // TODO: Implement participant profile view or other actions
  };

  const handleViewProfile = () => {
    console.log('View profile:', displayName);
    // TODO: Open profile modal
  };

  const handleSendMessage = () => {
    console.log('Send message to:', displayName);
    // TODO: Open DM with user
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className={containerClasses} onClick={handleClick}>
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {/* Avatar */}
            <div className={`
              relative ${sizes.avatar} rounded-full overflow-hidden flex-shrink-0 
              ${avatarRingClass} transition-all
            `}>
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {avatarLetter}
                </span>
              </div>
            </div>

            {/* Name */}
            <span className={`truncate font-medium flex-1 ${nameColorClass}`}>
              {displayName}
            </span>

            {/* Current User Badge + Mute/Deafen Icons */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {isCurrentUser && (
                <span className="text-green-400 text-sm">(Sen)</span>
              )}
              
              {/* Mute/Deafen Icons */}
              {showMuteIcons && (isMuted || isDeafened) && (
                <div className="flex space-x-1">
                  {isMuted && (
                    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border border-black/30 shadow-lg">
                      <MicOff className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  {isDeafened && (
                    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border border-black/30 shadow-lg">
                      <HeadphonesIcon className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DropdownMenuTrigger>
      
      {/* Right-click context menu - Discord style */}
      <DropdownMenuContent 
        align="start" 
        className="bg-gray-900/98 backdrop-blur-md border-gray-700/50 text-white w-60 shadow-2xl"
      >
        {!isCurrentUser && (
          <>
            <DropdownMenuItem
              onClick={handleViewProfile}
              className="text-gray-200 hover:text-white hover:bg-blue-600/90 focus:bg-blue-600/90 focus:text-white cursor-pointer transition-colors duration-150 py-2.5"
            >
              <User className="w-4 h-4 mr-3" />
              Profili Görüntüle
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={handleSendMessage}
              className="text-gray-200 hover:text-white hover:bg-blue-600/90 focus:bg-blue-600/90 focus:text-white cursor-pointer transition-colors duration-150 py-2.5"
            >
              <MessageSquare className="w-4 h-4 mr-3" />
              Mesaj Gönder
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-gray-700/50 my-1" />
          </>
        )}
        
        {/* Volume slider section */}
        <div className="px-2 py-3">
          <div className="flex flex-col w-full space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Kullanıcı Ses Seviyesi</span>
              <span className="text-xs font-bold text-white bg-gray-700/80 px-2 py-0.5 rounded">{localVolume}%</span>
            </div>
            <div className="px-2">
              <input
                type="range"
                min="0"
                max="200"
                value={localVolume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="volume-slider"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${localVolume/2}%, #374151 ${localVolume/2}%, #374151 100%)`
                }}
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-gray-500">0%</span>
                <span className="text-xs text-gray-500">200%</span>
              </div>
            </div>
          </div>
        </div>
        
        <DropdownMenuSeparator className="bg-gray-700/50 my-1" />
        
        <DropdownMenuItem
          onClick={() => handleVolumeChange(localVolume === 0 ? 100 : 0)}
          className="text-gray-200 hover:text-white hover:bg-red-600/90 focus:bg-red-600/90 focus:text-white cursor-pointer transition-colors duration-150 py-2.5"
        >
          {localVolume === 0 ? (
            <>
              <Volume2 className="w-4 h-4 mr-3" />
              Susturmayı Kaldır
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 mr-3" />
              Kullanıcıyı Sustur
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default VoiceParticipant;
