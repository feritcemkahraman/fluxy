import React, { createContext, useContext, useEffect, useState } from 'react';
import websocketService from '../services/websocket';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Listen for connection events
    const handleConnect = () => {
      console.log('Socket connected');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    };

    const handleError = (error) => {
      console.error('Socket error:', error);
      setIsConnected(false);
    };

    // Set up event listeners
    websocketService.on('connect', handleConnect);
    websocketService.on('disconnect', handleDisconnect);
    websocketService.on('error', handleError);

    // Initialize websocket connection only when we have a token
    const initSocket = async () => {
      try {
        // Get token from storage before connecting
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Connect with token
        websocketService.connect(token);
        setSocket(websocketService.socket);
        setIsConnected(websocketService.isConnected());
      } catch (error) {
        console.error('Socket connection failed:', error);
        setIsConnected(false);
      }
    };

    // Try to connect immediately
    initSocket();

    // Also listen for storage changes (when user logs in)
    const handleStorageChange = (e) => {
      if (e.key === 'token' && e.newValue) {
        initSocket();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      websocketService.off('connect', handleConnect);
      websocketService.off('disconnect', handleDisconnect);
      websocketService.off('error', handleError);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Socket utility functions
  const emit = (event, data) => {
    if (websocketService.socket && isConnected) {
      websocketService.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  };

  const on = (event, callback) => {
    websocketService.on(event, callback);
  };

  const off = (event, callback) => {
    websocketService.off(event, callback);
  };

  const disconnect = () => {
    websocketService.disconnect();
    setIsConnected(false);
    setSocket(null);
  };

  const reconnect = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('Cannot reconnect socket: No authentication token');
        return;
      }
      
      websocketService.connect(token);
      setSocket(websocketService.socket);
      setIsConnected(websocketService.isConnected());
    } catch (error) {
      console.error('Socket reconnection failed:', error);
      setIsConnected(false);
    }
  };

  const value = {
    socket,
    isConnected,
    emit,
    on,
    off,
    disconnect,
    reconnect
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
