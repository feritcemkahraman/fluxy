import webSocketService from './websocket';

// Re-export WebSocket service as socket service for compatibility
export default webSocketService;
export { webSocketService as socketService };
