import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import voiceCallService from '../services/voiceCallService';

const VoiceCallModal = ({ isOpen, onClose, callData }) => {
  const [callState, setCallState] = useState('idle'); // idle, calling, ringing, connected
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [connectionState, setConnectionState] = useState('new');
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callTimerRef = useRef(null);

  // Initialize call state
  useEffect(() => {
    if (!isOpen || !callData) return;
    
    const state = voiceCallService.getCallState();
    setCallState(state.state);
    
    // Setup event listeners
    const handleCallRinging = () => {
      setCallState('calling');
    };
    
    const handleCallAccepted = () => {
      setCallState('connected');
      startCallTimer();
    };
    
    const handleCallRejected = () => {
      setCallState('rejected');
      setTimeout(() => {
        onClose();
      }, 2000);
    };
    
    const handleCallEnded = () => {
      stopCallTimer();
      onClose();
    };
    
    const handleLocalStream = (stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    };
    
    const handleRemoteStream = (stream) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(e => console.error('Audio play error:', e));
      }
      if (remoteVideoRef.current && callData.callType === 'video') {
        remoteVideoRef.current.srcObject = stream;
      }
    };
    
    const handleConnectionStateChange = (state) => {
      setConnectionState(state);
    };
    
    voiceCallService.on('callRinging', handleCallRinging);
    voiceCallService.on('callAccepted', handleCallAccepted);
    voiceCallService.on('callRejected', handleCallRejected);
    voiceCallService.on('callEnded', handleCallEnded);
    voiceCallService.on('callClosed', handleCallEnded);
    voiceCallService.on('localStream', handleLocalStream);
    voiceCallService.on('remoteStream', handleRemoteStream);
    voiceCallService.on('connectionStateChange', handleConnectionStateChange);
    
    return () => {
      voiceCallService.off('callRinging', handleCallRinging);
      voiceCallService.off('callAccepted', handleCallAccepted);
      voiceCallService.off('callRejected', handleCallRejected);
      voiceCallService.off('callEnded', handleCallEnded);
      voiceCallService.off('callClosed', handleCallEnded);
      voiceCallService.off('localStream', handleLocalStream);
      voiceCallService.off('remoteStream', handleRemoteStream);
      voiceCallService.off('connectionStateChange', handleConnectionStateChange);
    };
  }, [isOpen, callData, onClose]);

  // Call timer
  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle accept call
  const handleAccept = async () => {
    await voiceCallService.acceptCall();
  };

  // Handle reject call
  const handleReject = () => {
    voiceCallService.rejectCall();
    onClose();
  };

  // Handle end call
  const handleEndCall = () => {
    voiceCallService.endCall();
    stopCallTimer();
    onClose();
  };

  // Toggle mute
  const handleToggleMute = () => {
    const muted = voiceCallService.toggleMute();
    setIsMuted(muted);
  };

  // Toggle video
  const handleToggleVideo = () => {
    const videoOff = voiceCallService.toggleVideo();
    setIsVideoEnabled(!videoOff);
  };

  if (!callData) return null;

  const isIncoming = callData.type === 'incoming';
  const isOutgoing = callData.type === 'outgoing';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gray-900/95 backdrop-blur-xl border border-white/10 text-white p-0 overflow-hidden">
        {/* Video Container */}
        <div className="relative w-full h-96 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          {/* Remote Video (if video call) */}
          {callData.callType === 'video' && callState === 'connected' && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Avatar (if voice call or video not connected) */}
          {(callData.callType === 'voice' || callState !== 'connected') && (
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="w-32 h-32 border-4 border-white/20">
                <AvatarImage src={callData.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-4xl">
                  {callData.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {callData.username || 'Unknown User'}
                </h2>
                <p className="text-gray-400">
                  {callState === 'calling' && 'Aranıyor...'}
                  {callState === 'ringing' && 'Gelen Arama'}
                  {callState === 'connected' && formatDuration(callDuration)}
                  {callState === 'rejected' && 'Arama Reddedildi'}
                </p>
              </div>
            </div>
          )}
          
          {/* Local Video (small preview) */}
          {callData.callType === 'video' && callState === 'connected' && (
            <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Connection Status */}
          {callState === 'connected' && connectionState !== 'connected' && (
            <div className="absolute top-4 left-4 px-3 py-1 bg-yellow-600/80 rounded-full text-xs">
              Bağlanıyor...
            </div>
          )}
        </div>

        {/* Hidden audio element for remote audio */}
        <audio ref={remoteAudioRef} autoPlay />

        {/* Controls */}
        <div className="p-6 bg-gray-900/50 backdrop-blur-md">
          <div className="flex items-center justify-center space-x-4">
            {/* Incoming call buttons */}
            {isIncoming && callState === 'ringing' && (
              <>
                <Button
                  onClick={handleReject}
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
                <Button
                  onClick={handleAccept}
                  className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Phone className="w-6 h-6" />
                </Button>
              </>
            )}
            
            {/* Active call controls */}
            {(callState === 'calling' || callState === 'connected') && (
              <>
                {/* Mute button */}
                <Button
                  onClick={handleToggleMute}
                  className={`w-12 h-12 rounded-full ${
                    isMuted 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  } text-white`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                
                {/* Video button (if video call) */}
                {callData.callType === 'video' && (
                  <Button
                    onClick={handleToggleVideo}
                    className={`w-12 h-12 rounded-full ${
                      !isVideoEnabled 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    } text-white`}
                  >
                    {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </Button>
                )}
                
                {/* End call button */}
                <Button
                  onClick={handleEndCall}
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </>
            )}
          </div>
          
          {/* Call type indicator */}
          <div className="mt-4 text-center text-sm text-gray-400">
            {callData.callType === 'video' ? 'Görüntülü Arama' : 'Sesli Arama'}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceCallModal;
