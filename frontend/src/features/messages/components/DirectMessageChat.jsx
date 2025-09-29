import React, { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { 
  Phone, 
  Video, 
  UserPlus, 
  MoreHorizontal, 
  Search,
  Pin,
  Settings,
  Users,
  Bell,
  BellOff
} from "lucide-react";

import { useDirectMessages } from '../hooks/useDirectMessages';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';

/**
 * DirectMessageChat Component - Discord Style
 * Refactored to use new Messages feature module
 */
const DirectMessageChat = ({ conversation }) => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const conversationId = conversation?.id || conversation?._id;
  const otherUser = conversation?.participants?.find(p => p.id !== user?.id) || 
                   conversation?.participants?.find(p => p._id !== user?.id) ||
                   conversation?.user; // Fallback to conversation.user

  console.log('🔍 DirectMessageChat Debug:', {
    conversation,
    conversationId,
    otherUser,
    currentUser: user,
    otherUserDetails: {
      id: otherUser?.id || otherUser?._id,
      username: otherUser?.username,
      displayName: otherUser?.displayName,
      status: otherUser?.status
    }
  });

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

  // Handle scroll to show/hide scroll button
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  // Handle send message with optimistic updates (from memory)
  const handleSendMessage = async ({ content, attachments, replyTo }) => {
    console.log('🚀 handleSendMessage called:', { content, attachments, replyTo, otherUser });
    
    if (!otherUser || !content.trim()) {
      console.log('❌ handleSendMessage validation failed:', { otherUser, content: content?.trim() });
      return { success: false };
    }

    try {
      console.log('📤 Calling sendDirectMessage with:', { content, recipientId: otherUser.id || otherUser._id });
      const result = await sendDirectMessage(content, otherUser.id || otherUser._id);
      
      console.log('📥 sendDirectMessage result:', result);
      
      if (!result.success) {
        toast.error(result.error || 'Mesaj gönderilemedi');
      }

      return result;
    } catch (error) {
      console.error('❌ Send message error:', error);
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
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={otherUser?.avatar} />
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
                otherUser?.status === 'away' ? 'bg-yellow-500' : 
                otherUser?.status === 'dnd' ? 'bg-red-500' : 'bg-gray-500'
              }`} />
              <span className="text-xs text-gray-400 capitalize">
                {otherUser?.status || 'offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <UserPlus className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <Search className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
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

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 min-h-0"
        onScroll={handleScroll}
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
