import { useState, useEffect, useMemo } from 'react';
import { useVoiceChat } from './useVoiceChat';
import { useAuth } from '../context/AuthContext';

/**
 * Unified Voice Participants Hook
 * Single source of truth for voice channel participants
 * Combines local state + server state + current user state
 */
export const useVoiceParticipants = (channelId) => {
  const { user: currentUser } = useAuth();
  const {
    isConnected,
    currentChannel,
    participants: voiceParticipants,
    isMuted,
    isDeafened
  } = useVoiceChat();

  // Unified participant list
  const participants = useMemo(() => {
    if (!channelId) return [];

    const participantList = [];
    const isCurrentChannel = currentChannel === channelId;
    const isUserConnected = isConnected && isCurrentChannel;
    

    // Add participants from voice service - ONLY for current channel
    if (voiceParticipants && voiceParticipants.length > 0 && isCurrentChannel) {
      voiceParticipants.forEach(participant => {
        const isCurrentUserParticipant = participant.isCurrentUser || 
          participant.user?.id === currentUser?.id || 
          participant.user?._id === currentUser?._id;

        participantList.push({
          id: participant.user?.id || participant.user?._id,
          user: participant.user,
          isMuted: isCurrentUserParticipant ? isMuted : (participant.isMuted || false),
          isDeafened: isCurrentUserParticipant ? isDeafened : (participant.isDeafened || false),
          isCurrentUser: isCurrentUserParticipant,
          isSpeaking: participant.isSpeaking || false,
          joinedAt: participant.joinedAt || Date.now()
        });
      });
    } else if (isUserConnected && currentUser) {
      // Fallback: If no participants but user is connected, show current user
      participantList.push({
        id: currentUser.id || currentUser._id,
        user: currentUser,
        isMuted,
        isDeafened,
        isCurrentUser: true,
        isSpeaking: false,
        joinedAt: Date.now()
      });
    }

    // Deduplicate by user ID and sort (current user first)
    const uniqueParticipants = participantList.reduce((acc, participant) => {
      const existingIndex = acc.findIndex(p => p.id === participant.id);
      if (existingIndex >= 0) {
        // Update existing with most recent data
        acc[existingIndex] = { ...acc[existingIndex], ...participant };
      } else {
        acc.push(participant);
      }
      return acc;
    }, []);

    // Sort: Current user first, then by join time
    return uniqueParticipants.sort((a, b) => {
      if (a.isCurrentUser && !b.isCurrentUser) return -1;
      if (!a.isCurrentUser && b.isCurrentUser) return 1;
      return (a.joinedAt || 0) - (b.joinedAt || 0);
    });
  }, [channelId, currentChannel, isConnected, voiceParticipants, currentUser, isMuted, isDeafened]);

  return {
    participants,
    isConnected: isConnected && currentChannel === channelId,
    participantCount: participants.length,
    hasCurrentUser: participants.some(p => p.isCurrentUser)
  };
};
