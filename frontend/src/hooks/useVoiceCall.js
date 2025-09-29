import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import voiceCallService from '../services/voiceCallService';

export const useVoiceCall = () => {
  const { socket } = useSocket();
  const [incomingCall, setIncomingCall] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [callState, setCallState] = useState('idle');

  // Initialize voice call service with socket
  useEffect(() => {
    if (socket && socket.connected) {
      console.log('🎤 Initializing voice call service with socket');
      voiceCallService.initialize(socket);
    }
  }, [socket]);

  // Listen for incoming calls
  useEffect(() => {
    const handleIncomingCall = (data) => {
      setIncomingCall({
        type: 'incoming',
        userId: data.callerId,
        username: data.callerUsername,
        avatar: data.callerAvatar,
        callType: data.callType
      });
      setCallState('ringing');
    };

    const handleCallAccepted = (data) => {
      setCallState('connected');
    };

    const handleCallRejected = (data) => {
      setIncomingCall(null);
      setCurrentCall(null);
      setCallState('idle');
    };

    const handleCallEnded = (data) => {
      setIncomingCall(null);
      setCurrentCall(null);
      setCallState('idle');
    };

    const handleCallClosed = () => {
      setIncomingCall(null);
      setCurrentCall(null);
      setCallState('idle');
    };

    voiceCallService.on('incomingCall', handleIncomingCall);
    voiceCallService.on('callAccepted', handleCallAccepted);
    voiceCallService.on('callRejected', handleCallRejected);
    voiceCallService.on('callEnded', handleCallEnded);
    voiceCallService.on('callClosed', handleCallClosed);

    return () => {
      voiceCallService.off('incomingCall', handleIncomingCall);
      voiceCallService.off('callAccepted', handleCallAccepted);
      voiceCallService.off('callRejected', handleCallRejected);
      voiceCallService.off('callEnded', handleCallEnded);
      voiceCallService.off('callClosed', handleCallClosed);
    };
  }, []);

  // Initiate a call
  const initiateCall = useCallback(async (targetUserId, targetUsername, targetAvatar, callType = 'voice') => {
    // Check if socket is ready
    if (!socket || !socket.connected) {
      console.error('❌ Socket not connected, cannot initiate call');
      return { success: false, error: 'Socket not connected' };
    }

    // Ensure voice call service is initialized
    if (!voiceCallService.socket) {
      console.log('🔄 Re-initializing voice call service');
      voiceCallService.initialize(socket);
    }

    const result = await voiceCallService.initiateCall(targetUserId, callType);
    
    if (result.success) {
      setCurrentCall({
        type: 'outgoing',
        userId: targetUserId,
        username: targetUsername,
        avatar: targetAvatar,
        callType
      });
      setCallState('calling');
    }
    
    return result;
  }, [socket]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    const result = await voiceCallService.acceptCall();
    
    if (result.success) {
      setCurrentCall(incomingCall);
      setIncomingCall(null);
      setCallState('connected');
    }
    
    return result;
  }, [incomingCall]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    voiceCallService.rejectCall();
    setIncomingCall(null);
    setCallState('idle');
  }, []);

  // End current call
  const endCall = useCallback(() => {
    voiceCallService.endCall();
    setIncomingCall(null);
    setCurrentCall(null);
    setCallState('idle');
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    return voiceCallService.toggleMute();
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    return voiceCallService.toggleVideo();
  }, []);

  return {
    incomingCall,
    currentCall,
    callState,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo
  };
};

export default useVoiceCall;
