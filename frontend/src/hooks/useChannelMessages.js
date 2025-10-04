import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { messageAPI } from '../services/api';
import { 
  normalizeMessage, 
  normalizeMessages, 
  mergeMessages,
  createOptimisticMessage 
} from '../services/messageNormalizer';

/**
 * Discord-Style Channel Messages Hook
 * Handles all message operations for a channel with proper normalization
 */
export const useChannelMessages = (channelId, serverId, serverMembers = []) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  
  const { socket, on, isConnected } = useSocket();
  const serverMembersRef = useRef(serverMembers);
  
  // Keep server members ref updated
  useEffect(() => {
    serverMembersRef.current = serverMembers;
  }, [serverMembers]);

  // Load messages from API
  const loadMessages = useCallback(async () => {
    if (!channelId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await messageAPI.getMessages(channelId, 1, 50);
      const rawMessages = response.data.messages || [];
      
      // Normalize all messages with current server members
      const normalized = normalizeMessages(rawMessages, serverMembersRef.current);
      
      setMessages(normalized);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError(err.message || 'Failed to load messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  // Handle incoming real-time message
  const handleNewMessage = useCallback((rawMessage) => {
    if (!rawMessage) return;
    
    // Normalize with current server members
    const normalized = normalizeMessage(rawMessage, serverMembersRef.current);
    if (!normalized) return;
    
    // Only add if it's for this channel
    const messageChannelId = normalized.channelId || normalized.channel;
    if (messageChannelId !== channelId) return;
    
    setMessages(prev => {
      // Remove any optimistic message with same content
      const filtered = prev.filter(msg => {
        if (!msg.isOptimistic) return true;
        
        // Remove optimistic if content matches and recent
        const isSameContent = msg.content === normalized.content;
        const isSameAuthor = msg.author?.id === normalized.author?.id;
        const timeDiff = Math.abs(new Date(normalized.timestamp) - new Date(msg.timestamp));
        const isRecent = timeDiff < 5000;
        
        return !(isSameContent && isSameAuthor && isRecent);
      });
      
      // Check if message already exists
      const exists = filtered.some(msg => 
        (msg._id === normalized._id) || (msg.id === normalized.id)
      );
      
      if (exists) return prev;
      
      // Add new message and sort
      return mergeMessages(filtered, [normalized]);
    });
  }, [channelId]);

  // Handle message updates
  const handleMessageUpdated = useCallback((rawMessage) => {
    if (!rawMessage) return;
    
    const normalized = normalizeMessage(rawMessage, serverMembersRef.current);
    if (!normalized) return;
    
    setMessages(prev => prev.map(msg => 
      (msg._id === normalized._id || msg.id === normalized.id) ? normalized : msg
    ));
  }, []);

  // Handle message deletion
  const handleMessageDeleted = useCallback((messageId) => {
    setMessages(prev => prev.filter(msg => 
      msg._id !== messageId && msg.id !== messageId
    ));
  }, []);

  // Handle typing indicators
  const handleUserTyping = useCallback((data) => {
    if (data.channelId !== channelId) return;
    
    if (data.isTyping) {
      setTypingUsers(prev => {
        if (prev.includes(data.username)) return prev;
        return [...prev, data.username];
      });
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u !== data.username));
      }, 3000);
    } else {
      setTypingUsers(prev => prev.filter(u => u !== data.username));
    }
  }, [channelId]);

  // Register socket listeners - Discord style: wait for connection
  useEffect(() => {
    if (!socket) return;
    
    const connected = isConnected();
    if (!connected) {
      const handleConnect = () => {};
      socket.on('connect', handleConnect);
      return () => socket.off('connect', handleConnect);
    }
    
    const unsubscribeNewMessage = on('newMessage', handleNewMessage);
    const unsubscribeUpdated = on('message_updated', handleMessageUpdated);
    const unsubscribeDeleted = on('message_deleted', handleMessageDeleted);
    const unsubscribeTyping = on('userTyping', handleUserTyping);
    
    return () => {
      unsubscribeNewMessage();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeTyping();
    };
  }, [socket, isConnected, on, handleNewMessage, handleMessageUpdated, handleMessageDeleted, handleUserTyping]);

  // Load messages when channel changes
  useEffect(() => {
    if (channelId) {
      // Clear messages immediately when channel changes
      setMessages([]);
      setTypingUsers([]);
      setError(null);
      
      // Load messages from API
      loadMessages();
    }
  }, [channelId, loadMessages]);

  // Send message with optimistic update
  const sendMessage = useCallback(async (content, currentUser) => {
    if (!content.trim() || !channelId || !currentUser) return;
    
    // Create optimistic message
    const optimisticMsg = createOptimisticMessage({
      content: content.trim(),
      author: currentUser,
      channelId,
      serverId
    });
    
    // Add optimistic message immediately
    setMessages(prev => mergeMessages(prev, [optimisticMsg]));
    
    try {
      // Send to backend
      if (socket) {
        socket.emit('sendMessage', {
          channelId,
          content: content.trim(),
          type: serverId
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      
      // Mark optimistic message as failed
      setMessages(prev => prev.map(msg => 
        msg._id === optimisticMsg._id 
          ? { ...msg, status: 'failed', isOptimistic: false }
          : msg
      ));
    }
  }, [channelId, serverId, socket]);

  return {
    messages,
    loading,
    error,
    typingUsers,
    sendMessage,
    loadMessages
  };
};

export default useChannelMessages;
