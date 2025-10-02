import { useState, useEffect, useMemo, useCallback } from 'react';
import { useVoiceChat } from './useVoiceChat';
import { useAuth } from '../context/AuthContext';
import websocketService from '../services/websocket';

/**
 * Discord-Like Voice Participants Hook
 * Real-time participant tracking with optimistic updates
 * - Listens to WebSocket voiceChannelUpdate events
 * - Maintains global participant state per channel
 * - Provides instant UI updates
 */

// Global state for all voice channel participants
const channelParticipantsMap = new Map();

export const useVoiceParticipants = (channelId) => {
  const { user: currentUser } = useAuth();
  const {
    isConnected,
    currentChannel,
    participants: voiceParticipants,
    isMuted,
    isDeafened
  } = useVoiceChat();

  // Local state for this channel's participants
  const [channelParticipants, setChannelParticipants] = useState([]);

  // Handle voice channel updates from WebSocket
  const handleVoiceChannelUpdate = useCallback((data) => {
    const { channelId: updateChannelId, users, action } = data;
    
    // Only process updates for this channel
    if (updateChannelId !== channelId) return;

    console.log(`🔄 Voice channel update for ${channelId}:`, action, users);

    // Update global map
    channelParticipantsMap.set(updateChannelId, users || []);

    // Transform users to participant format
    const participants = (users || []).map(userInfo => {
      const userId = userInfo.id || userInfo._id;
      const isCurrentUserParticipant = userId === currentUser?.id || userId === currentUser?._id;

      return {
        id: userId,
        user: {
          id: userId,
          _id: userId,
          username: userInfo.username || 'Unknown User',
          displayName: userInfo.displayName || userInfo.username || 'Unknown User',
          avatar: userInfo.avatar,
          status: userInfo.status || 'online'
        },
        isMuted: isCurrentUserParticipant ? isMuted : (userInfo.isMuted || false),
        isDeafened: isCurrentUserParticipant ? isDeafened : (userInfo.isDeafened || false),
        isCurrentUser: isCurrentUserParticipant,
        isSpeaking: userInfo.isSpeaking || false,
        joinedAt: userInfo.joinedAt || Date.now()
      };
    });

    // Sort: Current user first, then by join time
    const sortedParticipants = participants.sort((a, b) => {
      if (a.isCurrentUser && !b.isCurrentUser) return -1;
      if (!a.isCurrentUser && b.isCurrentUser) return 1;
      return (a.joinedAt || 0) - (b.joinedAt || 0);
    });

    setChannelParticipants(sortedParticipants);
  }, [channelId, currentUser, isMuted, isDeafened]);

  // Handle mute status updates
  const handleVoiceUserMuted = useCallback((data) => {
    const { channelId: updateChannelId, userId, isMuted: userMuted } = data;
    if (updateChannelId !== channelId) return;

    console.log(`🔇 Mute update for ${userId}:`, userMuted);

    setChannelParticipants(prev => 
      prev.map(p => 
        p.id === userId ? { ...p, isMuted: userMuted } : p
      )
    );
  }, [channelId]);

  // Handle deafen status updates
  const handleVoiceUserDeafened = useCallback((data) => {
    const { channelId: updateChannelId, userId, isDeafened: userDeafened } = data;
    if (updateChannelId !== channelId) return;

    console.log(`🔇 Deafen update for ${userId}:`, userDeafened);

    setChannelParticipants(prev => 
      prev.map(p => 
        p.id === userId ? { ...p, isDeafened: userDeafened } : p
      )
    );
  }, [channelId]);

  // Subscribe to WebSocket events
  useEffect(() => {
    websocketService.on('voiceChannelUpdate', handleVoiceChannelUpdate);
    websocketService.on('voice-user-muted', handleVoiceUserMuted);
    websocketService.on('voice-user-deafened', handleVoiceUserDeafened);

    // Initialize from global map if available
    const existingParticipants = channelParticipantsMap.get(channelId);
    if (existingParticipants) {
      handleVoiceChannelUpdate({
        channelId,
        users: existingParticipants,
        action: 'init'
      });
    }

    return () => {
      websocketService.off('voiceChannelUpdate', handleVoiceChannelUpdate);
      websocketService.off('voice-user-muted', handleVoiceUserMuted);
      websocketService.off('voice-user-deafened', handleVoiceUserDeafened);
    };
  }, [channelId, handleVoiceChannelUpdate, handleVoiceUserMuted, handleVoiceUserDeafened]);

  // Fallback to voiceChat participants if WebSocket hasn't updated yet
  const participants = useMemo(() => {
    // Prefer WebSocket state
    if (channelParticipants.length > 0) {
      return channelParticipants;
    }

    // Fallback to voiceChat state (for current channel only)
    const isCurrentChannel = currentChannel === channelId;
    const isUserConnected = isConnected && isCurrentChannel;

    if (voiceParticipants && voiceParticipants.length > 0 && isCurrentChannel) {
      return voiceParticipants.map(participant => {
        const isCurrentUserParticipant = participant.isCurrentUser || 
          participant.user?.id === currentUser?.id || 
          participant.user?._id === currentUser?._id;

        return {
          id: participant.user?.id || participant.user?._id,
          user: participant.user,
          isMuted: isCurrentUserParticipant ? isMuted : (participant.isMuted || false),
          isDeafened: isCurrentUserParticipant ? isDeafened : (participant.isDeafened || false),
          isCurrentUser: isCurrentUserParticipant,
          isSpeaking: participant.isSpeaking || false,
          joinedAt: participant.joinedAt || Date.now()
        };
      });
    }

    // Optimistic update: Show current user immediately if connected
    if (isUserConnected && currentUser) {
      return [{
        id: currentUser.id || currentUser._id,
        user: currentUser,
        isMuted,
        isDeafened,
        isCurrentUser: true,
        isSpeaking: false,
        joinedAt: Date.now()
      }];
    }

    return [];
  }, [channelParticipants, channelId, currentChannel, isConnected, voiceParticipants, currentUser, isMuted, isDeafened]);

  return {
    participants,
    isConnected: isConnected && currentChannel === channelId,
    participantCount: participants.length,
    hasCurrentUser: participants.some(p => p.isCurrentUser)
  };
};

// Export for cleanup if needed
export const clearVoiceParticipantsCache = () => {
  channelParticipantsMap.clear();
};
