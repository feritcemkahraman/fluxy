import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../../hooks/useSocket';
import { useAuth } from '../../../context/AuthContext';
import { messageService } from '../services/messageService';
import { MESSAGE_ERRORS } from '../constants';

/**
 * Direct Messages Hook - Discord Style
 * Manages direct message conversations with real-time updates
 */
export const useDirectMessages = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const typingTimeouts = useRef(new Map());

  // Load conversation messages
  const loadMessages = useCallback(async () => {
    if (!conversationId || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await messageService.getDirectMessages(conversationId);
      
      if (result.success) {
        // Sort messages by timestamp (oldest first, newest at bottom)
        const sortedMessages = (result.data.messages || []).sort((a, b) => 
          new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt)
        );
        setMessages(sortedMessages);
      } else {
        setError(result.error || MESSAGE_ERRORS.LOAD_FAILED);
      }
    } catch (error) {
      console.error('Load DM error:', error);
      setError(MESSAGE_ERRORS.NETWORK_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Send direct message with optimistic update
  const sendDirectMessage = useCallback(async (content, recipientId) => {
    console.log('🚀 sendDirectMessage called:', { content, recipientId, user });
    
    if (!content.trim() || !user) {
      console.log('❌ Validation failed:', { content: content.trim(), user });
      return { success: false };
    }

    const optimisticMessage = {
      id: `dm_optimistic_${Date.now()}_${Math.random()}`,
      content: content.trim(),
      author: {
        id: user.id || user._id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar
      },
      conversationId,
      timestamp: new Date(),
      isOptimistic: true,
      status: 'sent'
    };

    console.log('🔍 Optimistic message author:', {
      userId: user.id || user._id,
      username: user.username,
      displayName: user.displayName,
      finalDisplayName: user.displayName || user.username
    });

    // Add optimistic message to the end (newest messages at bottom)
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      console.log('📤 Calling messageService.sendDirectMessage...');
      const result = await messageService.sendDirectMessage({
        content: content.trim(),
        recipientId
      });

      console.log('📥 messageService result:', result);

      if (result.success) {
        console.log('🔄 Replacing optimistic message:', {
          optimisticId: optimisticMessage.id,
          optimisticTimestamp: optimisticMessage.timestamp,
          serverResponse: result.data,
          serverMessage: result.data.message,
          serverTimestamp: result.data.message?.timestamp || result.data.message?.createdAt
        });
        
        // Replace optimistic message with real one
        const serverMessage = result.data.message || result.data;
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id 
              ? { 
                  ...serverMessage, 
                  status: 'sent',
                  timestamp: serverMessage.timestamp || serverMessage.createdAt || optimisticMessage.timestamp
                }
              : msg
          )
        );
        return { success: true, message: serverMessage };
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
      console.error('Send DM error:', error);
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
  }, [conversationId, user]);

  // Handle DM typing indicator
  const handleDMTyping = useCallback((data) => {
    const { userId, username, isTyping, conversationId: dmConversationId } = data;
    
    // Only handle typing for current conversation
    if (dmConversationId !== conversationId) return;
    
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
  }, [conversationId]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected || !conversationId) return;

    const handleNewDirectMessage = (message) => {
      // Normalize message format
      const normalizedMessage = {
        ...message,
        id: message.id || message._id,
        conversationId: message.conversation || message.conversationId,
        timestamp: message.timestamp || message.createdAt
      };

      // Compare as strings to handle ObjectId
      if (String(normalizedMessage.conversationId) === String(conversationId)) {
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some(m => 
            (m.id === normalizedMessage.id) || 
            (m._id === normalizedMessage._id)
          );
          if (exists) return prev;
          
          // Remove any optimistic message with same content
          const filtered = prev.filter(m => 
            !(m.isOptimistic && m.content === normalizedMessage.content && 
              Math.abs(new Date(normalizedMessage.timestamp) - new Date(m.timestamp)) < 5000)
          );
          
          // Add new message at the end (newest at bottom)
          return [...filtered, normalizedMessage];
        });
      }
    };

    // Join DM conversation room
    socket.emit('joinDMConversation', { conversationId });

    // Register socket listeners - listen to both events
    socket.on('newDirectMessage', handleNewDirectMessage);
    socket.on('newMessage', handleNewDirectMessage); // Backend sends this for call messages
    socket.on('dmTyping', handleDMTyping);

    return () => {
      // Leave DM conversation room
      socket.emit('leaveDMConversation', { conversationId });
      
      socket.off('newDirectMessage', handleNewDirectMessage);
      socket.off('newMessage', handleNewDirectMessage);
      socket.off('dmTyping', handleDMTyping);
    };
  }, [socket, isConnected, conversationId, handleDMTyping]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      setMessages([]);
      setTypingUsers([]);
      setError(null);
      loadMessages();
    }
  }, [conversationId, loadMessages]);

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
    error,
    typingUsers,
    sendDirectMessage,
    loadMessages,
    clearError: () => setError(null)
  };
};
