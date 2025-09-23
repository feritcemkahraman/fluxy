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
import { voiceChatService } from "../services/voiceChat";
import { toast } from "sonner";
import { useAudio } from "../hooks/useAudio";
import { serverAPI } from "../services/api";

const VoiceScreen = ({ channel, server, servers = [], voiceChannelUsers = [], onClose }) => {
  const { user: currentUser } = useAuth();
  const { playVoiceLeave } = useAudio();
  
  // Find server if not provided - fallback mechanism
  const effectiveServer = server || channel?.server || (servers.length > 0 && channel ? 
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
    setParticipants
  } = useVoiceChat();

  const [fetchedServer, setFetchedServer] = useState(null);
  const [missingUsers, setMissingUsers] = useState(new Map()); // Add missing state
  const [screenShareVideos, setScreenShareVideos] = useState(new Map()); // Add missing state for screen sharing
  const [audioElements, setAudioElements] = useState(new Map()); // Add missing state for audio elements

  // Effect to fetch server data if not provided
  useEffect(() => {
    const fetchServerData = async () => {
      if (effectiveServer) return; // Already have server data
      
      if (channel?.server?._id || channel?.server?.id) {
        try {
          const response = await serverAPI.getServer(channel.server._id || channel.server.id);
          if (response.data.server) {
            setFetchedServer(response.data.server);
          }
        } catch (error) {
          // Silent fail for production
        }
      }
    };

    fetchServerData();
  }, [effectiveServer, channel?.server?._id, channel?.server?.id]);

  // Use fetched server if effectiveServer is not available
  const finalServer = effectiveServer || fetchedServer;

  // Effect to fetch missing user data
  useEffect(() => {
    const fetchMissingUsers = async () => {
      if (!finalServer?._id || !Array.isArray(voiceChannelUsers) || voiceChannelUsers.length === 0) return;
      
      const userMap = new Map();
      finalServer.members?.forEach(member => {
        const userId = member.user?._id || member.user?.id || member._id || member.id;
        const userObj = member.user || member;
        userMap.set(userId, userObj);
      });

      const missingUserIds = voiceChannelUsers.filter(userId => !userMap.has(userId));
      
      if (missingUserIds.length > 0) {
        try {
          // Refresh server members to get latest data including new users
          const response = await serverAPI.getServerMembers(finalServer._id || finalServer.id);
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
          // Silent fail for production
        }
      }
    };

    fetchMissingUsers();
  }, [finalServer?._id, finalServer?.id, voiceChannelUsers, finalServer?.members]);

  // Update participants list from hook data
  useEffect(() => {
    // Debug: Check if voiceChannelUsers is actually an array
    if (!Array.isArray(voiceChannelUsers)) {
      return;
    }

    if (!finalServer?.members) {
      return;
    }

    // Allow processing even with 0 users for proper current user display
    if (finalServer?.members && Array.isArray(voiceChannelUsers)) {
      // Create a Map for efficient user lookup
      const userMap = new Map();
      finalServer.members.forEach(member => {
        // Handle both nested user object and direct member object
        const userId = member.user?._id || member.user?.id || member._id || member.id;
        const userObj = member.user || member;
        userMap.set(userId, userObj);
      });

      // Build participants list
      const participantsList = voiceChannelUsers.map(userId => {
        const user = userMap.get(userId) || missingUsers.get(userId);
        
        if (!user) {
          // Create a fallback user object - we'll try to fetch real data later
          return {
            user: {
              _id: userId,
              id: userId,
              username: `User-${userId.slice(-4)}`,
              displayName: `Loading...`,
              isTemporary: true // Flag to indicate this is temporary data
            },
            isCurrentUser: userId === (currentUser?._id || currentUser?.id),
            isSpeaking: false,
            isMuted: false,
            isDeafened: false
          };
        }

        return {
          user,
          isCurrentUser: (user._id || user.id) === (currentUser?._id || currentUser?.id),
          isSpeaking: false, // This will be updated by voice activity detection
          isMuted: false,
          isDeafened: false
        };
      }); // Remove .filter(Boolean) since we now always return an object


      // Always ensure current user is included if connected
      if (isConnected && currentUser && currentChannel === channel?._id) {
        const currentUserId = currentUser._id || currentUser.id;
        const currentUserExists = participantsList.some(p => p.isCurrentUser);

        if (!currentUserExists) {
          const currentUserObj = userMap.get(currentUserId) || currentUser;
          participantsList.unshift({
            user: currentUserObj,
            isMuted,
            isDeafened,
            isCurrentUser: true,
            isSpeaking: false
          });
        }
      }

      // Sort participants: current user first, then others alphabetically
      participantsList.sort((a, b) => {
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
        return (a.user.username || a.user.displayName || '').localeCompare(
          b.user.username || b.user.displayName || ''
        );
      });

      // Update participants state in hook
      if (participantsList.length > 0) {
        setParticipants(participantsList);
      } else {
        // If no participants, ensure current user is still shown
        if (isConnected && currentUser && currentChannel === channel?._id) {
          setParticipants([{
            user: currentUser,
            isMuted,
            isDeafened,
            isCurrentUser: true,
            isSpeaking: false
          }]);
        }
      }
    } else {
      // If conditions not met but we're connected, show current user
      if (isConnected && currentUser && currentChannel === channel?._id) {
        setParticipants([{
          user: currentUser,
          isMuted,
          isDeafened,
          isCurrentUser: true,
          isSpeaking: false
        }]);
      }
    }
  }, [finalServer?.members, voiceChannelUsers, currentUser, isConnected, currentChannel, channel?._id, isMuted, isDeafened, setParticipants, missingUsers]);

  // Listen for connection events to show toast only once
  useEffect(() => {
    const handleVoiceConnected = ({ channelId }) => {
      if (channelId === channel?._id) {
        toast.success(`${channel.name} kanalına bağlandınız`);
      }
    };

    const handleVoiceDisconnected = ({ channelId }) => {
      if (channelId === channel?._id) {
        toast.success(`${channel.name} kanalından ayrıldınız`);
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

    // CRITICAL: Listen for userJoinedVoice event from voiceChatService
    const handleUserJoinedVoice = ({ userId, channelId, username }) => {
      console.log(`👤 User joined voice from voiceChatService: ${userId} (${username})`);
      
      // Add user to participants if not already present
      setParticipants(prev => {
        const existingIndex = prev.findIndex(p => (p.user._id || p.user.id) === userId);
        if (existingIndex >= 0) {
          return prev; // Already exists
        }
        
        // Create new participant
        const newParticipant = {
          user: { _id: userId, username: username || 'Unknown', displayName: username || 'Unknown' },
          isMuted: false,
          isDeafened: false,
          isCurrentUser: (currentUser?._id || currentUser?.id) === userId,
          isSpeaking: false
        };
        
        return [...prev, newParticipant];
      });
    };

    const handleUserLeftVoice = ({ userId, channelId }) => {
      console.log(`👋 User left voice from voiceChatService: ${userId}`);
      
      // Remove user from participants
      setParticipants(prev => prev.filter(p => (p.user._id || p.user.id) !== userId));
    };

    voiceChatService.on('userJoinedVoice', handleUserJoinedVoice);
    voiceChatService.on('userLeftVoice', handleUserLeftVoice);

    const handleSpeakingChanged = ({ userId, isSpeaking }) => {
      setParticipants(prev => {
        const updated = prev.map(participant => {
          const isMatch = participant.user._id === userId || participant.user.id === userId;
          return isMatch ? { ...participant, isSpeaking } : participant;
        });
        return updated;
      });
    };

    // CRITICAL: Listen for remote streams for voice chat
    const handleRemoteStream = ({ userId, stream }) => {
      console.log(`🎧 Received remote stream from user: ${userId}`);
      // The useVoiceChat hook will handle this and update remoteStreams state
    };

    voiceChatService.on('speaking-changed', handleSpeakingChanged);
    voiceChatService.on('remote-stream', handleRemoteStream);

    return () => {
      voiceChatService.off('connected', handleVoiceConnected);
      voiceChatService.off('disconnected', handleVoiceDisconnected);
      voiceChatService.off('userJoinedVoice', handleUserJoinedVoice);
      voiceChatService.off('userLeftVoice', handleUserLeftVoice);
      voiceChatService.off('speaking-changed', handleSpeakingChanged);
      voiceChatService.off('remote-stream', handleRemoteStream);
    };
  }, [channel, currentUser, participants, setParticipants]);

  // Get current user's screen sharing status
  const isCurrentUserScreenSharing = screenSharingUsers.includes(currentUser?._id || currentUser?.id);

  // Handle remote audio streams - CRITICAL FOR VOICE CHAT
  useEffect(() => {
    const newAudioElements = new Map();
    
    remoteStreams.forEach((stream, userId) => {
      console.log(`🔊 Creating audio element for user: ${userId}`);
      
      const audioElement = document.createElement('audio');
      audioElement.srcObject = stream;
      audioElement.autoplay = true;
      audioElement.playsInline = true;
      audioElement.muted = false;
      audioElement.volume = 1.0;
      
      // Add to DOM to ensure playback
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
      
      // Handle audio play promise
      audioElement.play().catch(error => {
        console.warn('Audio autoplay failed:', error);
        // User interaction required for autoplay
      });
      
      newAudioElements.set(userId, audioElement);
    });
    
    setAudioElements(newAudioElements);
    
    // Cleanup old audio elements
    return () => {
      audioElements.forEach(audio => {
        if (audio.srcObject) {
          audio.srcObject.getTracks().forEach(track => track.stop());
        }
        if (audio.parentNode) {
          audio.parentNode.removeChild(audio);
        }
      });
    };
  }, [remoteStreams, audioElements]);

  // Handle remote screen streams
  useEffect(() => {
    const newVideos = new Map();
    
    remoteScreenStreams.forEach((stream, userId) => {
      const videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = false; // Screen share can have audio
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

  // Fallback effect: Ensure current user is always shown if connected and no participants
  useEffect(() => {
    if (isConnected && currentUser && currentChannel === channel?._id && participants.length === 0) {
      setParticipants([{
        user: currentUser,
        isMuted,
        isDeafened,
        isCurrentUser: true,
        isSpeaking: false
      }]);
    }
  }, [isConnected, currentUser, currentChannel, channel?._id, participants.length, isMuted, isDeafened, setParticipants]);

  // Cleanup audio elements on component unmount
  useEffect(() => {
    return () => {
      // Clean up all audio elements when component unmounts
      audioElements.forEach(audio => {
        if (audio.srcObject) {
          audio.srcObject.getTracks().forEach(track => track.stop());
        }
        if (audio.parentNode) {
          audio.parentNode.removeChild(audio);
        }
      });
    };
  }, []);

  const handleLeaveChannel = async () => {
    try {
      await leaveChannel();
      try {
        await playVoiceLeave(); // Ses efekti çal
      } catch (audioError) {
        // Audio error handled silently
      }
    } catch (error) {
      toast.error(`Kanaldan ayrılamadı: ${error.message}`);
    }
  };

  const handleToggleMute = () => {
    toggleMute();
  };

  const handleToggleDeafen = () => {
    toggleDeafen();
  };

  const handleSettings = () => {
    // TODO: Open voice settings modal
    toast.info('Ses ayarları yakında eklenecek');
  };

  const handleScreenShare = async () => {
    try {
      if (isCurrentUserScreenSharing) {
        await voiceChatService.stopScreenShare();
      } else {
        await voiceChatService.startScreenShare();
      }
    } catch (error) {
      toast.error(`Ekran paylaşımı hatası: ${error.message}`);
    }
  };

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  if (!channel || channel.type !== 'voice') {
    return null;
  }

  const isInThisChannel = currentChannel === channel._id;

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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6 text-gray-400 hover:text-white hover:bg-white/10"
                              onClick={() => setExpandedScreenShare(isExpanded ? null : userId)}
                            >
                              {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>
                        
                        {/* Video Container */}
                        <div className="relative w-full h-full bg-black/20 rounded-lg overflow-hidden">
                          {videoElement ? (
                            <div
                              ref={(ref) => {
                                if (ref && videoElement && !ref.contains(videoElement)) {
                                  videoElement.className = "w-full h-full object-contain rounded-lg";
                                  ref.appendChild(videoElement);
                                }
                              }}
                              className="w-full h-full rounded-lg overflow-hidden"
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
        <div className={`${hasScreenShares ? 'w-80' : 'flex-1'} overflow-y-auto bg-black/40 backdrop-blur-sm`}>
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
              {/* Voice Participants Header */}
              {hasScreenShares && (
                <div className="mb-4 pb-2 border-b border-white/10">
                  <h3 className="text-white font-medium text-sm flex items-center space-x-2">
                    <Volume2 className="w-4 h-4" />
                    <span>Ses Katılımcıları ({participants.length})</span>
                  </h3>
                </div>
              )}
              
              <div className={`grid gap-3 ${hasScreenShares ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
                {participants.map((participant) => (
                  <div
                    key={participant.user._id || participant.user.id}
                    className={`relative bg-black/40 backdrop-blur-sm rounded-lg border-2 border-white/20 p-3 hover:bg-black/50 hover:border-white/30 hover:shadow-lg hover:shadow-white/10 transition-all duration-200 group ${
                      hasScreenShares ? 'flex items-center space-x-3' : 'aspect-square flex flex-col items-center justify-center'
                    } shadow-md`}
                  >
                    {/* User Avatar Container */}
                    <div className={`relative ${hasScreenShares ? '' : 'flex flex-col items-center mb-5'}`}>
                      <div className={`relative ${hasScreenShares ? 'w-12 h-12' : 'w-20 h-20'} rounded-full overflow-hidden transition-all duration-200 ${
                        participant.isSpeaking
                          ? 'ring-4 ring-green-400 ring-opacity-80 shadow-xl shadow-green-400/40 animate-pulse'
                          : 'ring-2 ring-white/20 group-hover:ring-white/30'
                      }`}>
                        <Avatar className="w-full h-full">
                          <AvatarImage
                            src={null}
                            alt={participant.user.username || participant.user.displayName}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-semibold">
                            {(participant.user.username || participant.user.displayName || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Speaking Animation - Static Green Ring */}
                      {participant.isSpeaking && (
                        <div className="absolute inset-0 rounded-full ring-4 ring-green-400 ring-opacity-80 shadow-lg shadow-green-400/50" />
                      )}
                    </div>

                    {/* User Info */}
                    <div className={`${hasScreenShares ? 'flex-1' : 'text-center w-full'}`}>
                      <p className={`text-sm font-medium ${hasScreenShares ? '' : 'truncate'} ${
                        participant.isCurrentUser
                          ? 'text-white'
                          : participant.isSpeaking
                            ? 'text-green-400'
                            : 'text-gray-300'
                      }`}>
                        {participant.user.displayName || participant.user.username}
                      </p>
                      {participant.isCurrentUser && (
                        <p className="text-sm text-gray-400 mt-1">(Sen)</p>
                      )}
                    </div>

                    {/* Mute/Deafen Status */}
                    {(participant.isMuted || participant.isDeafened) && (
                      <div className={`${hasScreenShares ? 'flex space-x-2' : 'absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-3'}`}>
                        {participant.isMuted && (
                          <div className={`${hasScreenShares ? 'w-5 h-5' : 'w-7 h-7'} bg-red-500 rounded-full flex items-center justify-center border border-black/30 shadow-lg`}>
                            <MicOff className={`${hasScreenShares ? 'w-3 h-3' : 'w-5 h-5'} text-white`} />
                          </div>
                        )}
                        {participant.isDeafened && (
                          <div className={`${hasScreenShares ? 'w-5 h-5' : 'w-7 h-7'} bg-red-500 rounded-full flex items-center justify-center border border-black/30 shadow-lg`}>
                            <HeadphonesIcon className={`${hasScreenShares ? 'w-3 h-3' : 'w-5 h-5'} text-white`} />
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

    </div>
  );
};

export default VoiceScreen;
