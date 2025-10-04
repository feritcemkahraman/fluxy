import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../../hooks/useSocket';
import { messageService } from '../services/messageService';
import { MESSAGE_BATCH_SIZE, MESSAGE_ERRORS } from '../constants';
import websocketService from '../../../services/websocket';

/**
 * Messages Hook - Discord Style
 * Manages channel messages with real-time updates and optimistic updates
 */
export const useMessages = (channelId) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  
  const { socket, isConnected } = useSocket();
  const messagesRef = useRef(messages);
  const typingTimeouts = useRef(new Map());

  // Keep ref updated
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load initial messages
  const loadMessages = useCallback(async (reset = false) => {
    if (!channelId || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const offset = reset ? 0 : messages.length;
      const result = await messageService.getChannelMessages(channelId, {
        limit: MESSAGE_BATCH_SIZE,
        offset
      });

      if (result.success) {
        const newMessages = result.data.messages || [];
        
        setMessages(prev => {
          if (reset) {
            return newMessages;
          }
          // Avoid duplicates
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
          return [...prev, ...uniqueNew];
        });

        setHasMore(newMessages.length === MESSAGE_BATCH_SIZE);
      } else {
        setError(result.error || MESSAGE_ERRORS.LOAD_FAILED);
      }
    } catch (error) {
      console.error('Load messages error:', error);
      setError(MESSAGE_ERRORS.NETWORK_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [channelId, messages.length, isLoading]);

  // Send message with optimistic update
  const sendMessage = useCallback(async (content, options = {}) => {
    if (!channelId || !content.trim()) return { success: false };

    // Get current user from auth context
    const currentUser = options.author || JSON.parse(localStorage.getItem('user') || '{}');

    const optimisticMessage = {
      id: `optimistic_${Date.now()}_${Math.random()}`,
      content: content.trim(),
      author: {
        id: currentUser.id || currentUser._id || 'current_user',
        _id: currentUser.id || currentUser._id || 'current_user',
        username: currentUser.username || 'You',
        displayName: currentUser.displayName || currentUser.username || 'You',
        avatar: currentUser.avatar || null,
        discriminator: currentUser.discriminator || null,
        status: currentUser.status || 'online'
      },
      channelId,
      timestamp: new Date(),
      reactions: [],
      attachments: options.attachments || [],
      isOptimistic: true,
      status: 'sending',
      ...(options.replyTo && { replyTo: options.replyTo })
    };

    // Add optimistic message
    setMessages(prev => [optimisticMessage, ...prev]);

    try {
      const result = await messageService.sendMessage(channelId, {
        content: content.trim(),
        type: options.type || 'text',
        replyTo: options.replyTo?.id,
        attachments: options.attachments
      });

      if (result.success) {
        // Replace optimistic message with real one
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id 
              ? { ...result.data, status: 'sent' }
              : msg
          )
        );
        return { success: true, message: result.data };
      } else {
        // Mark optimistic message as failed
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id 
              ? { ...msg, status: 'failed', error: result.error }
              : msg
          )
        );
        return result;
      }
    } catch (error) {
      console.error('Send message error:', error);
      // Mark optimistic message as failed
      setMessages(prev => 
        prev.map(msg => 
          msg.id === optimisticMessage.id 
            ? { ...msg, status: 'failed', error: MESSAGE_ERRORS.SEND_FAILED }
            : msg
        )
      );
      return { success: false, error: MESSAGE_ERRORS.NETWORK_ERROR };
    }
  }, [channelId]);

  // Retry failed message
  const retryMessage = useCallback(async (messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.status !== 'failed') return;

    // Reset status to sending
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: 'sending', error: null }
          : msg
      )
    );

    // Retry send
    return await sendMessage(message.content, {
      author: message.author,
      replyTo: message.replyTo,
      attachments: message.attachments
    });
  }, [messages, sendMessage]);

  // Handle typing indicator
  const handleTyping = useCallback((data) => {
    const { userId, username, isTyping } = data;
    
    if (isTyping) {
      setTypingUsers(prev => {
        const existing = prev.find(u => u.userId === userId);
        if (existing) {
          return prev.map(u => 
            u.userId === userId 
              ? { ...u, timestamp: new Date() }
              : u
          );
        }
        return [...prev, { userId, username, timestamp: new Date() }];
      });

      // Clear existing timeout
      if (typingTimeouts.current.has(userId)) {
        clearTimeout(typingTimeouts.current.get(userId));
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
        typingTimeouts.current.delete(userId);
      }, 3000);

      typingTimeouts.current.set(userId, timeout);
    } else {
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
      if (typingTimeouts.current.has(userId)) {
        clearTimeout(typingTimeouts.current.get(userId));
        typingTimeouts.current.delete(userId);
      }
    }
  }, []);

  // Socket event handlers - DIRECT SOCKET (exactly like useDirectMessages)
  useEffect(() => {
    if (!socket || !isConnected() || !channelId) {
      return;
    }

    const handleNewMessage = (message) => {
      // Normalize message channel ID (backend sends 'channel', frontend uses 'channelId')
      const messageChannelId = message.channel?._id || message.channel || message.channelId;
      
      if (messageChannelId === channelId || messageChannelId?.toString() === channelId?.toString()) {
        
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some(m => (m.id || m._id) === (message.id || message._id));
          if (exists) return prev;
          
          // Normalize message format
          const normalizedMessage = {
            ...message,
            id: message._id || message.id,
            channelId: messageChannelId,
            timestamp: message.createdAt || message.timestamp
          };
          
          // Remove any optimistic message with same content
          const filtered = prev.filter(m => 
            !(m.isOptimistic && m.content === normalizedMessage.content && 
              Math.abs(new Date(normalizedMessage.timestamp) - new Date(m.timestamp)) < 5000)
          );
          
          return [normalizedMessage, ...filtered];
        });
      }
    };

    const handleMessageUpdated = (message) => {
      const messageChannelId = message.channel?._id || message.channel || message.channelId;
      
      if (messageChannelId === channelId || messageChannelId?.toString() === channelId?.toString()) {
        setMessages(prev => 
          prev.map(m => (m.id || m._id) === (message.id || message._id) ? message : m)
        );
      }
    };

    const handleMessageDeleted = (messageId) => {
      setMessages(prev => prev.filter(m => (m.id || m._id) !== messageId));
    };

    // Register DIRECT socket listeners (exactly like useDirectMessages)
    socket.on('newMessage', handleNewMessage);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('userTyping', handleTyping);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('userTyping', handleTyping);
    };
  }, [socket, isConnected, channelId, handleTyping]);

  // Load messages when channel changes
  useEffect(() => {
    if (channelId) {
      setMessages([]);
      setTypingUsers([]);
      setError(null);
      loadMessages(true);
    }
  }, [channelId]);

  // Cleanup typing timeouts
  useEffect(() => {
    return () => {
      typingTimeouts.current.forEach(timeout => clearTimeout(timeout));
      typingTimeouts.current.clear();
    };
  }, []);

  return {
    messages,
    isLoading,
    hasMore,
    error,
    typingUsers,
    sendMessage,
    retryMessage,
    loadMessages: () => loadMessages(false),
    refreshMessages: () => loadMessages(true),
    clearError: () => setError(null)
  };
};
