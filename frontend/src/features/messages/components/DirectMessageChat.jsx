import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { toast } from "sonner";
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

/**
 * DirectMessageChat Component - Discord Style
 * Refactored to use new Messages feature module
 */
const DirectMessageChat = ({ conversation, initiateVoiceCall, currentCall, callState, endCall, toggleMute, isSpeaking, remoteSpeaking, isMuted, callDuration, isScreenSharing, startScreenShare }) => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

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
      
      if (!result.success) {
        toast.error(result.error || 'Mesaj gönderilemedi');
      }

      return result;
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Mesaj gönderilemedi');
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
          {/* User Cards Container */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {/* Current User Card - Always visible */}
            <div className="relative">
              <div className={`relative w-64 h-52 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-2xl transition-all duration-200 ${
                isSpeaking ? 'ring-4 ring-green-500 ring-opacity-75' : 'border-2 border-gray-700/50'
              }`}>
                {/* Speaking indicator - shows when user is speaking */}
                {isSpeaking && (
                  <div className="absolute inset-0 rounded-xl border-2 border-green-500 animate-pulse pointer-events-none" />
                )}
                
                <div className="absolute inset-0 flex flex-col items-center justify-center py-4">
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
                  <p className="text-white text-base font-bold text-center drop-shadow-2xl px-4 w-full">
                    {user?.displayName || user?.username || 'Me'}
                  </p>
                </div>
              </div>
            </div>

            {/* Other User Card - Only show when connected */}
            {callState === 'connected' && (
              <div className="relative">
                <div className={`relative w-64 h-52 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-2xl transition-all duration-200 ${
                  remoteSpeaking ? 'ring-4 ring-green-500 ring-opacity-75' : 'border-2 border-gray-700/50'
                }`}>
                  {/* Speaking indicator - shows when remote user is speaking */}
                  {remoteSpeaking && (
                    <div className="absolute inset-0 rounded-xl border-2 border-green-500 animate-pulse pointer-events-none" />
                  )}
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center py-4">
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
                    <p className="text-white text-base font-bold text-center drop-shadow-2xl px-4 w-full">
                      {otherUser?.displayName || otherUser?.username || 'User'}
                    </p>
                  </div>
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
              onClick={async () => {
                if (!startScreenShare) return;
                const result = await startScreenShare();
                if (result.success) {
                  toast.success('Ekran paylaşımı başlatıldı');
                } else {
                  toast.error(result.error || 'Ekran paylaşımı başlatılamadı');
                }
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                isScreenSharing 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-[#2b2d31] hover:bg-gray-700'
              }`}
              title={isScreenSharing ? 'Ekran Paylaşımı Aktif' : 'Ekran Paylaş'}
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
                  toast.error('Arama özelliği yükleniyor...');
                  return;
                }
                const result = endCall();
                if (result.success) {
                  toast.success('Arama sonlandırıldı');
                } else {
                  toast.error(result.error || 'Arama sonlandırılamadı');
                }
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
          <div className="space-y-4 flex flex-col">
            {messages.map((message) => (
              <MessageItem
                key={message.id || message._id || `msg-${Date.now()}-${Math.random()}`}
                message={message}
                currentUser={user}
                onReply={handleReply}
                onReaction={handleReaction}
                onRetry={handleRetry}
                showAvatar={true}
                compact={false}
              />
            ))}
            
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
    </div>
  );
};

export default DirectMessageChat;
