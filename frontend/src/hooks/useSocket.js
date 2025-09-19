import { useCallback } from 'react';
import socketService from '../services/socket';

export function useSocket() {
  const sendMessage = useCallback((channelId, content, messageType = 'text') => {
    return socketService.sendMessage(channelId, content, messageType);
  }, []);

  const joinChannel = useCallback((channelId) => {
    return socketService.joinChannel(channelId);
  }, []);

  const leaveChannel = useCallback((channelId) => {
    return socketService.leaveChannel(channelId);
  }, []);

  const joinVoiceChannel = useCallback((channelId) => {
    socketService.joinVoiceChannel(channelId);
  }, []);

  const leaveVoiceChannel = useCallback((channelId) => {
    socketService.leaveVoiceChannel(channelId);
  }, []);

  const updateStatus = useCallback((status) => {
    socketService.updateStatus(status);
  }, []);

  const on = useCallback((event, callback) => {
    socketService.on(event, callback);
    return () => socketService.off(event, callback);
  }, []);

  const isConnected = useCallback(() => {
    return socketService.isConnected();
  }, []);

  const isAuthenticated = useCallback(() => {
    return socketService.isAuth();
  }, []);

  return {
    sendMessage,
    joinChannel,
    leaveChannel,
    joinVoiceChannel,
    leaveVoiceChannel,
    updateStatus,
    on,
    isConnected,
    isAuthenticated
  };
}