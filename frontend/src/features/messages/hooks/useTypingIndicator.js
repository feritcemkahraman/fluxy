import { useState, useCallback, useRef, useEffect } from 'react';
import { useSocket } from '../../../hooks/useSocket';
import { TYPING_TIMEOUT } from '../constants';

/**
 * Typing Indicator Hook - Discord Style
 * Manages typing indicator state and WebSocket events
 */
export const useTypingIndicator = (channelId, conversationId = null) => {
  const [isTyping, setIsTyping] = useState(false);
  const { socket, isConnected } = useSocket();
  const typingTimeoutRef = useRef(null);
  const lastTypingTimeRef = useRef(0);

  // Start typing indicator
  const startTyping = useCallback(() => {
    if (!socket || !isConnected) return;

    const now = Date.now();
    const timeSinceLastTyping = now - lastTypingTimeRef.current;

    // Only emit if enough time has passed (throttle)
    if (timeSinceLastTyping >= 1000) {
      if (conversationId) {
        // Direct message typing
        socket.emit('dmTyping', {
          conversationId,
          isTyping: true
        });
      } else if (channelId) {
        // Channel typing
        socket.emit('typing', {
          channelId,
          isTyping: true
        });
      }

      lastTypingTimeRef.current = now;
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, TYPING_TIMEOUT);
  }, [socket, isConnected, channelId, conversationId]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (!socket || !isConnected || !isTyping) return;

    if (conversationId) {
      // Direct message typing
      socket.emit('dmTyping', {
        conversationId,
        isTyping: false
      });
    } else if (channelId) {
      // Channel typing
      socket.emit('typing', {
        channelId,
        isTyping: false
      });
    }

    setIsTyping(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [socket, isConnected, isTyping, channelId, conversationId]);

  // Handle input change (start typing)
  const handleInputChange = useCallback((content) => {
    if (content && content.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  }, [startTyping, stopTyping]);

  // Handle send message (stop typing)
  const handleSendMessage = useCallback(() => {
    stopTyping();
  }, [stopTyping]);

  // Cleanup on unmount or channel/conversation change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        stopTyping();
      }
    };
  }, [channelId, conversationId]);

  return {
    isTyping,
    startTyping,
    stopTyping,
    handleInputChange,
    handleSendMessage
  };
};
