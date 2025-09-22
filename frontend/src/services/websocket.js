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
      this.socket.on('newMessage', (message) => {
        this.emit('newMessage', message);
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

      this.socket.on('channelCreated', (channel) => {
        this.emit('channelCreated', channel);
      });

      this.socket.on('channel_updated', (channel) => {
        this.emit('channel_updated', channel);
      });

      this.socket.on('channelDeleted', (data) => {
        this.emit('channelDeleted', data);
      });

      // User events
      this.socket.on('userStatusUpdate', (data) => {
        this.emit('userStatusUpdate', data);
      });

      this.socket.on('userProfileUpdate', (data) => {
        this.emit('userProfileUpdate', data);
      });

      // Friend events
      this.socket.on('friendRequestReceived', (data) => {
        this.emit('friendRequestReceived', data);
      });

      this.socket.on('friendRequestAccepted', (data) => {
        this.emit('friendRequestAccepted', data);
      });

      this.socket.on('friendAdded', (data) => {
        this.emit('friendAdded', data);
      });

      this.socket.on('friendRemoved', (data) => {
        this.emit('friendRemoved', data);
      });

      // Direct Message events
      this.socket.on('newDirectMessage', (data) => {
        this.emit('newDirectMessage', data);
      });

      this.socket.on('dmSent', (data) => {
        this.emit('dmSent', data);
      });

      // Typing indicators
      this.socket.on('userTyping', (data) => {
        this.emit('userTyping', data);
      });

      this.socket.on('user_joined_server', (data) => {
        this.emit('user_joined_server', data);
      });

      this.socket.on('user_left_server', (data) => {
        this.emit('user_left_server', data);
      });

      // Voice channel updates
      this.socket.on('voiceChannelUpdate', (data) => {
        this.emit('voiceChannelUpdate', data);
      });

      // Voice channel sync
      this.socket.on('voiceChannelSync', (data) => {
        this.emit('voiceChannelSync', data);
      });

      // WebRTC Voice Events - CRITICAL FOR VOICE CHAT
      this.socket.on('userJoinedVoice', (data) => {
        this.emit('userJoinedVoice', data);
      });

      this.socket.on('userLeftVoice', (data) => {
        this.emit('userLeftVoice', data);
      });

      this.socket.on('voice-signal', (data) => {
        this.emit('voice-signal', data);
      });

      this.socket.on('voice-user-muted', (data) => {
        this.emit('voice-user-muted', data);
      });

      this.socket.on('voice-user-deafened', (data) => {
        this.emit('voice-user-deafened', data);
      });

      // Screen Sharing Events
      this.socket.on('screen-share-started', (data) => {
        this.emit('screen-share-started', data);
      });

      this.socket.on('screen-share-stopped', (data) => {
        this.emit('screen-share-stopped', data);
      });

      this.socket.on('screen-signal', (data) => {
        this.emit('screen-signal', data);
      });

    } catch (error) {
      console.error('Error connecting to Socket.IO:', error);
      this.handleReconnect();
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('max_reconnect_attempts_reached');
      return;
    }

    this.reconnectAttempts++;
    
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

    this.socket.emit('sendMessage', {
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

  // Wait for authentication
  async waitForAuthentication(timeout = 5000) {
    if (this.isAuthenticated) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, timeout);

      const handleAuth = () => {
        clearTimeout(timer);
        this.off('authenticated', handleAuth);
        this.off('authentication_failed', handleAuthFailed);
        resolve();
      };

      const handleAuthFailed = (error) => {
        clearTimeout(timer);
        this.off('authenticated', handleAuth);
        this.off('authentication_failed', handleAuthFailed);
        reject(new Error(`Authentication failed: ${error}`));
      };

      this.on('authenticated', handleAuth);
      this.on('authentication_failed', handleAuthFailed);
    });
  }

  // Join voice channel
  async joinVoiceChannel(channelId) {
    // Wait for authentication first
    try {
      await this.waitForAuthentication();
    } catch (error) {
      console.error('Failed to authenticate before joining voice channel:', error.message);
      throw new Error('Socket not authenticated or connected');
    }

    this.socket.emit('joinVoiceChannel', { channelId });
  }

  // Leave voice channel
  leaveVoiceChannel(channelId) {
    if (!this.socket) return;

    this.socket.emit('leaveVoiceChannel', { channelId });
  }

  // Update user status
  updateStatus(status) {
    if (!this.isAuthenticated || !this.socket) {
      console.error('Socket not authenticated or connected');
      return;
    }

    this.socket.emit('updateUserStatus', { status });
  }

  // WebRTC Voice Signaling Methods - CRITICAL FOR VOICE CHAT
  sendVoiceSignal(signal, targetUserId, channelId, fromUserId) {
    if (!this.socket) return;
    
    this.socket.emit('voice-signal', {
      signal,
      targetUserId,
      channelId,
      fromUserId
    });
  }

  sendVoiceMuteStatus(channelId, isMuted, userId) {
    if (!this.socket) return;
    
    this.socket.emit('voice-mute-status', {
      channelId,
      isMuted,
      userId
    });
  }

  sendVoiceDeafenStatus(channelId, isDeafened, userId) {
    if (!this.socket) return;
    
    this.socket.emit('voice-deafen-status', {
      channelId,
      isDeafened,
      userId
    });
  }

  // Screen Sharing Signaling
  startScreenShare(channelId, userId) {
    if (!this.socket) return;
    
    this.socket.emit('start-screen-share', {
      channelId,
      userId
    });
  }

  stopScreenShare(channelId, userId) {
    if (!this.socket) return;
    
    this.socket.emit('stop-screen-share', {
      channelId,
      userId
    });
  }

  sendScreenSignal(signal, targetUserId, channelId, fromUserId) {
    if (!this.socket) return;
    
    this.socket.emit('screen-signal', {
      signal,
      targetUserId,
      channelId,
      fromUserId
    });
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