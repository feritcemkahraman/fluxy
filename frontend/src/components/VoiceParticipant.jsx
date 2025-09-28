import React from 'react';
import { MicOff, HeadphonesIcon } from 'lucide-react';

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
    text-gray-300 hover:text-white transition-colors group
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

  return (
    <div className={containerClasses}>
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
  );
};

export default VoiceParticipant;
