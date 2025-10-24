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
      const rawMessages = response.messages || [];
      
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
    
    // Debug logging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔥 SOCKET MESSAGE RECEIVED:', {
        content: rawMessage.content?.substring(0, 50),
        id: rawMessage._id,
        author: rawMessage.author?.username,
        timestamp: rawMessage.timestamp || rawMessage.createdAt
      });
    }
    
    // Normalize with current server members
    const normalized = normalizeMessage(rawMessage, serverMembersRef.current);
    if (!normalized) return;
    
    // Only add if it's for this channel
    const messageChannelId = normalized.channelId || normalized.channel;
    if (messageChannelId !== channelId) return;
    
    setMessages(prev => {
      // First check if message already exists by ID (non-optimistic messages only)
      const messageId = normalized._id || normalized.id;
      const alreadyExists = prev.some(msg => 
        !msg.isOptimistic && (
          (msg._id === messageId) || (msg.id === messageId) ||
          (msg._id?.toString() === messageId?.toString()) || 
          (msg.id?.toString() === messageId?.toString())
        )
      );
      
      if (alreadyExists) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚫 DUPLICATE BLOCKED (ID):', normalized.content?.substring(0, 30));
        }
        return prev;
      }
      
      // Remove any optimistic message with same content and author
      // This replaces optimistic with real message
      const filtered = prev.filter(msg => {
        if (!msg.isOptimistic) return true;
        
        // Remove optimistic if content matches and same author
        const isSameContent = msg.content === normalized.content;
        const isSameAuthor = msg.author?.id === normalized.author?.id || 
                            msg.author?._id === normalized.author?._id;
        
        if (isSameContent && isSameAuthor) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 REPLACING OPTIMISTIC:', msg.content?.substring(0, 30));
          }
          return false; // Remove optimistic
        }
        
        return true; // Keep other messages
      });
      
      // Add new message and sort
      const result = mergeMessages(filtered, [normalized]);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ MESSAGE ADDED:', {
          content: normalized.content?.substring(0, 30),
          total: result.length
        });
      }
      
      return result;
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
  const handleMessageDeleted = useCallback((data) => {
    setMessages(prev => prev.filter(msg => {
      const msgId = msg._id || msg.id;
      return msgId !== data.messageId;
    }));
  }, []);

  // Handle reaction update (Discord-like)
  const handleReactionUpdate = useCallback((data) => {
    if (!data) return;
    
    setMessages(prev => prev.map(msg => {
      const msgId = msg._id || msg.id;
      if (msgId === data.messageId) {
        return { ...msg, reactions: data.reactions };
      }
      return msg;
    }));
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
    const unsubscribeReaction = on('reactionUpdate', handleReactionUpdate);
    const unsubscribeTyping = on('userTyping', handleUserTyping);
    
    return () => {
      unsubscribeNewMessage();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeReaction();
      unsubscribeTyping();
    };
  }, [socket, isConnected, on, handleNewMessage, handleMessageUpdated, handleMessageDeleted, handleReactionUpdate, handleUserTyping]);

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
  const sendMessage = useCallback(async (content, currentUser, options = {}) => {
    if (!content.trim() || !channelId || !currentUser) return;
    
    // Skip optimistic update for GIFs (they load instantly anyway)
    const skipOptimistic = options.type === 'gif';
    
    if (!skipOptimistic) {
      // Create optimistic message
      const optimisticMsg = createOptimisticMessage({
        content: content.trim(),
        author: currentUser,
        channelId,
        serverId
      });
      
      // Add optimistic message immediately
      setMessages(prev => mergeMessages(prev, [optimisticMsg]));
    }
    
    try {
      // Send to backend
      if (socket) {
        socket.emit('sendMessage', {
          channelId,
          content: content.trim(),
          type: serverId,
          replyTo: options.replyTo // Discord-like reply support
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      
      if (!skipOptimistic) {
        // Mark optimistic message as failed
        setMessages(prev => prev.map(msg => 
          msg.isOptimistic && msg.content === content.trim()
            ? { ...msg, status: 'failed', isOptimistic: false }
            : msg
        ));
      }
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
