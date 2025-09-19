import { io } from 'socket.io-client';
import { devLog } from '../utils/devLogger';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isAuthenticated = false;
    this.currentChannel = null;
    this.connectionId = null;
  }

  connect(token) {
    if (this.socket && this.socket.connected) {
      return;
    }

    try {
      // Use configured Socket.IO URL (ngrok backend)
      const socketUrl = process.env.REACT_APP_SOCKET_URL;
      
      if (!socketUrl) {
        console.error('REACT_APP_SOCKET_URL is not configured');
        return;
      }
      
      devLog.log('Connecting to Socket.IO:', socketUrl);
      this.socket = io(socketUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });
      
      this.socket.on('connect', () => {
        devLog.log('Socket.IO connected to ngrok backend');
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        // Wait for authentication confirmation from backend
        // Authentication handled by backend automatically via auth token
      });

      // Listen for authentication success
      this.socket.on('authenticated', () => {
        devLog.log('Socket authentication successful');
        this.isAuthenticated = true;
        this.emit('authenticated');
      });

      // Listen for authentication error
      this.socket.on('auth_error', (error) => {
        console.error('Socket authentication failed:', error);
        this.isAuthenticated = false;
        this.emit('auth_error', error);
      });

      this.socket.on('disconnect', (reason) => {
        devLog.log('Socket.IO disconnected:', reason);
        this.isAuthenticated = false;
        this.emit('disconnected');
        
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          this.handleReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error.message);
        this.handleReconnect();
      });

      // Authentication events
      this.socket.on('authenticated', (data) => {
        devLog.log('Socket authenticated:', data);
        this.isAuthenticated = true;
        this.connectionId = data?.connectionId || this.socket.id;
        this.emit('authenticated', data || { connectionId: this.socket.id });
      });

      this.socket.on('authentication_failed', (error) => {
        console.error('Socket authentication failed:', error);
        this.isAuthenticated = false;
        this.emit('authentication_failed', error);
      });

      // Message events
      this.socket.on('new_message', (message) => {
        this.emit('new_message', message);
      });

      this.socket.on('message_updated', (message) => {
        this.emit('message_updated', message);
      });

      this.socket.on('message_deleted', (messageId) => {
        this.emit('message_deleted', messageId);
      });

      // Channel events
      this.socket.on('user_joined_channel', (data) => {
        this.emit('user_joined_channel', data);
      });

      this.socket.on('user_left_channel', (data) => {
        this.emit('user_left_channel', data);
      });

      // Voice events
      this.socket.on('voice_user_joined', (data) => {
        this.emit('voice_user_joined', data);
      });

      this.socket.on('voice_user_left', (data) => {
        this.emit('voice_user_left', data);
      });

      // Server events
      this.socket.on('server_updated', (server) => {
        this.emit('server_updated', server);
      });

      this.socket.on('channel_created', (channel) => {
        this.emit('channel_created', channel);
      });

      this.socket.on('channel_updated', (channel) => {
        this.emit('channel_updated', channel);
      });

      this.socket.on('channel_deleted', (channelId) => {
        this.emit('channel_deleted', channelId);
      });

      // User events
      this.socket.on('user_status_changed', (data) => {
        this.emit('user_status_changed', data);
      });

      this.socket.on('user_joined_server', (data) => {
        this.emit('user_joined_server', data);
      });

      this.socket.on('user_left_server', (data) => {
        this.emit('user_left_server', data);
      });

    } catch (error) {
      console.error('Error connecting to Socket.IO:', error);
      this.handleReconnect();
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts_reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.socket) {
        this.socket.connect();
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isAuthenticated = false;
    this.currentChannel = null;
    this.connectionId = null;
  }

  // Send message to channel
  sendMessage(channelId, content, messageType = 'text') {
    if (!this.isAuthenticated || !this.socket) {
      console.error('Socket not authenticated or connected');
      return;
    }

    this.socket.emit('send_message', {
      channelId,
      content,
      type: messageType
    });
  }

  // Join a channel
  joinChannel(channelId) {
    if (!this.isAuthenticated || !this.socket) {
      console.error('Socket not authenticated or connected');
      return;
    }

    if (this.currentChannel) {
      this.leaveChannel(this.currentChannel);
    }

    this.currentChannel = channelId;
    this.socket.emit('join_channel', { channelId });
  }

  // Leave a channel
  leaveChannel(channelId) {
    if (!this.socket) return;

    this.socket.emit('leave_channel', { channelId });
    if (this.currentChannel === channelId) {
      this.currentChannel = null;
    }
  }

  // Join voice channel
  joinVoiceChannel(channelId) {
    if (!this.isAuthenticated || !this.socket) {
      console.error('Socket not authenticated or connected');
      return;
    }

    this.socket.emit('join_voice', { channelId });
  }

  // Leave voice channel
  leaveVoiceChannel(channelId) {
    if (!this.socket) return;

    this.socket.emit('leave_voice', { channelId });
  }

  // Update user status
  updateStatus(status) {
    if (!this.isAuthenticated || !this.socket) {
      console.error('Socket not authenticated or connected');
      return;
    }

    this.socket.emit('update_status', { status });
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  isConnected() {
    return this.socket && this.socket.connected;
  }

  isAuth() {
    return this.isAuthenticated;
  }

  getCurrentChannel() {
    return this.currentChannel;
  }

  getConnectionId() {
    return this.connectionId;
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;