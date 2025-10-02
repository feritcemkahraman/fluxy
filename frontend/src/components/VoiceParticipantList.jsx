import React from 'react';
import VoiceParticipant from './VoiceParticipant';
import { useVoiceParticipants } from '../hooks/useVoiceParticipants';

/**
 * VoiceParticipantList Component
 * Displays all participants in a voice channel
 * Uses the unified useVoiceParticipants hook
 * FIXED: Always call hooks unconditionally (React rules)
 */
const VoiceParticipantList = ({ 
  channelId, 
  size = 'default',
  showMuteIcons = true,
  className = '',
  emptyMessage = null
}) => {
  // ALWAYS call hooks unconditionally (React rules)
  const { participants, isConnected, participantCount } = useVoiceParticipants(channelId);

  // Don't render if no participants
  if (participantCount === 0) {
    return emptyMessage || null;
  }

  return (
    <div className={`ml-6 space-y-1 ${className}`}>
      {participants.map((participant) => (
        <VoiceParticipant
          key={participant.id}
          participant={participant}
          size={size}
          showMuteIcons={showMuteIcons}
        />
      ))}
    </div>
  );
};

export default VoiceParticipantList;
