import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import voiceCallService from '../services/voiceCallService';

export const useVoiceCall = () => {
  const { socket } = useSocket();
  const [incomingCall, setIncomingCall] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [callState, setCallState] = useState('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Note: Voice call service is initialized in FluxyApp when socket is ready
  // No need to initialize here

  // Listen for incoming calls
  useEffect(() => {
    const handleIncomingCall = (data) => {
      setIncomingCall({
        type: 'incoming',
        userId: data.callerId,
        username: data.callerUsername,
        displayName: data.callerDisplayName,
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

    const handleRemoteMuteStatus = (data) => {
      setRemoteMuted(data.isMuted);
    };

    voiceCallService.on('incomingCall', handleIncomingCall);
    voiceCallService.on('callAccepted', handleCallAccepted);
    voiceCallService.on('callRejected', handleCallRejected);
    voiceCallService.on('callEnded', handleCallEnded);
    voiceCallService.on('callClosed', handleCallClosed);
    voiceCallService.on('remoteMuteStatus', handleRemoteMuteStatus);

    return () => {
      voiceCallService.off('incomingCall', handleIncomingCall);
      voiceCallService.off('callAccepted', handleCallAccepted);
      voiceCallService.off('callRejected', handleCallRejected);
      voiceCallService.off('callEnded', handleCallEnded);
      voiceCallService.off('callClosed', handleCallClosed);
      voiceCallService.off('remoteMuteStatus', handleRemoteMuteStatus);
    };
  }, []);

  // Initiate a call
  const initiateCall = useCallback(async (targetUserId, targetUsername, targetAvatar, callType = 'voice') => {
    // Check if voice call service is initialized
    if (!voiceCallService.socket) {
      console.error('❌ Voice call service not initialized');
      return { success: false, error: 'Lütfen birkaç saniye bekleyin ve tekrar deneyin' };
    }

    const result = await voiceCallService.initiateCall(targetUserId, callType);
    
    if (result.success) {
      const callData = {
        type: 'outgoing',
        userId: targetUserId,
        username: targetUsername,
        avatar: targetAvatar,
        callType
      };
      setCurrentCall(callData);
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
    try {
      voiceCallService.endCall(callDuration);
      setIncomingCall(null);
      setCurrentCall(null);
      setCallState('idle');
      setCallDuration(0);
      return { success: true };
    } catch (error) {
      console.error('Failed to end call:', error);
      return { success: false, error: error.message };
    }
  }, [callDuration]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const result = voiceCallService.toggleMute();
    setIsMuted(result.isMuted);
    return result;
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    return voiceCallService.toggleVideo();
  }, []);

  // Start screen share
  const startScreenShare = useCallback(async () => {
    try {
      const result = await voiceCallService.startScreenShare();
      if (result.success) {
        setIsScreenSharing(true);
      }
      return result;
    } catch (error) {
      console.error('Screen share error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Call duration timer
  useEffect(() => {
    if (callState !== 'connected') {
      setCallDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callState]);

  // Listen for screen share events
  useEffect(() => {
    const handleScreenShareEnded = () => {
      setIsScreenSharing(false);
    };

    voiceCallService.on('screenShareEnded', handleScreenShareEnded);

    return () => {
      voiceCallService.off('screenShareEnded', handleScreenShareEnded);
    };
  }, []);

  // Voice activity detection
  useEffect(() => {
    if (callState !== 'connected' || !currentCall) {
      setIsSpeaking(false);
      setRemoteSpeaking(false);
      return;
    }

    let audioContext;
    let analyser;
    let microphone;
    let animationFrameId;
    let lastSpeakingState = false;

    const startVoiceDetection = async () => {
      try {
        const stream = voiceCallService.localStream;
        if (!stream) return;

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;

        microphone.connect(analyser);

        // Use requestAnimationFrame instead of ScriptProcessorNode
        const detectVoice = () => {
          const array = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(array);
          const values = array.reduce((a, b) => a + b, 0);
          const average = values / array.length;

          // Threshold for voice detection (adjust as needed)
          const speaking = average > 20 && !isMuted;
          setIsSpeaking(speaking);

          // Send speaking status to backend if changed
          if (speaking !== lastSpeakingState) {
            lastSpeakingState = speaking;
            voiceCallService.sendSpeakingStatus(currentCall.userId, speaking);
          }

          // Continue detection loop
          animationFrameId = requestAnimationFrame(detectVoice);
        };

        // Start detection loop
        detectVoice();
      } catch (error) {
        console.error('Voice detection error:', error);
      }
    };

    startVoiceDetection();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (analyser) analyser.disconnect();
      if (microphone) microphone.disconnect();
      if (audioContext) audioContext.close();
    };
  }, [callState, isMuted, currentCall]);

  // Listen for remote speaking events
  useEffect(() => {
    const handleRemoteSpeaking = (data) => {
      setRemoteSpeaking(data.isSpeaking);
    };

    voiceCallService.on('remoteSpeaking', handleRemoteSpeaking);

    return () => {
      voiceCallService.off('remoteSpeaking', handleRemoteSpeaking);
    };
  }, []);

  return {
    incomingCall,
    currentCall,
    callState,
    isSpeaking,
    remoteSpeaking,
    isMuted,
    remoteMuted,
    callDuration,
    isScreenSharing,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare
  };
};

export default useVoiceCall;
