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

const VoiceScreen = ({ channel, server, onClose }) => {
  const { user: currentUser } = useAuth();
  const { playVoiceLeave } = useAudio();
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

  const [expandedScreenShare, setExpandedScreenShare] = useState(null);
  const [screenShareVideos, setScreenShareVideos] = useState(new Map());

  // Update participants list from hook data
  useEffect(() => {
    if (server?.members && Array.isArray(connectedUsers) && connectedUsers.length > 0) {
      // Create a Map for efficient user lookup
      const userMap = new Map();
      server.members.forEach(member => {
        userMap.set(member._id || member.id, member);
      });

      // Build participants list
      const participantsList = connectedUsers.map(userId => {
        const user = userMap.get(userId);
        if (!user) {
          return null;
        }

        return {
          user,
          isCurrentUser: (user._id || user.id) === (currentUser?._id || currentUser?.id),
          isSpeaking: false, // This will be updated by voice activity detection
          isMuted: false,
          isDeafened: false
        };
      }).filter(Boolean);


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
  }, [server?.members, connectedUsers, currentUser, isConnected, currentChannel, channel?._id, isMuted, isDeafened, setParticipants]);

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
  }, [channel, currentUser, participants, setParticipants]);

  // Get current user's screen sharing status
  const isCurrentUserScreenSharing = screenSharingUsers.includes(currentUser?._id || currentUser?.id);

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
                              <AvatarImage src={user?.avatar} />
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
                            src={participant.user.avatar}
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
