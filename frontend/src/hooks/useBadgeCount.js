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
    
    if (window.electronAPI?.setBadgeCount) {
      window.electronAPI.setBadgeCount(count);
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
      // Only increment if message is not from current user
      if (data.sender?._id !== user.id && data.sender?.id !== user.id) {
        // Only increment if window is not focused
        if (!isWindowFocused.current) {
          incrementBadge(1);
        }
      }
    };

    socket.on('dmMessage', handleNewDM);
    
    return () => {
      socket.off('dmMessage', handleNewDM);
    };
  }, [socket, user, incrementBadge]);

  // Handle mention (Discord-like)
  useEffect(() => {
    if (!socket || !user) return;

    const handleMention = (data) => {
      // Only increment if window is not focused
      if (!isWindowFocused.current) {
        incrementBadge(1);
      }
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
