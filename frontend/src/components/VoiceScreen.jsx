import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  Mic,
  MicOff,
  Headphones,
  HeadphonesIcon,
  PhoneOff,
  Monitor,
  Settings,
  X,
  Maximize2,
  Minimize2,
  Volume2
} from "lucide-react";
import { useVoiceChat } from "../hooks/useVoiceChat";
import { useAuth } from "../context/AuthContext";
import voiceChatService from "../services/voiceChat";
import { useAudio } from "../hooks/useAudio";
import { serverAPI } from "../services/api";
import ScreenSharePicker from "./ScreenSharePicker";
import electronAPI from "../utils/electronAPI";

const VoiceScreen = ({ channel, server, servers = [], voiceChannelUsers = [], onClose }) => {
  const { user: currentUser } = useAuth();
  const { playVoiceLeave } = useAudio();
  
  // Find server if not provided - fallback mechanism
  const effectiveServer = server || (servers.length > 0 && channel ? 
    servers.find(s => s.channels?.some(ch => (ch._id || ch.id) === (channel._id || channel.id))) : 
    null
  );
  
  const {
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
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    clearError,
    setParticipants,
    startScreenShare,
    stopScreenShare,
    adjustScreenQuality
  } = useVoiceChat();

  const [expandedScreenShare, setExpandedScreenShare] = useState(null);
  const [screenShareVideos, setScreenShareVideos] = useState(new Map());
  const [missingUsers, setMissingUsers] = useState(new Map()); // Cache for fetched user data
  const [showScreenPicker, setShowScreenPicker] = useState(false);

  // Effect to fetch missing user data
  useEffect(() => {
    const fetchMissingUsers = async () => {
      if (!effectiveServer?._id || !Array.isArray(voiceChannelUsers) || voiceChannelUsers.length === 0) return;
      
      const userMap = new Map();
      effectiveServer.members?.forEach(member => {
        const userId = member.user?._id || member.user?.id || member._id || member.id;
        const userObj = member.user || member;
        userMap.set(userId, userObj);
      });

      const missingUserIds = voiceChannelUsers.filter(userId => !userMap.has(userId));
      
      if (missingUserIds.length > 0) {
        
        try {
          // Refresh server members to get latest data including new users
          const response = await serverAPI.getServerMembers(effectiveServer._id || effectiveServer.id);
          if (response.data.members) {
            // Update the server prop would require parent component to handle
            // For now, we'll store the missing users locally
            const fetchedUsers = new Map();
            response.data.members.forEach(member => {
              const userId = member.user?._id || member.user?.id || member._id || member.id;
              const userObj = member.user || member;
              if (missingUserIds.includes(userId)) {
                fetchedUsers.set(userId, userObj);
              }
            });
            
            setMissingUsers(prev => new Map([...prev, ...fetchedUsers]));
          }
        } catch (error) {
          console.warn('Failed to fetch missing users:', error);
        }
      }
    };

  }, [effectiveServer?._id, effectiveServer?.id, voiceChannelUsers, effectiveServer?.members]);

  // Simplified useEffect - always show current user when connected
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isConnected && currentUser && currentChannel === channel?._id) {
        // Always ensure current user is shown when connected
        const currentUserParticipant = {
          user: currentUser,
          isMuted: isMuted,
          isDeafened: isDeafened,
          isMuted,
          isDeafened,
          isCurrentUser: true,
          isSpeaking: false
        };


        // Start with current user
        let allParticipants = [currentUserParticipant];

        // Add other users from voiceChannelUsers prop if available
        if (voiceChannelUsers && voiceChannelUsers.length > 0) {
          const channelParticipants = voiceChannelUsers.filter(vu => 
            vu.channelId === channel?._id && vu.userId !== (currentUser?._id || currentUser?.id)
          );
          
          const otherParticipants = channelParticipants.map(vu => {
            const user = server?.members?.find(member => 
              (member._id || member.id) === vu.userId
            );
            
            if (user) {
              return {
                user,
                isMuted: vu.isMuted || false,
                isDeafened: vu.isDeafened || false,
                isCurrentUser: false,
                isSpeaking: false
              };
            }
            return null;
          }).filter(Boolean);

          allParticipants = [currentUserParticipant, ...otherParticipants];
        }


        setParticipants(allParticipants);
        
      } else if (!isConnected) {
        // Clear participants when not connected
        if (participants.length > 0) {
          setParticipants([]);
        }
      } else if (currentChannel !== channel?._id) {
        // Clear participants when not in the same channel
        if (participants.length > 0) {
          setParticipants([]);
        }
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [isConnected, currentUser, currentChannel, channel?._id, isMuted, isDeafened, voiceChannelUsers, server?.members]);

  // Remove the separate mute/deafen useEffect to prevent conflicts

  // Listen for connection events to show toast only once
  useEffect(() => {
    const handleVoiceConnected = ({ channelId }) => {
      if (channelId === channel?._id) {
        
      }
    };

    const handleVoiceDisconnected = ({ channelId }) => {
      if (channelId === channel?._id) {
        
      }
    };

    // Set current user ID in voiceChatService
    const userId = currentUser?._id || currentUser?.id;
    if (userId && voiceChatService.currentUserId !== userId) {
        voiceChatService.currentUserId = userId;
    }

    // Listen to voiceChatService events directly
    voiceChatService.on('connected', handleVoiceConnected);
    voiceChatService.on('disconnected', handleVoiceDisconnected);

    const handleSpeakingChanged = ({ userId, isSpeaking }) => {
      setParticipants(prev => {
        const updated = prev.map(participant => {
          const isMatch = participant.user._id === userId || participant.user.id === userId;
          return isMatch ? { ...participant, isSpeaking } : participant;
        });
        return updated;
      });
    };

    voiceChatService.on('speaking-changed', handleSpeakingChanged);

    return () => {
      voiceChatService.off('connected', handleVoiceConnected);
      voiceChatService.off('disconnected', handleVoiceDisconnected);
      voiceChatService.off('speaking-changed', handleSpeakingChanged);
    };
  }, [channel, currentUser]);

  // Screen sharing status will be calculated in render section

  // Handle remote screen streams
  useEffect(() => {
    const newVideos = new Map();
    
    remoteScreenStreams.forEach((stream, userId) => {
      const videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = false; // Screen share can have audio
      
      // Adaptive playback for different refresh rates
      videoElement.style.maxWidth = '100%';
      videoElement.style.maxHeight = '100%';
      videoElement.style.objectFit = 'contain';
      
      // Performance optimization for lower-end devices
      videoElement.addEventListener('loadedmetadata', () => {
        const track = stream.getVideoTracks()[0];
        if (track) {
          const settings = track.getSettings();
          console.log('📺 Receiving stream:', {
            width: settings.width,
            height: settings.height,
            frameRate: settings.frameRate,
            displayRefreshRate: screen.refreshRate || 'Unknown',
            isElectron: electronAPI?.isElectron() || false
          });
          
          // Electron-specific optimizations
          if (electronAPI?.isElectron()) {
            // Enable hardware acceleration hints
            videoElement.style.willChange = 'transform';
            videoElement.style.backfaceVisibility = 'hidden';
            videoElement.style.perspective = '1000px';
            
            // Check for hardware acceleration
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            const hasHardwareAccel = gl && gl.getParameter(gl.RENDERER).indexOf('Software') === -1;
            
            console.log('🖥️ Electron video optimization:', {
              hardwareAcceleration: hasHardwareAccel,
              gpuRenderer: gl?.getParameter(gl.RENDERER) || 'Unknown'
            });
            
            if (!hasHardwareAccel && settings.frameRate > 60) {
              console.warn('⚠️ High FPS without hardware acceleration - performance may be limited');
              console.warn('💡 Enable --enable-gpu-rasterization flag for better performance');
            }
          }
          
          // Adaptive quality based on display capability
          if (screen.refreshRate && settings.frameRate > screen.refreshRate * 1.5) {
            console.log('💡 High FPS stream on lower refresh display - auto-adaptation active');
          }
        }
      });
      
      newVideos.set(userId, videoElement);
    });
    
    setScreenShareVideos(newVideos);
    
    // Cleanup old videos
    return () => {
      newVideos.forEach(video => {
        if (video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
        }
      });
    };
  }, [remoteScreenStreams]);

  const handleLeaveChannel = async () => {
    try {
      await leaveChannel();
      try {
        await playVoiceLeave(); // Ses efekti çal
      } catch (audioError) {
        // Audio error handled silently
      }
    } catch (error) {
      
    }
  };

  const handleToggleMute = () => {
    toggleMute();
  };

  const handleToggleDeafen = () => {
    // Deafen yapıldığında otomatik mute da olmalı
    if (!isDeafened) {
      // Deafen açılıyorsa, önce mute aç
      if (!isMuted) {
        toggleMute();
      }
    }
    toggleDeafen();
  };

  const handleSettings = () => {
    // TODO: Open voice settings modal
    
  };

  const handleScreenShare = async () => {
    try {
      if (isCurrentUserScreenSharing) {
        await stopScreenShare();
        console.log('🖥️ Screen sharing stopped');
      } else {
        // ELECTRON-FIRST: Always use picker for Electron, fallback for browser
        if (electronAPI.isElectron()) {
          console.log('🖥️ Opening Electron screen picker (primary method)');
          setShowScreenPicker(true);
        } else {
          console.warn('⚠️ Browser fallback: Using basic screen sharing');
          console.warn('💡 For advanced features, use the desktop app');
          await startScreenShare();
          console.log('🖥️ Basic screen sharing started');
        }
      }
    } catch (error) {
      console.error('❌ Screen share error:', error);
    }
  };

  const handleScreenSourceSelect = async ({ source, includeAudio, quality }) => {
    try {
      console.log('🖥️ Starting screen share with source:', source.name, 'Quality:', quality?.label);
      
      // Pass source info to voiceChatService
      await startScreenShare({
        sourceId: source.id,
        sourceName: source.name,
        includeAudio,
        quality: quality || {
          width: 1920,
          height: 1080,
          frameRate: 60
        }
      });
      
      console.log('✅ Screen sharing started with Discord-style picker');
    } catch (error) {
      console.error('❌ Screen share with picker failed:', error);
    }
  };

  // Full screen functionality
  const handleFullScreen = (videoElement) => {
    if (!videoElement) return;
    
    try {
      if (videoElement.requestFullscreen) {
        videoElement.requestFullscreen();
      } else if (videoElement.webkitRequestFullscreen) {
        videoElement.webkitRequestFullscreen();
      } else if (videoElement.mozRequestFullScreen) {
        videoElement.mozRequestFullScreen();
      } else if (videoElement.msRequestFullscreen) {
        videoElement.msRequestFullscreen();
      }
      console.log('🖥️ Entered full screen mode');
    } catch (error) {
      console.error('❌ Full screen failed:', error);
    }
  };

  if (!channel || channel.type !== 'voice') {
    return null;
  }

  const isInThisChannel = currentChannel === channel._id;
  const currentUserId = voiceChatService.currentUserId;
  const isCurrentUserScreenSharing = screenSharingUsers.includes(currentUserId);
  const hasScreenShares = screenSharingUsers.length > 0 || remoteScreenStreams.size > 0;

  return (
    <div className="h-full bg-black/80 backdrop-blur-md relative flex flex-col">
      {/* Voice Channel Header - Project Theme Style */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-md border-b border-white/10 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Mic className="w-5 h-5 text-gray-400" />
            <h2 className="text-white font-semibold text-base">{channel.name}</h2>
          </div>
          {participants.length > 0 && (
            <div className="flex items-center space-x-1 text-gray-400 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{participants.length}</span>
            </div>
          )}
          {hasScreenShares && (
            <div className="flex items-center space-x-1 text-green-400 text-sm">
              <Monitor className="w-4 h-4" />
              <span>{Math.max(screenSharingUsers.length, remoteScreenStreams.size)} ekran paylaşımı</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-gray-400 hover:text-white hover:bg-white/10 rounded"
            onClick={onClose}
            title="Ses Kanalından Ayrıl"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Screen Sharing Area */}
        {hasScreenShares && (
          <div className="flex-1 bg-black/60 backdrop-blur-sm border-r border-white/10">
            <div className="h-full flex flex-col">
              {/* Screen Share Header */}
              <div className="px-4 py-2 bg-black/40 border-b border-white/10">
                <h3 className="text-white font-medium text-sm flex items-center space-x-2">
                  <Monitor className="w-4 h-4" />
                  <span>Ekran Paylaşımları</span>
                </h3>
              </div>
              
              {/* Screen Share Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 gap-4">
                  {Array.from(remoteScreenStreams.keys()).map((userId) => {
                    const user = server?.members?.find(m => (m._id || m.id) === userId) ||
                                 (userId === (currentUser?._id || currentUser?.id) ? currentUser : null);
                    const videoElement = screenShareVideos.get(userId);
                    const isExpanded = expandedScreenShare === userId;

                    return (
                      <div
                        key={userId}
                        className={`relative bg-black/40 backdrop-blur-sm rounded-lg border-2 border-white/20 overflow-hidden transition-all duration-300 ${
                          isExpanded ? 'w-full max-w-6xl' : 'w-full max-w-4xl mx-auto'
                        }`}
                        style={{
                          aspectRatio: isExpanded ? '16/10' : '4/3',
                          minHeight: isExpanded ? '500px' : '400px',
                          maxHeight: isExpanded ? '700px' : '500px',
                          minWidth: isExpanded ? '800px' : '600px',
                          width: isExpanded ? '100%' : '100%'
                        }}
                      >
                        {/* Screen Share Header */}
                        <div className="absolute top-0 left-0 right-0 z-10 bg-black/60 backdrop-blur-sm px-3 py-2 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={null} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                                {(user?.username || user?.displayName || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-white text-sm font-medium">
                              {user?.displayName || user?.username || 'Bilinmeyen Kullanıcı'}
                            </span>
                            <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                              <Monitor className="w-3 h-3 mr-1" />
                              Ekran Paylaşımı
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            {/* Quality Controls - Only for current user */}
                            {userId === (currentUser?._id || currentUser?.id) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-6 h-6 text-gray-400 hover:text-white hover:bg-white/10"
                                  onClick={() => adjustScreenQuality('high')}
                                  title="Yüksek Kalite (1080p)"
                                >
                                  <span className="text-xs font-bold">HD</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-6 h-6 text-gray-400 hover:text-white hover:bg-white/10"
                                  onClick={() => adjustScreenQuality('medium')}
                                  title="Orta Kalite (720p)"
                                >
                                  <span className="text-xs font-bold">SD</span>
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6 text-gray-400 hover:text-white hover:bg-white/10"
                              onClick={() => setExpandedScreenShare(isExpanded ? null : userId)}
                              title={isExpanded ? "Küçült" : "Büyüt"}
                            >
                              {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6 text-gray-400 hover:text-white hover:bg-white/10"
                              onClick={() => handleFullScreen(videoElement)}
                              title="Tam Ekran"
                            >
                              <Monitor className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Video Container */}
                        <div className="relative w-full h-full bg-black/20 rounded-lg overflow-hidden">
                          {videoElement ? (
                            <div
                              ref={(ref) => {
                                if (ref && videoElement && !ref.contains(videoElement)) {
                                  videoElement.className = "w-full h-full object-contain rounded-lg cursor-pointer";
                                  videoElement.addEventListener('dblclick', () => handleFullScreen(videoElement));
                                  ref.appendChild(videoElement);
                                }
                              }}
                              className="w-full h-full rounded-lg overflow-hidden cursor-pointer"
                              onDoubleClick={() => handleFullScreen(videoElement)}
                              title="Tam ekran için çift tıklayın"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-black/40 rounded-lg">
                              <div className="text-center">
                                <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-400 text-sm font-medium">Ekran paylaşımı yükleniyor...</p>
                                <p className="text-gray-500 text-xs mt-1">Lütfen bekleyin</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Voice Participants Area */}
        <div className={`${hasScreenShares ? 'w-80' : 'flex-1'} overflow-y-auto bg-black/40 backdrop-blur-sm scroll-optimized`}>
          {participants.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm">
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white/20">
                  <Mic className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">Ses kanalına bağlısınız</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Diğer kullanıcılar katılmayı bekliyor...
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {/* Voice Participants Header - Enhanced */}
              {hasScreenShares && (
                <div className="mb-6 pb-3 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold text-base flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <Volume2 className="w-4 h-4 text-green-400" />
                      </div>
                      <span>Ses Katılımcıları</span>
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-white/10 text-white/80 border-white/20 text-xs">
                        {participants.length} kişi
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
              
              <div className={`grid gap-3 ${hasScreenShares ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
                {participants.map((participant) => (
                  <div
                    key={participant.user._id || participant.user.id}
                    className={`relative bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl border border-white/10 p-4 hover:from-gray-700/60 hover:to-gray-800/60 hover:border-white/20 hover:shadow-xl hover:shadow-black/20 transition-all duration-300 group ${
                      hasScreenShares ? 'flex items-center space-x-4 min-h-[70px]' : 'aspect-[4/5] flex flex-col items-center justify-center min-h-[180px]'
                    } ${
                      participant.isSpeaking ? 'ring-2 ring-green-400/50 shadow-lg shadow-green-400/20' : ''
                    } ${
                      participant.isCurrentUser ? 'ring-2 ring-blue-400/50 shadow-lg shadow-blue-400/20' : ''
                    }`}
                  >
                    {/* User Avatar Container - Enhanced */}
                    <div className={`relative ${hasScreenShares ? '' : 'flex flex-col items-center mb-4'}`}>
                      <div className={`relative ${hasScreenShares ? 'w-14 h-14' : 'w-24 h-24 md:w-28 md:h-28'} rounded-full overflow-hidden transition-all duration-300 ${
                        participant.isSpeaking
                          ? 'ring-3 ring-green-400 ring-opacity-90 shadow-2xl shadow-green-400/50 scale-105'
                          : participant.isCurrentUser
                            ? 'ring-3 ring-blue-400 ring-opacity-70 shadow-xl shadow-blue-400/30'
                            : 'ring-2 ring-white/10 group-hover:ring-white/20 group-hover:scale-105'
                      }`}>
                        <Avatar className="w-full h-full">
                          <AvatarImage
                            src={null}
                            alt={participant.user.username || participant.user.displayName}
                            className="object-cover"
                          />
                          <AvatarFallback className={`text-white font-bold text-lg ${
                            participant.isCurrentUser 
                              ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                              : participant.isSpeaking
                                ? 'bg-gradient-to-br from-green-500 to-green-700'
                                : 'bg-gradient-to-br from-gray-600 to-gray-800'
                          }`}>
                            {(participant.user.username || participant.user.displayName || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Speaking Animation - Geri eklendi */}
                      {participant.isSpeaking && (
                        <div className="absolute -inset-1 rounded-full bg-green-400/20 animate-ping" />
                      )}
                    </div>

                    {/* User Info - Enhanced */}
                    <div className={`${hasScreenShares ? 'flex-1' : 'text-center w-full'}`}>
                      <div className="flex flex-col items-center space-y-1">
                        <p className={`font-semibold ${hasScreenShares ? 'text-sm' : 'text-base'} ${hasScreenShares ? '' : 'truncate max-w-full'} ${
                          participant.isCurrentUser
                            ? 'text-blue-300'
                            : participant.isSpeaking
                              ? 'text-green-300'
                              : 'text-white'
                        }`}>
                          {participant.user.displayName || participant.user.username}
                        </p>
                        
                        {/* Status Badges */}
                        <div className="flex items-center space-x-1">
                          {participant.isCurrentUser && (
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs px-2 py-0.5">
                              Sen
                            </Badge>
                          )}
                          {participant.isSpeaking && (
                            <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30 text-xs px-2 py-0.5 animate-pulse">
                              Konuşuyor
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mute/Deafen Status - Enhanced */}
                    {(participant.isMuted || participant.isDeafened) && (
                      <div className={`flex ${hasScreenShares ? 'space-x-1' : 'space-x-2 absolute bottom-2 right-2'}`}>
                        {participant.isMuted && (
                          <div className={`${
                            hasScreenShares 
                              ? 'w-5 h-5' 
                              : 'w-7 h-7'
                          } bg-red-500/90 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-red-400/50 shadow-lg shadow-red-500/30`}>
                            <MicOff className={`${hasScreenShares ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} text-white`} />
                          </div>
                        )}
                        {participant.isDeafened && (
                          <div className={`${
                            hasScreenShares 
                              ? 'w-5 h-5' 
                              : 'w-7 h-7'
                          } bg-red-500/90 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-red-400/50 shadow-lg shadow-red-500/30`}>
                            <HeadphonesIcon className={`${hasScreenShares ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} text-white`} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {isInThisChannel && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 p-3 shadow-2xl">
            <div className="flex items-center space-x-3">
              {/* Mute Button - Floating Style */}
              <Button
                onClick={handleToggleMute}
                size="icon"
                className={`w-14 h-14 rounded-full transition-all duration-300 shadow-lg ${
                  isMuted
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/50 scale-110'
                    : 'bg-white/20 hover:bg-white/30 text-gray-200 hover:text-white hover:scale-110 backdrop-blur-sm'
                }`}
                title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>

              {/* Deafen Button - Floating Style */}
              <Button
                onClick={handleToggleDeafen}
                size="icon"
                className={`w-14 h-14 rounded-full transition-all duration-300 shadow-lg ${
                  isDeafened
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/50 scale-110'
                    : 'bg-white/20 hover:bg-white/30 text-gray-200 hover:text-white hover:scale-110 backdrop-blur-sm'
                }`}
                title={isDeafened ? 'Kulaklığı Aç' : 'Kulaklığı Kapat'}
              >
                {isDeafened ? <HeadphonesIcon className="w-6 h-6" /> : <Headphones className="w-6 h-6" />}
              </Button>

              {/* Screen Share Button - Floating Style */}
              <Button
                onClick={handleScreenShare}
                size="icon"
                className={`w-14 h-14 rounded-full transition-all duration-300 shadow-lg ${
                  isCurrentUserScreenSharing
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/50 scale-110'
                    : 'bg-white/20 hover:bg-white/30 text-gray-200 hover:text-white hover:scale-110 backdrop-blur-sm'
                }`}
                title={isCurrentUserScreenSharing ? 'Ekran Paylaşımını Durdur' : 'Ekran Paylaş'}
              >
                <Monitor className="w-6 h-6" />
              </Button>

              {/* Settings Button - Floating Style */}
              <Button
                onClick={handleSettings}
                size="icon"
                className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 text-gray-200 hover:text-white transition-all duration-300 shadow-lg hover:scale-110 backdrop-blur-sm"
                title="Ses Ayarları"
              >
                <Settings className="w-6 h-6" />
              </Button>

              {/* Leave Channel Button - Floating Style */}
              <Button
                onClick={handleLeaveChannel}
                size="icon"
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-300 shadow-lg shadow-red-500/50 hover:scale-110 ml-2"
                title="Ses Kanalından Ayrıl"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>

            {/* Status Text - Modern Floating Style */}
            <div className="text-center mt-3">
              <p className="text-gray-300 text-sm font-medium bg-black/30 backdrop-blur-sm rounded-full px-4 py-1">
                {isMuted && isDeafened && 'Mikrofonunuz ve kulaklığınız kapalı'}
                {isMuted && !isDeafened && 'Mikrofonunuz susturulmuş'}
                {!isMuted && isDeafened && 'Kulaklığınız kapalı'}
                {isCurrentUserScreenSharing && (!isMuted || !isDeafened) && ' • Ekranınız paylaşılıyor'}
                {isCurrentUserScreenSharing && isMuted && isDeafened && 'Mikrofonunuz ve kulaklığınız kapalı • Ekranınız paylaşılıyor'}
                {!isMuted && !isDeafened && !isCurrentUserScreenSharing && 'Bağlı'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Discord-Style Screen Share Picker */}
      <ScreenSharePicker
        isOpen={showScreenPicker}
        onClose={() => setShowScreenPicker(false)}
        onSelect={handleScreenSourceSelect}
      />
    </div>
  );
};

export default VoiceScreen;
