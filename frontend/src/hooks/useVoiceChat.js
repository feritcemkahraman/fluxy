import { useState, useEffect } from 'react';
import voiceChatService from '../services/voiceChat';
import websocketService from '../services/websocket';

export const useVoiceChat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Voice service event handlers
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
      setParticipants(newParticipants);
    };

    const handleMuteChanged = (muted) => {
      setIsMuted(muted);
    };

    const handleDeafenChanged = (deafened) => {
      setIsDeafened(deafened);
    };

    // WebSocket event handlers
    const handleVoiceChannelUpdate = (data) => {
      const { channelId, users, action, userId } = data;
      
      // Update participants based on server data
      const newParticipants = users.map(userId => ({
        user: { id: userId },
        isMuted: false,
        isDeafened: false
      }));
      
      setParticipants(newParticipants);
      
      // If current user left, disconnect
      if (action === 'leave' && userId === voiceChatService.currentUserId) {
        setIsConnected(false);
        setCurrentChannel(null);
        setParticipants([]);
      }
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
    const state = voiceChatService.getState();
    setIsConnected(state.isConnected);
    setCurrentChannel(state.currentChannel);
    setParticipants(state.participants);
    setIsMuted(state.isMuted);
    setIsDeafened(state.isDeafened);

    // Cleanup
    return () => {
      voiceChatService.off('connected', handleConnected);
      voiceChatService.off('disconnected', handleDisconnected);
      voiceChatService.off('participantsChanged', handleParticipantsChanged);
      voiceChatService.off('muteChanged', handleMuteChanged);
      voiceChatService.off('deafenChanged', handleDeafenChanged);
      websocketService.off('voiceChannelUpdate', handleVoiceChannelUpdate);
    };
  }, []);

  // Actions
  const joinChannel = async (channelId) => {
    try {
      setError(null);
      await voiceChatService.joinChannel(channelId);
    } catch (err) {
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
    
    // Actions
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    clearError
  };
};
