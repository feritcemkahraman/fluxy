import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';

/**
 * Discord-like badge count manager
 * Tracks unread messages and mentions, updates taskbar badge
 */
export const useBadgeCount = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const unreadCountRef = useRef(0);
  const isWindowFocused = useRef(true);

  // Update badge count in Electron
  const updateBadge = useCallback((count) => {
    unreadCountRef.current = count;
    console.log(`🔵 Hook updating badge: ${count}`);
    
    if (window.electronAPI?.setBadgeCount) {
      window.electronAPI.setBadgeCount(count);
      console.log(`✅ Badge IPC sent: ${count}`);
    } else {
      console.warn('⚠️ electronAPI.setBadgeCount not available');
    }
  }, []);

  // Increment badge count
  const incrementBadge = useCallback((increment = 1) => {
    const newCount = unreadCountRef.current + increment;
    updateBadge(newCount);
  }, [updateBadge]);

  // Clear badge count
  const clearBadge = useCallback(() => {
    updateBadge(0);
  }, [updateBadge]);

  // Handle new DM message (Discord-like)
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewDM = (data) => {
      console.log('🔵 DM received:', data);
      // Extract author ID from various possible structures
      const authorId = data.message?.author?.id || data.message?.author?._id ||
                       data.author?.id || data.author?._id || 
                       data.sender?.id || data.sender?._id ||
                       data.from;
      
      // Only increment if message is not from current user
      const isFromOtherUser = authorId && (authorId !== user?.id && authorId !== user?._id);
      
      if (isFromOtherUser) {
        console.log('✅ DM from other user - incrementing badge');
        // Always increment badge, will be cleared on window focus
        incrementBadge(1);
      } else {
        console.log('⏭️ DM from self - skipping badge');
      }
    };

    socket.on('newDirectMessage', handleNewDM);
    
    return () => {
      socket.off('newDirectMessage', handleNewDM);
    };
  }, [socket, user, incrementBadge]);

  // Handle mention (Discord-like)
  useEffect(() => {
    if (!socket || !user) return;

    const handleMention = (data) => {
      console.log('🔵 Mention received:', data);
      // Always increment badge, will be cleared on window focus
      incrementBadge(1);
    };

    socket.on('mention', handleMention);
    
    return () => {
      socket.off('mention', handleMention);
    };
  }, [socket, user, incrementBadge]);

  // Handle window focus/blur (Discord-like behavior)
  useEffect(() => {
    const handleFocus = () => {
      isWindowFocused.current = true;
      clearBadge();
    };

    const handleBlur = () => {
      isWindowFocused.current = false;
    };

    // Electron window focus event
    if (window.electronAPI?.on) {
      window.electronAPI.on('window-focused', handleFocus);
    }

    // Browser events (fallback)
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      if (window.electronAPI?.off) {
        window.electronAPI.off('window-focused', handleFocus);
      }
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [clearBadge]);

  // Initial focus check
  useEffect(() => {
    isWindowFocused.current = document.hasFocus();
  }, []);

  return {
    updateBadge,
    incrementBadge,
    clearBadge,
    unreadCount: unreadCountRef.current
  };
};
