import React, { useState, useRef, useEffect, useMemo, memo, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { 
  Phone, 
  PhoneOff,
  Video, 
  UserPlus, 
  Search, 
  MoreHorizontal,
  Users,
  Mic,
  MicOff
} from "lucide-react";

import { useDirectMessages } from '../hooks/useDirectMessages';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import notificationSound from '../../../utils/notificationSound';
import voiceCallService from '../../../services/voiceCallService';
import ScreenSharePicker from '../../../components/ScreenSharePicker';

/**
 * DirectMessageChat Component - Discord Style
 * Refactored to use new Messages feature module
 * Optimized with React.memo to prevent unnecessary re-renders
 */
const DirectMessageChat = memo(({ conversation, initiateVoiceCall, currentCall, callState, endCall, toggleMute, isSpeaking, remoteSpeaking, isMuted, remoteMuted, callDuration, isScreenSharing, remoteScreenSharing: remoteScreenSharingProp, startScreenShare }) => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showScreenSharePicker, setShowScreenSharePicker] = useState(false);
  const [isScreenShareFullscreen, setIsScreenShareFullscreen] = useState(false);
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false);
  const screenShareVideoRef = useRef(null);
  const fullscreenVideoRef = useRef(null);
  const frameThrottleRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const targetFPS = 15; // Discord-like FPS

  const conversationId = conversation?.id || conversation?._id;
  const otherUser = conversation?.participants?.find(p => p.id !== user?.id) || 
                   conversation?.participants?.find(p => p._id !== user?.id) || 
                   conversation?.user; // Fallback to conversation.user

  const otherUserDetails = useMemo(() => ({
    id: otherUser?.id || otherUser?._id,
    username: otherUser?.username,
    displayName: otherUser?.displayName,
    status: otherUser?.status
  }), [otherUser]);

  // Format call duration (MM:SS)
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Listen for screen share stream (LOCAL and REMOTE)
  useEffect(() => {
    // LOCAL screen share started (already optimized by OptimizedScreenShare)
    const handleScreenShareStarted = (stream) => {
      console.log('📺 LOCAL screen share stream received (optimized):', stream);
      
      // Set stream to both video elements
      if (screenShareVideoRef.current) {
        screenShareVideoRef.current.srcObject = stream;
        screenShareVideoRef.current.play().catch(e => console.error('Video play error:', e));
      }
      
      if (fullscreenVideoRef.current) {
        fullscreenVideoRef.current.srcObject = stream;
        fullscreenVideoRef.current.play().catch(e => console.error('Fullscreen video play error:', e));
      }
    };

    const handleScreenShareEnded = () => {
      console.log('📺 Screen share ended');
      if (screenShareVideoRef.current) {
        screenShareVideoRef.current.srcObject = null;
      }
      if (fullscreenVideoRef.current) {
        fullscreenVideoRef.current.srcObject = null;
      }
    };

    // REMOTE screen share started
    const handleRemoteScreenShareStarted = (data) => {
      console.log('📺 REMOTE screen share started:', data);
      setRemoteScreenSharing(true);
    };

    const handleRemoteScreenShareStopped = (data) => {
      console.log('📺 REMOTE screen share stopped:', data);
      setRemoteScreenSharing(false);
      // Clear video elements
      if (screenShareVideoRef.current) {
        screenShareVideoRef.current.srcObject = null;
      }
      if (fullscreenVideoRef.current) {
        fullscreenVideoRef.current.srcObject = null;
      }
    };

    // REMOTE stream updated (includes screen share track)
    const handleRemoteStream = (stream) => {
      console.log('📺 Remote stream updated:', stream);
      
      // Check if stream has video track (screen share)
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        console.log('📺 Setting REMOTE screen share stream');
        
        if (screenShareVideoRef.current) {
          screenShareVideoRef.current.srcObject = stream;
          screenShareVideoRef.current.play().catch(e => console.error('Video play error:', e));
        }
        if (fullscreenVideoRef.current) {
          fullscreenVideoRef.current.srcObject = stream;
          fullscreenVideoRef.current.play().catch(e => console.error('Fullscreen video play error:', e));
        }
      }
    };

    voiceCallService.on('screenShareStarted', handleScreenShareStarted);
    voiceCallService.on('screenShareEnded', handleScreenShareEnded);
    voiceCallService.on('remoteScreenShareStarted', handleRemoteScreenShareStarted);
    voiceCallService.on('remoteScreenShareStopped', handleRemoteScreenShareStopped);
    voiceCallService.on('remoteStream', handleRemoteStream);

    // Check if there's already an active screen stream (LOCAL)
    if (voiceCallService.screenStream && isScreenSharing) {
      console.log('📺 Setting existing LOCAL screen stream');
      if (screenShareVideoRef.current) {
        screenShareVideoRef.current.srcObject = voiceCallService.screenStream;
        screenShareVideoRef.current.play().catch(e => console.error('Video play error:', e));
      }
      if (fullscreenVideoRef.current) {
        fullscreenVideoRef.current.srcObject = voiceCallService.screenStream;
        fullscreenVideoRef.current.play().catch(e => console.error('Fullscreen video play error:', e));
      }
    }

    // Check if there's already a remote stream with video (REMOTE screen share)
    if (voiceCallService.remoteStream) {
      console.log('📺 Setting existing REMOTE screen stream');
      const videoTracks = voiceCallService.remoteStream.getVideoTracks();
      if (videoTracks.length > 0) {
        if (screenShareVideoRef.current) {
          screenShareVideoRef.current.srcObject = voiceCallService.remoteStream;
          screenShareVideoRef.current.play().catch(e => console.error('Video play error:', e));
        }
        if (fullscreenVideoRef.current) {
          fullscreenVideoRef.current.srcObject = voiceCallService.remoteStream;
          fullscreenVideoRef.current.play().catch(e => console.error('Fullscreen video play error:', e));
        }
      }
    }

    return () => {
      voiceCallService.off('screenShareStarted', handleScreenShareStarted);
      voiceCallService.off('screenShareEnded', handleScreenShareEnded);
      voiceCallService.off('remoteScreenShareStarted', handleRemoteScreenShareStarted);
      voiceCallService.off('remoteScreenShareStopped', handleRemoteScreenShareStopped);
      voiceCallService.off('remoteStream', handleRemoteStream);
    };
  }, [isScreenSharing]);

  // Handle fullscreen video stream
  useEffect(() => {
    if (isScreenShareFullscreen && fullscreenVideoRef.current) {
      const stream = voiceCallService.screenStream || voiceCallService.remoteStream;
      if (stream && fullscreenVideoRef.current.srcObject !== stream) {
        fullscreenVideoRef.current.srcObject = stream;
        fullscreenVideoRef.current.play().catch(e => console.error('Fullscreen video play error:', e));
      }
    }
  }, [isScreenShareFullscreen, isScreenSharing, remoteScreenSharing]);

  const {
    messages,
    isLoading,
    error,
    typingUsers,
    sendDirectMessage,
    clearError
  } = useDirectMessages(conversationId);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Set active conversation for notification sound
  useEffect(() => {
    if (conversationId) {
      notificationSound.setActiveConversation(String(conversationId));
    }
    
    return () => {
      notificationSound.clearActiveConversation();
    };
  }, [conversationId]);

  // Handle scroll to show/hide scroll button
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  // Handle send message with optimistic updates (from memory)
  const handleSendMessage = async ({ content, attachments, replyTo }) => {
    if (!otherUser || !content.trim()) {
      return { success: false };
    }

    try {
      const result = await sendDirectMessage(content, otherUser.id || otherUser._id);
      
      // Message send result handled silently

      return result;
    } catch (error) {
      console.error('Send message error:', error);
      return { success: false, error: error.message };
    }
  };

  // Handle message actions
  const handleReply = (message) => {
    // This will be handled by MessageInput
    console.log('Reply to message:', message);
  };

  const handleReaction = (messageId, emoji) => {
    // TODO: Implement reaction functionality
    console.log('Add reaction:', messageId, emoji);
  };

  const handleRetry = (messageId) => {
    // TODO: Implement retry functionality
    console.log('Retry message:', messageId);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-400">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Bir sohbet seçin</h3>
          <p>Mesajlaşmaya başlamak için sol panelden bir sohbet seçin</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner message="Mesajlar yükleniyor..." />;
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pl-16 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {otherUser?.displayName?.charAt(0) || otherUser?.username?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h3 className="text-white font-semibold">
              {otherUser?.displayName || otherUser?.username || 'Unknown User'}
            </h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                otherUser?.status === 'online' ? 'bg-green-500' : 
                otherUser?.status === 'idle' ? 'bg-yellow-500' : 
                otherUser?.status === 'dnd' ? 'bg-red-500' : 'bg-gray-500'
              }`} />
              <span className="text-xs text-gray-400">
                {otherUser?.status === 'online' && 'Çevrimiçi'}
                {otherUser?.status === 'idle' && 'Boşta'}
                {otherUser?.status === 'dnd' && 'Rahatsız Etmeyin'}
                {otherUser?.status === 'invisible' && 'Görünmez'}
                {(!otherUser?.status || otherUser?.status === 'offline') && 'Çevrimdışı'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-400 hover:text-white bg-gray-700/30 hover:bg-gray-600/50 transition-all duration-200"
            onClick={async () => {
              if (!initiateVoiceCall) {
                toast.error('Arama özelliği yükleniyor...');
                return;
              }
              const result = await initiateVoiceCall(
                otherUser?.id || otherUser?._id,
                otherUser?.displayName || otherUser?.username,
                otherUser?.avatar,
                'voice'
              );
              if (!result.success) {
                toast.error(result.error || 'Arama başlatılamadı');
              }
            }}
            title="Sesli Arama"
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-400 hover:text-white bg-gray-700/30 hover:bg-gray-600/50 transition-all duration-200"
            onClick={async () => {
              if (!initiateVoiceCall) {
                toast.error('Arama özelliği yükleniyor...');
                return;
              }
              const result = await initiateVoiceCall(
                otherUser?.id || otherUser?._id,
                otherUser?.displayName || otherUser?.username,
                otherUser?.avatar,
                'video'
              );
              if (!result.success) {
                toast.error(result.error || 'Arama başlatılamadı');
              }
            }}
            title="Görüntülü Arama"
          >
            <Video className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-400 hover:text-white bg-gray-700/30 hover:bg-gray-600/50 transition-all duration-200"
            title="Kullanıcı Ekle"
          >
            <UserPlus className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-400 hover:text-white bg-gray-700/30 hover:bg-gray-600/50 transition-all duration-200"
            title="Ara"
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-400 hover:text-white bg-gray-700/30 hover:bg-gray-600/50 transition-all duration-200"
            title="Daha Fazla"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/20 border-b border-red-500/30">
          <div className="flex items-center justify-between">
            <span className="text-red-400 text-sm">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="text-red-400 hover:text-red-300"
            >
              Kapat
            </Button>
          </div>
        </div>
      )}

      {/* Voice Call Banner - Discord Style with User Cards */}
      {currentCall && currentCall.userId === (otherUser?.id || otherUser?._id) && (
        <div className="bg-[#030403] border-b border-gray-900/50 px-6 py-6">
          {/* User Cards Container - Wider when screen sharing */}
          <div className={`flex items-center justify-center gap-4 mb-6 ${(isScreenSharing || remoteScreenSharing) ? 'max-w-6xl mx-auto' : ''}`}>
            {/* Current User Card - Expands when screen sharing */}
            <div className={`relative transition-all duration-300 ${isScreenSharing ? 'flex-1' : ''}`}>
              <div className={`relative ${isScreenSharing ? 'w-full h-96' : 'w-64 h-52'} bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
                isSpeaking ? 'ring-4 ring-green-500 ring-opacity-75' : isScreenSharing ? 'border-2 border-green-500/50' : 'border-2 border-gray-700/50'
              }`}>
                {/* Speaking indicator - shows when user is speaking */}
                {isSpeaking && !isScreenSharing && (
                  <div className="absolute inset-0 rounded-xl border-2 border-green-500 animate-pulse pointer-events-none" />
                )}
                
                {/* Screen Share Video */}
                {isScreenSharing ? (
                  <>
                    <video
                      ref={screenShareVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain bg-black"
                      style={{
                        willChange: 'transform',
                        transform: 'translateZ(0)',
                        backfaceVisibility: 'hidden',
                        perspective: 1000,
                        imageRendering: 'optimizeSpeed',
                        maxWidth: '1280px',
                        maxHeight: '720px'
                      }}
                    />
                    
                    {/* Screen Share Controls Overlay */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-white text-sm font-medium">Ekran Paylaşımı</span>
                      </div>
                      
                      <button
                        onClick={() => setIsScreenShareFullscreen(true)}
                        className="bg-black/70 backdrop-blur-sm hover:bg-black/90 rounded-lg p-2 transition-colors"
                        title="Tam Ekran"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* User Info Overlay */}
                    <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {user?.displayName?.charAt(0) || user?.username?.charAt(0) || 'M'}
                        </span>
                      </div>
                      <span className="text-white text-sm font-medium">
                        {user?.displayName || user?.username || 'Me'}
                      </span>
                      {isMuted && <MicOff className="w-4 h-4 text-red-500" />}
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center py-4">
                    <div className="relative">
                      {user?.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.displayName || user.username}
                          className="w-36 h-36 mb-3 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-36 h-36 mb-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white text-5xl font-bold">
                            {user?.displayName?.charAt(0) || user?.username?.charAt(0) || 'M'}
                          </span>
                        </div>
                      )}
                      
                      {/* Mute indicator */}
                      {isMuted && (
                        <div className="absolute bottom-2 right-2 bg-red-600 rounded-full p-2 border-2 border-white shadow-lg">
                          <MicOff className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-white text-base font-bold text-center drop-shadow-2xl px-4 w-full">
                      {user?.displayName || user?.username || 'Me'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Other User Card - Only show when connected - Expands when remote screen sharing */}
            {callState === 'connected' && (
              <div className={`relative transition-all duration-300 ${remoteScreenSharing ? 'flex-1' : ''}`}>
                <div className={`relative ${remoteScreenSharing ? 'w-full h-96' : 'w-64 h-52'} bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
                  remoteSpeaking ? 'ring-4 ring-green-500 ring-opacity-75' : remoteScreenSharing ? 'border-2 border-blue-500/50' : 'border-2 border-gray-700/50'
                }`}>
                  {/* Speaking indicator - shows when remote user is speaking */}
                  {remoteSpeaking && !remoteScreenSharing && (
                    <div className="absolute inset-0 rounded-xl border-2 border-green-500 animate-pulse pointer-events-none" />
                  )}
                  
                  {/* Remote Screen Share Video */}
                  {remoteScreenSharing ? (
                    <>
                      <video
                        ref={screenShareVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain bg-black"
                        style={{
                          willChange: 'transform',
                          transform: 'translateZ(0)',
                          backfaceVisibility: 'hidden',
                          perspective: 1000,
                          imageRendering: 'optimizeSpeed',
                          maxWidth: '1280px',
                          maxHeight: '720px'
                        }}
                      />
                      
                      {/* Remote Screen Share Indicator */}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          <span className="text-white text-sm font-medium">{otherUser?.displayName || otherUser?.username} Ekran Paylaşıyor</span>
                        </div>
                        
                        <button
                          onClick={() => setIsScreenShareFullscreen(true)}
                          className="bg-black/70 backdrop-blur-sm hover:bg-black/90 rounded-lg p-2 transition-colors"
                          title="Tam Ekran"
                        >
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* User Info Overlay */}
                      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
                        <p className="text-white text-sm font-medium">
                          {otherUser?.displayName || otherUser?.username}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center py-4">
                    <div className="relative">
                      {otherUser?.avatar ? (
                        <img 
                          src={otherUser.avatar} 
                          alt={otherUser.displayName || otherUser.username}
                          className="w-36 h-36 mb-3 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-36 h-36 mb-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                          <span className="text-white text-5xl font-bold">
                            {otherUser?.displayName?.charAt(0) || otherUser?.username?.charAt(0) || 'U'}
                          </span>
                        </div>
                      )}
                      
                      {/* Remote user mute indicator */}
                      {remoteMuted && (
                        <div className="absolute bottom-2 right-2 bg-red-600 rounded-full p-2 border-2 border-white shadow-lg">
                          <MicOff className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-white text-base font-bold text-center drop-shadow-2xl px-4 w-full">
                      {otherUser?.displayName || otherUser?.username || 'User'}
                    </p>
                  </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-3">
            {/* Video Toggle */}
            <button
              onClick={() => {
                if (toggleMute) {
                  // Video toggle functionality - placeholder
                  console.log('Video toggle');
                }
              }}
              className="w-11 h-11 rounded-full bg-[#2b2d31] hover:bg-gray-700 flex items-center justify-center transition-all duration-200"
              title="Video"
            >
              <Video className="w-5 h-5 text-white" />
            </button>

            {/* Screen Share */}
            <button
              onClick={() => {
                if (isScreenSharing) {
                  // Stop screen share
                  voiceCallService.stopScreenShare();
                } else {
                  // Open screen share picker
                  setShowScreenSharePicker(true);
                }
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                isScreenSharing 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-[#2b2d31] hover:bg-gray-700'
              }`}
              title={isScreenSharing ? 'Ekran Paylaşımını Durdur' : 'Ekran Paylaş'}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Mute Toggle */}
            <button
              onClick={() => {
                if (toggleMute) {
                  toggleMute();
                }
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                isMuted 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-[#2b2d31] hover:bg-gray-700'
              }`}
              title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
            >
              {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
            </button>

            {/* End Call */}
            <button
              onClick={() => {
                if (!endCall) {
                  return;
                }
                endCall();
              }}
              className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all duration-200 shadow-lg"
              title="Aramayı Sonlandır"
            >
              <PhoneOff className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Status Text with Duration */}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-400 font-medium">
              {callState === 'calling' && 'Aranıyor...'}
              {callState === 'ringing' && 'Çalıyor...'}
              {callState === 'connected' && (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Sesli Arama Aktif</span>
                  <span className="text-green-400">• {formatDuration(callDuration)}</span>
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">
                  {otherUser?.displayName?.charAt(0) || otherUser?.username?.charAt(0) || 'U'}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {otherUser?.displayName || otherUser?.username || 'Unknown User'}
              </h3>
              <p className="text-sm">
                Bu, {otherUser?.displayName || otherUser?.username} ile direkt mesajlaşmanızın başlangıcı.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 flex flex-col">
            {messages.map((message, index) => {
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
              
              // Check if this message should be grouped with previous
              const prevAuthorId = prevMessage?.author?.id || prevMessage?.author?._id;
              const currentAuthorId = message.author?.id || message.author?._id;
              const nextAuthorId = nextMessage?.author?.id || nextMessage?.author?._id;
              
              const shouldGroup = prevMessage && 
                prevAuthorId === currentAuthorId &&
                (new Date(message.createdAt || message.timestamp) - new Date(prevMessage.createdAt || prevMessage.timestamp)) < 5 * 60 * 1000; // 5 minutes
              
              // Check if next message is from same author
              const isLastInGroup = !nextMessage || 
                nextAuthorId !== currentAuthorId ||
                (new Date(nextMessage.createdAt || nextMessage.timestamp) - new Date(message.createdAt || message.timestamp)) >= 5 * 60 * 1000;
              
              return (
                <MessageItem
                  key={message.id || message._id || `msg-${Date.now()}-${Math.random()}`}
                  message={message}
                  currentUser={user}
                  onReply={handleReply}
                  onReaction={handleReaction}
                  onRetry={handleRetry}
                  showAvatar={!shouldGroup}
                  compact={shouldGroup}
                  isLastInGroup={isLastInGroup}
                />
              );
            })}
            
            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center space-x-2 px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-gray-400 text-sm">
                  {typingUsers.map(u => u.username).join(', ')} yazıyor...
                </span>
              </div>
            )}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <div className="absolute bottom-20 right-8">
          <Button
            onClick={scrollToBottom}
            className="rounded-full w-10 h-10 bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            ↓
          </Button>
        </div>
      )}

      {/* Message Input */}
      <MessageInput
        onSend={handleSendMessage}
        conversationId={conversationId}
        placeholder={`${otherUser?.displayName || otherUser?.username || 'kullanıcı'}ya mesaj gönder`}
        currentUser={user}
      />

      {/* Screen Share Picker Modal */}
      {showScreenSharePicker && (
        <ScreenSharePicker
          isOpen={showScreenSharePicker}
          onClose={() => setShowScreenSharePicker(false)}
          onSelect={async (options) => {
            try {
              const result = await voiceCallService.startScreenShare(options);
              if (result.success) {
                setShowScreenSharePicker(false);
              }
            } catch (error) {
              console.error('Screen share error:', error);
            }
          }}
        />
      )}

      {/* Fullscreen Screen Share Modal */}
      {isScreenShareFullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <video
            ref={fullscreenVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
            style={{
              willChange: 'transform',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}
          />
          
          {/* Close Fullscreen Button */}
          <button
            onClick={() => setIsScreenShareFullscreen(false)}
            className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm hover:bg-black/90 rounded-lg p-3 transition-colors"
            title="Tam Ekrandan Çık"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* User Info Overlay */}
          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-lg font-bold">
                {user?.displayName?.charAt(0) || user?.username?.charAt(0) || 'M'}
              </span>
            </div>
            <div>
              <p className="text-white font-medium">{user?.displayName || user?.username || 'Me'}</p>
              <p className="text-gray-400 text-sm">Ekran paylaşımı</p>
            </div>
            {isMuted && <MicOff className="w-5 h-5 text-red-500" />}
          </div>
        </div>
      )}
    </div>
  );
});

// Display name for debugging
DirectMessageChat.displayName = 'DirectMessageChat';

export default DirectMessageChat;
