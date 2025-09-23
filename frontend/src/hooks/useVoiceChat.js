import { useState, useEffect, useCallback, useRef } from 'react';
import { voiceChatService } from '../services/voiceChat';

export const useVoiceChat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState(new Map());
  const [screenSharingUsers, setScreenSharingUsers] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [participants, setParticipants] = useState([]);
  
  // Store current user reference
  const currentUserRef = useRef(null);

  // Update state from service
  const updateStatus = useCallback(() => {
    const status = voiceChatService.getStatus();
    setIsConnected(status.isConnected);
    setCurrentChannel(status.currentChannel);
    setIsMuted(status.isMuted);
    setIsDeafened(status.isDeafened);
    setConnectedUsers(status.connectedUsers);
    setScreenSharingUsers(status.screenSharingUsers || []);
  }, []);

  useEffect(() => {
    // Set up event listeners
    const handleConnected = ({ channelId }) => {
      setIsConnected(true);
      setCurrentChannel(channelId);
      setIsLoading(false);
      setError(null);
      
      // Add current user to participants when connected
      const currentUserId = voiceChatService.currentUserId;
      if (currentUserId) {
        setParticipants([{
          user: { 
            _id: currentUserId, 
            id: currentUserId, 
            username: 'You', 
            displayName: 'You' 
          },
          isMuted,
          isDeafened,
          isCurrentUser: true,
          isSpeaking: false
        }]);
      }
    };

    const handleDisconnected = ({ channelId }) => {
      setIsConnected(false);
      setCurrentChannel(null);
      setIsLoading(false);
      setRemoteStreams(new Map());
      setRemoteScreenStreams(new Map());
      setConnectedUsers([]);
      setScreenSharingUsers([]);
      setParticipants([]); // Clear participants on disconnect
    };

    const handleError = (errorMessage) => {
      setError(errorMessage);
      setIsLoading(false);
    };

    const handleUserJoinedVoice = ({ userId, channelId, username }) => {
      setParticipants(prev => {
        const existingIndex = prev.findIndex(p => (p.user._id || p.user.id) === userId);
        if (existingIndex >= 0) {
          return prev; // Already exists
        }
        
        const currentUserId = voiceChatService.currentUserId;
        const isCurrentUser = currentUserId === userId;
        
        const newParticipant = {
          user: { 
            _id: userId, 
            id: userId, 
            username: isCurrentUser ? 'You' : (username || 'Unknown'), 
            displayName: isCurrentUser ? 'You' : (username || 'Unknown') 
          },
          isMuted: false,
          isDeafened: false,
          isCurrentUser: isCurrentUser,
          isSpeaking: false
        };
        
        return [...prev, newParticipant];
      });
    };

    const handleUserLeftVoice = ({ userId, channelId }) => {
      setParticipants(prev => prev.filter(p => (p.user._id || p.user.id) !== userId));
    };

    const handleRemoteStream = ({ userId, stream }) => {
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.set(userId, stream);
        return newStreams;
      });
    };

    const handleMuteChanged = ({ isMuted }) => {
      setIsMuted(isMuted);
    };

    const handleDeafenChanged = ({ isDeafened }) => {
      setIsDeafened(isDeafened);
    };

    const handleRemoteScreenStream = ({ userId, stream }) => {
      setRemoteScreenStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.set(userId, stream);
        return newStreams;
      });
    };

    const handleUserStartedScreenShare = ({ userId }) => {
      setScreenSharingUsers(prev => [...prev.filter(id => id !== userId), userId]);
    };

    const handleUserStoppedScreenShare = ({ userId }) => {
      setScreenSharingUsers(prev => prev.filter(id => id !== userId));
      setRemoteScreenStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.delete(userId);
        return newStreams;
      });
    };

    const handleSpeakingChanged = ({ userId, isSpeaking }) => {
      setParticipants(prev => prev.map(participant =>
        participant.user._id === userId || participant.user.id === userId
          ? { ...participant, isSpeaking }
          : participant
      ));
    };

    // Register event listeners
    voiceChatService.on('connected', handleConnected);
    voiceChatService.on('disconnected', handleDisconnected);
    voiceChatService.on('error', handleError);
    voiceChatService.on('userJoinedVoice', handleUserJoinedVoice);
    voiceChatService.on('userLeftVoice', handleUserLeftVoice);
    voiceChatService.on('user-joined', handleUserJoined);
    voiceChatService.on('user-left', handleUserLeft);
    voiceChatService.on('remote-stream', handleRemoteStream);
    voiceChatService.on('remote-screen-stream', handleRemoteScreenStream);
    voiceChatService.on('user-started-screen-share', handleUserStartedScreenShare);
    voiceChatService.on('user-stopped-screen-share', handleUserStoppedScreenShare);
    voiceChatService.on('speaking-changed', handleSpeakingChanged);
    voiceChatService.on('mute-changed', handleMuteChanged);
    voiceChatService.on('deafen-changed', handleDeafenChanged);

    // Initialize status
    updateStatus();

    // Cleanup
    return () => {
      voiceChatService.off('connected', handleConnected);
      voiceChatService.off('disconnected', handleDisconnected);
      voiceChatService.off('error', handleError);
      voiceChatService.off('userJoinedVoice', handleUserJoinedVoice);
      voiceChatService.off('userLeftVoice', handleUserLeftVoice);
      voiceChatService.off('user-joined', handleUserJoined);
      voiceChatService.off('user-left', handleUserLeft);
      voiceChatService.off('remote-stream', handleRemoteStream);
      voiceChatService.off('remote-screen-stream', handleRemoteScreenStream);
      voiceChatService.off('user-started-screen-share', handleUserStartedScreenShare);
      voiceChatService.off('user-stopped-screen-share', handleUserStoppedScreenShare);
      voiceChatService.off('speaking-changed', handleSpeakingChanged);
      voiceChatService.off('mute-changed', handleMuteChanged);
      voiceChatService.off('deafen-changed', handleDeafenChanged);
    };
  }, [updateStatus]);

  // Join voice channel
  const joinChannel = useCallback(async (channelId) => {
    try {
      setIsLoading(true);
      setError(null);
      await voiceChatService.joinChannel(channelId);
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
    }
  }, []);

  // Leave voice channel
  const leaveChannel = useCallback(async () => {
    try {
      setIsLoading(true);
      await voiceChatService.leaveChannel();
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    voiceChatService.toggleMute();
  }, []);

  // Toggle deafen
  const toggleDeafen = useCallback(() => {
    voiceChatService.toggleDeafen();
  }, []);

  return {
    // State
    isConnected,
    currentChannel,
    isMuted,
    isDeafened,
    connectedUsers,
    remoteStreams,
    remoteScreenStreams,
    screenSharingUsers,
    participants,
    error,
    isLoading,

    // Actions
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    setParticipants,
    clearError: () => setError(null)
  };
};
