import { useCallback } from 'react';
import socketService from '../services/socket';

export function useSocket() {
  const joinServer = useCallback((serverId) => {
    socketService.joinServer(serverId);
  }, []);

  const leaveServer = useCallback((serverId) => {
    socketService.leaveServer(serverId);
  }, []);

  const sendMessage = useCallback((messageData) => {
    socketService.sendMessage(messageData);
  }, []);

  const joinVoiceChannel = useCallback((channelId) => {
    socketService.joinVoiceChannel(channelId);
  }, []);

  const leaveVoiceChannel = useCallback(() => {
    socketService.leaveVoiceChannel();
  }, []);

  const sendTyping = useCallback((channelId, serverId, isTyping) => {
    socketService.sendTyping(channelId, serverId, isTyping);
  }, []);

  const addReaction = useCallback((messageId, emoji) => {
    socketService.addReaction(messageId, emoji);
  }, []);

  const updateUserStatus = useCallback((status) => {
    socketService.updateUserStatus(status);
  }, []);

  const on = useCallback((event, callback) => {
    socketService.on(event, callback);
    return () => socketService.off(event, callback);
  }, []);

  return {
    isConnected: socketService.isConnected(),
    joinServer,
    leaveServer,
    sendMessage,
    joinVoiceChannel,
    leaveVoiceChannel,
    sendTyping,
    addReaction,
    updateUserStatus,
    on,
  };
}
