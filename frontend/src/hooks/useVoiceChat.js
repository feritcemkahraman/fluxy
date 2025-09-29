import { useState, useEffect, useRef, useCallback } from 'react';
import voiceChatService from '../services/voiceChat';
import websocketService from '../services/websocket';

export const useVoiceChat = () => {
  // State management
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

  // Refs for cleanup and preventing memory leaks
  const mountedRef = useRef(true);
  const updateTimeoutRef = useRef(null);

  // Screen sharing event handlers - Defined at component level
  const handleScreenShareStarted = useCallback((data) => {
    if (!mountedRef.current) return;
    
    console.log('🖥️ Screen share started:', data);
    const { userId, stream } = data;
    
    setScreenSharingUsers(prev => {
      if (!prev.includes(userId)) {
        return [...prev, userId];
      }
      return prev;
    });

    if (stream) {
      setRemoteScreenStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, stream);
        return newMap;
      });
    }
  }, []);

  const handleScreenShareStopped = useCallback((data) => {
    if (!mountedRef.current) return;
    
    console.log('🖥️ Screen share stopped:', data);
    const { userId } = data;
    
    setScreenSharingUsers(prev => prev.filter(id => id !== userId));
    setRemoteScreenStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
  }, []);

  // Voice service event handlers - Component level for clean scope
  const handleConnected = useCallback(({ channelId }) => {
    if (!mountedRef.current) return;
    setIsConnected(true);
    setCurrentChannel(channelId);
    setError(null);
  }, []);

  const handleDisconnected = useCallback(({ channelId }) => {
    if (!mountedRef.current) return;
    setIsConnected(false);
    setCurrentChannel(null);
    setParticipants([]);
    setError(null);
  }, []);

  const handleParticipantsChanged = useCallback((newParticipants) => {
    if (!mountedRef.current) return;
    setParticipants(prev => {
      // Prevent unnecessary updates
      if (JSON.stringify(prev) === JSON.stringify(newParticipants)) {
        return prev;
      }
      return newParticipants;
    });
  }, []);

  const handleMuteChanged = useCallback((muted) => {
    if (!mountedRef.current) return;
    setIsMuted(muted);
  }, []);

  const handleDeafenChanged = useCallback((deafened) => {
    if (!mountedRef.current) return;
    setIsDeafened(deafened);
  }, []);

  // WebSocket event handlers with throttling - Component level
  const handleVoiceChannelUpdate = useCallback((data) => {
    if (!mountedRef.current) return;
    
    // Throttle updates to prevent stack overflow
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => {
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
        setParticipants([]);
      }
    }, 50); // 50ms throttle
  }, []);

  useEffect(() => {


    // Setup event listeners
    voiceChatService.on('connected', handleConnected);
    voiceChatService.on('disconnected', handleDisconnected);
    voiceChatService.on('participantsChanged', handleParticipantsChanged);
    voiceChatService.on('muteChanged', handleMuteChanged);
    voiceChatService.on('deafenChanged', handleDeafenChanged);
    voiceChatService.on('screen-share-started', handleScreenShareStarted);
    voiceChatService.on('screen-share-stopped', handleScreenShareStopped);

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

    // Cleanup function
    return () => {
      mountedRef.current = false;
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Remove event listeners
      voiceChatService.off('connected', handleConnected);
      voiceChatService.off('disconnected', handleDisconnected);
      voiceChatService.off('participantsChanged', handleParticipantsChanged);
      voiceChatService.off('muteChanged', handleMuteChanged);
      voiceChatService.off('deafenChanged', handleDeafenChanged);
      voiceChatService.off('screen-share-started', handleScreenShareStarted);
      voiceChatService.off('screen-share-stopped', handleScreenShareStopped);
      websocketService.off('voiceChannelUpdate', handleVoiceChannelUpdate);
    };
  }, [
    handleConnected,
    handleDisconnected,
    handleParticipantsChanged,
    handleMuteChanged,
    handleDeafenChanged,
    handleScreenShareStarted,
    handleScreenShareStopped,
    handleVoiceChannelUpdate
  ]); // Dependencies for all handlers

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


  // Screen sharing actions
  const startScreenShare = async (options = {}) => {
    try {
      setError(null);
      console.log('🎯 useVoiceChat startScreenShare called with options:', options);
      const stream = await voiceChatService.startScreenShare(options);
      
      // Add current user to screen sharing users
      setScreenSharingUsers(prev => {
        const userId = voiceChatService.currentUserId;
        if (!prev.includes(userId)) {
          return [...prev, userId];
        }
        return prev;
      });

      // Add stream to remote streams for display
      setRemoteScreenStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(voiceChatService.currentUserId, stream);
        return newMap;
      });

      return stream;
    } catch (err) {
      console.error('Screen share start error:', err);
      setError(err.message);
      throw err;
    }
  };

  const stopScreenShare = async () => {
    try {
      setError(null);
      await voiceChatService.stopScreenShare();
      
      // Remove current user from screen sharing users
      setScreenSharingUsers(prev => 
        prev.filter(userId => userId !== voiceChatService.currentUserId)
      );

      // Remove stream from remote streams
      setRemoteScreenStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(voiceChatService.currentUserId);
        return newMap;
      });

      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const adjustScreenQuality = async (quality) => {
    try {
      await voiceChatService.adjustScreenQuality(quality);
    } catch (err) {
      console.warn('Quality adjustment failed:', err);
    }
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
    setParticipants,
    
    // Screen sharing actions
    startScreenShare,
    stopScreenShare,
    adjustScreenQuality
  };
};
