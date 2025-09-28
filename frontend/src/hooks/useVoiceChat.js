import { useState, useEffect, useRef } from 'react';
import voiceChatService from '../services/voiceChat';
import websocketService from '../services/websocket';

export const useVoiceChat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState(new Map());
  const [screenSharingUsers, setScreenSharingUsers] = useState([]);

  // Use refs to prevent infinite loops
  const handlersRef = useRef({});
  const mountedRef = useRef(true);

  useEffect(() => {
    // Voice service event handlers - Remove mounted check
    const handleConnected = ({ channelId }) => {
      setIsConnected(true);
      setCurrentChannel(channelId);
      setError(null);
    };

    const handleDisconnected = ({ channelId }) => {
      setIsConnected(false);
      setCurrentChannel(null);
      setParticipants([]);
      setError(null);
    };

    const handleParticipantsChanged = (newParticipants) => {
      setParticipants(prev => {
        // Prevent unnecessary updates
        if (JSON.stringify(prev) === JSON.stringify(newParticipants)) {
          return prev;
        }
        return newParticipants;
      });
    };

    const handleMuteChanged = (muted) => {
      setIsMuted(muted);
    };

    const handleDeafenChanged = (deafened) => {
      setIsDeafened(deafened);
    };

    // WebSocket event handlers with throttling
    let updateTimeout;
    const handleVoiceChannelUpdate = (data) => {
      if (!mountedRef.current) return;
      
      // Throttle updates to prevent stack overflow
      if (updateTimeout) clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        const { channelId, users, action, userId } = data;
        
        // Update participants based on server data with full user info
        const newParticipants = users.map(userInfo => {
          // Handle both old format (userId string) and new format (user object)
          if (typeof userInfo === 'string') {
            return {
              user: { id: userInfo, username: 'Unknown User' },
              isMuted: false,
              isDeafened: false,
              isCurrentUser: userInfo === voiceChatService.currentUserId,
              isSpeaking: false
            };
          } else {
            // New format with full user details
            return {
              user: {
                id: userInfo.id || userInfo._id,
                _id: userInfo._id || userInfo.id,
                username: userInfo.username || 'Unknown User',
                displayName: userInfo.displayName || userInfo.username || 'Unknown User',
                avatar: userInfo.avatar,
                status: userInfo.status
              },
              isMuted: userInfo.isMuted || false,
              isDeafened: userInfo.isDeafened || false,
              isCurrentUser: userInfo.isCurrentUser || (userInfo.id === voiceChatService.currentUserId),
              isSpeaking: userInfo.isSpeaking || false
            };
          }
        });
        
        setParticipants(newParticipants);
        
        // If current user left, disconnect
        if (action === 'leave' && userId === voiceChatService.currentUserId) {
          setIsConnected(false);
          setCurrentChannel(null);
          setParticipants([]);
        }
      }, 50); // 50ms throttle
    };

    // Store handlers in ref to prevent recreation
    handlersRef.current = {
      handleConnected,
      handleDisconnected,
      handleParticipantsChanged,
      handleMuteChanged,
      handleDeafenChanged,
      handleVoiceChannelUpdate
    };

    // Add voice service listeners
    voiceChatService.on('connected', handleConnected);
    voiceChatService.on('disconnected', handleDisconnected);
    voiceChatService.on('participantsChanged', handleParticipantsChanged);
    voiceChatService.on('muteChanged', handleMuteChanged);
    voiceChatService.on('deafenChanged', handleDeafenChanged);

    // Add websocket listeners
    websocketService.on('voiceChannelUpdate', handleVoiceChannelUpdate);

    // Get initial state
    try {
      const state = voiceChatService.getState();
      setIsConnected(state.isConnected);
      setCurrentChannel(state.currentChannel);
      setParticipants(state.participants);
      setIsMuted(state.isMuted);
      setIsDeafened(state.isDeafened);
    } catch (error) {
      console.warn('Failed to get initial voice chat state:', error);
    }

    // Cleanup
    return () => {
      mountedRef.current = false;
      if (updateTimeout) clearTimeout(updateTimeout);
      
      const handlers = handlersRef.current;
      voiceChatService.off('connected', handlers.handleConnected);
      voiceChatService.off('disconnected', handlers.handleDisconnected);
      voiceChatService.off('participantsChanged', handlers.handleParticipantsChanged);
      voiceChatService.off('muteChanged', handlers.handleMuteChanged);
      voiceChatService.off('deafenChanged', handlers.handleDeafenChanged);
      websocketService.off('voiceChannelUpdate', handlers.handleVoiceChannelUpdate);
    };
  }, []); // Empty dependency array to run only once

  // Actions
  const joinChannel = async (channelId) => {
    try {
      setError(null);
      await voiceChatService.joinChannel(channelId);
    } catch (err) {
      console.error('Voice channel join error:', err);
      setError(err.message);
      throw err;
    }
  };

  const leaveChannel = async () => {
    try {
      setError(null);
      await voiceChatService.leaveChannel();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const toggleMute = () => {
    voiceChatService.toggleMute();
  };

  const toggleDeafen = () => {
    voiceChatService.toggleDeafen();
  };

  const clearError = () => {
    setError(null);
  };

  return {
    // State
    isConnected,
    currentChannel,
    participants,
    isMuted,
    isDeafened,
    error,
    isLoading,
    connectedUsers,
    remoteStreams,
    remoteScreenStreams,
    screenSharingUsers,
    
    // Actions
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    clearError,
    setParticipants
  };
};
