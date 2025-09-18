import { useCallback } from 'react';
import socketService from '../services/socket';

export function useSocket() {
  const joinServer = useCallback((serverId) => {
    socketService.joinServer(serverId);
  }, []);

  const leaveServer = useCallback((serverId) => {
    socketService.leaveServer(serverId);
  }, []);

  const sendMessage = useCallback((channelId, content, serverId) => {
    return socketService.sendMessage(channelId, content, serverId);
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

  const leaveVoiceChannel = useCallback(() => {
    socketService.leaveVoiceChannel();
  }, []);

  const sendTyping = useCallback((channelId, isTyping) => {
    return socketService.sendTyping(channelId, isTyping);
  }, []);

  const addReaction = useCallback((messageId, emoji, channelId) => {
    return socketService.addReaction(messageId, emoji, channelId);
  }, []);

  const updateUserStatus = useCallback((status) => {
    socketService.updateUserStatus(status);
  }, []);

  const on = useCallback((event, callback) => {
    socketService.on(event, callback);
    return () => socketService.off(event, callback);
  }, []);

  return {
    isConnected: socketService.isConnected,
    joinServer,
    leaveServer,
    sendMessage,
    joinChannel,
    leaveChannel,
    joinVoiceChannel,
    leaveVoiceChannel,
    sendTyping,
    addReaction,
    updateUserStatus,
    on,
  };
}
