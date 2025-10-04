import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './useSocket';
import voiceCallService from '../services/voiceCallService';

export const useVoiceCall = () => {
  const { socket } = useSocket();
  const socketRef = useRef(socket);
  const [incomingCall, setIncomingCall] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [callState, setCallState] = useState('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);
  const speakingTimeoutRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false);

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
      console.error('❌ Voice call service not initialized', {
        hasSocket: !!socket,
        isConnected: socket?.connected,
        hasUser: !!voiceCallService.user
      });
      return { 
        success: false, 
        error: 'Bağlantı henüz hazır değil. Lütfen birkaç saniye bekleyin ve tekrar deneyin.' 
      };
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
    const handleScreenShareStarted = () => {
      setIsScreenSharing(true);
    };

    const handleScreenShareEnded = () => {
      setIsScreenSharing(false);
    };

    const handleRemoteScreenShareStarted = (data) => {
      console.log('🖥️ Remote user started screen sharing:', data);
      setRemoteScreenSharing(true);
    };

    const handleRemoteScreenShareStopped = (data) => {
      console.log('🖥️ Remote user stopped screen sharing:', data);
      setRemoteScreenSharing(false);
    };

    voiceCallService.on('screenShareStarted', handleScreenShareStarted);
    voiceCallService.on('screenShareEnded', handleScreenShareEnded);
    voiceCallService.on('remoteScreenShareStarted', handleRemoteScreenShareStarted);
    voiceCallService.on('remoteScreenShareStopped', handleRemoteScreenShareStopped);

    return () => {
      voiceCallService.off('screenShareStarted', handleScreenShareStarted);
      voiceCallService.off('screenShareEnded', handleScreenShareEnded);
      voiceCallService.off('remoteScreenShareStarted', handleRemoteScreenShareStarted);
      voiceCallService.off('remoteScreenShareStopped', handleRemoteScreenShareStopped);
    };
  }, []);

  // Voice activity detection
  useEffect(() => {
    // Early return if not in active call
    if (callState !== 'connected' || !currentCall) {
      setIsSpeaking(false);
      setRemoteSpeaking(false);
      return;
    }

    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let animationFrameId = null;
    let lastSpeakingState = false;
    let isActive = true; // Flag to prevent race conditions

    const startVoiceDetection = async () => {
      try {
        const stream = voiceCallService.localStream;
        if (!stream || !isActive) return;

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;

        microphone.connect(analyser);

        // Use requestAnimationFrame with throttling (10 FPS instead of 60 FPS)
        let lastCheckTime = 0;
        const checkInterval = 100; // 10 times per second (10 FPS)
        
        const detectVoice = (currentTime) => {
          // Stop if no longer active
          if (!isActive) {
            if (animationFrameId) {
              cancelAnimationFrame(animationFrameId);
              animationFrameId = null;
            }
            return;
          }

          // Throttle to 10 FPS for CPU optimization
          if (currentTime - lastCheckTime >= checkInterval) {
            try {
              const array = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(array);
              const values = array.reduce((a, b) => a + b, 0);
              const average = values / array.length;

              // Threshold for voice detection (adjust as needed)
              const speaking = average > 20 && !isMuted;
              
              // Only update if changed (prevent unnecessary re-renders)
              if (speaking !== lastSpeakingState && currentCall) {
                lastSpeakingState = speaking;
                setIsSpeaking(speaking);
                voiceCallService.sendSpeakingStatus(currentCall.userId, speaking);
              }
              
              lastCheckTime = currentTime;
            } catch (error) {
              // Ignore errors (e.g., analyser disconnected)
            }
          }

          // Continue detection loop only if still active
          if (isActive) {
            animationFrameId = requestAnimationFrame(detectVoice);
          }
        };

        // Start detection loop
        if (isActive) {
          detectVoice(0);
        }
      } catch (error) {
        console.error('Voice detection error:', error);
      }
    };

    startVoiceDetection();

    // Cleanup function - CRITICAL for stopping the loop
    return () => {
      isActive = false; // Stop the loop immediately
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      
      if (analyser) {
        try {
          analyser.disconnect();
        } catch (e) {}
        analyser = null;
      }
      
      if (microphone) {
        try {
          microphone.disconnect();
        } catch (e) {}
        microphone = null;
      }
      
      if (audioContext) {
        try {
          audioContext.close();
        } catch (e) {}
        audioContext = null;
      }
      
      setIsSpeaking(false);
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
    remoteScreenSharing,
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
