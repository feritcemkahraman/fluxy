import { io } from 'socket.io-client';
import { devLog } from '../utils/devLogger';
import monitoringService from '../utils/monitoring';

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
    // Validate token before attempting connection
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected, reusing existing connection');
      return;
    }
    
    if (this.socket && this.socket.connecting) {
      console.log('Socket already connecting, waiting...');
      return;
    }
    
    // Only cleanup if socket exists and is in a bad state
    if (this.socket && !this.socket.connected && !this.socket.connecting) {
      console.log('Cleaning up disconnected socket');
      this.socket.disconnect();
      this.socket = null;
    }

    try {
      // Use configured Socket.IO URL (ngrok backend)
      const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
      
      if (!process.env.REACT_APP_SOCKET_URL) {
        console.warn('REACT_APP_SOCKET_URL is not configured, using default: http://localhost:5000');
      }
      
      console.log('🔌 Attempting to connect to Socket.IO server:', socketUrl);
      
      this.socket = io(socketUrl, {
        auth: {
          token: token
        },
        transports: ['polling'], // Start with polling only for stability
        timeout: 30000, // Increased timeout
        reconnection: true,
        reconnectionAttempts: 3, // Reduced attempts to prevent spam
        reconnectionDelay: 2000, // Longer delay between attempts
        reconnectionDelayMax: 10000,
        forceNew: false, // Don't force new connection
        upgrade: false, // Disable websocket upgrade initially
        autoConnect: true,
        closeOnBeforeunload: false // Prevent premature closing
      });
      
      this.socket.on('connect', () => {
        this.reconnectAttempts = 0;
        monitoringService.trackSocketConnection('connect', { socketId: this.socket.id });
        
        // Attach pending listeners
        this.listeners.forEach((callbacks, event) => {
          callbacks.forEach(callback => {
            this.socket.on(event, callback);
          });
        });
        
        this.emitLocal('connected', {});
      });

      // Listen for authentication success
      this.socket.on('authenticated', () => {
        monitoringService.trackSocketConnection('authenticated', { socketId: this.socket.id });
        this.isAuthenticated = true;
        this.emitLocal('authenticated');
      });

      // Listen for authentication error
      this.socket.on('auth_error', (error) => {
        console.error('Socket authentication failed:', error);
        monitoringService.trackSocketConnection('auth_error', { error });
        this.isAuthenticated = false;
        this.emitLocal('auth_error', error);
      });

      this.socket.on('disconnect', (reason) => {
        monitoringService.trackSocketConnection('disconnect', { reason, socketId: this.socket.id });
        this.isAuthenticated = false;
        this.emitLocal('disconnected');
        
        if (reason === 'io server disconnect') {
          this.handleReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        this.reconnectAttempts++;
        console.warn(`Socket connection error (attempt ${this.reconnectAttempts}):`, error.message);
        monitoringService.trackSocketConnection('error', { error: error.message, attempt: this.reconnectAttempts });
        this.emitLocal('connection_error', error);
        
        // Don't show error toast immediately, let it retry
        if (this.reconnectAttempts >= 3) {
          console.error('Multiple connection attempts failed. Backend may be down.');
          console.error('Stopping reconnection attempts to prevent spam');
          this.socket.disconnect();
          return;
        }
        
        // Check if it's a server unavailable error
        if (error.message.includes('xhr poll error') || error.message.includes('websocket error')) {
          console.warn('Backend server might not be running on:', socketUrl);
          console.warn('Please make sure your backend server is started and accessible');
        }
      });

      // Remove duplicate authenticated event (already handled above)

      // Message events
      this.socket.on('newMessage', (message) => {
        this.emitLocal('newMessage', message);
      });

      this.socket.on('message_updated', (message) => {
        this.emitLocal('message_updated', message);
      });

      this.socket.on('message_deleted', (messageId) => {
        this.emitLocal('message_deleted', messageId);
      });

      // Channel events
      this.socket.on('user_joined_channel', (data) => {
        this.emitLocal('user_joined_channel', data);
      });

      this.socket.on('user_left_channel', (data) => {
        this.emitLocal('user_left_channel', data);
      });

      // Voice events
      this.socket.on('voice_user_joined', (data) => {
        this.emitLocal('voice_user_joined', data);
      });

      this.socket.on('voice_user_left', (data) => {
        this.emitLocal('voice_user_left', data);
      });

      // Server events
      this.socket.on('server_updated', (server) => {
        this.emitLocal('server_updated', server);
      });

      this.socket.on('channelCreated', (channel) => {
        this.emitLocal('channelCreated', channel);
      });

      this.socket.on('channel_updated', (channel) => {
        this.emitLocal('channel_updated', channel);
      });

      this.socket.on('channelDeleted', (data) => {
        this.emitLocal('channelDeleted', data);
      });

      // User events
      this.socket.on('userStatusUpdate', (data) => {
        this.emitLocal('userStatusUpdate', data);
      });

      this.socket.on('userProfileUpdate', (data) => {
        this.emitLocal('userProfileUpdate', data);
      });

      // Friend events
      this.socket.on('friendRequestReceived', (data) => {
        this.emitLocal('friendRequestReceived', data);
      });

      this.socket.on('friendRequestAccepted', (data) => {
        this.emitLocal('friendRequestAccepted', data);
      });

      this.socket.on('friendAdded', (data) => {
        this.emitLocal('friendAdded', data);
      });

      this.socket.on('friendRemoved', (data) => {
        this.emitLocal('friendRemoved', data);
      });

      // Direct Message events
      this.socket.on('newDirectMessage', (data) => {
        this.emitLocal('newDirectMessage', data);
      });

      this.socket.on('dmSent', (data) => {
        this.emitLocal('dmSent', data);
      });

      // Typing indicators
      this.socket.on('userTyping', (data) => {
        this.emitLocal('userTyping', data);
      });

      this.socket.on('user_joined_server', (data) => {
        this.emitLocal('user_joined_server', data);
      });

      this.socket.on('user_left_server', (data) => {
        this.emitLocal('user_left_server', data);
      });

      // Voice channel events (consolidated)
      this.socket.on('voiceChannelSync', (data) => {
        this.emitLocal('voiceChannelSync', data);
      });

      this.socket.on('voiceChannelUpdate', (data) => {
        this.emitLocal('voiceChannelUpdate', data);
      });

      // WebRTC Voice Events - CRITICAL FOR VOICE CHAT
      this.socket.on('userJoinedVoice', (data) => {
        this.emitLocal('userJoinedVoice', data);
      });

      this.socket.on('userLeftVoice', (data) => {
        this.emitLocal('userLeftVoice', data);
      });

      this.socket.on('voice-signal', (data) => {
        this.emitLocal('voice-signal', data);
      });

      this.socket.on('voice-user-muted', (data) => {
        this.emitLocal('voice-user-muted', data);
      });

      this.socket.on('voice-user-deafened', (data) => {
        this.emitLocal('voice-user-deafened', data);
      });

      // Screen Sharing Events
      this.socket.on('screen-share-started', (data) => {
        this.emitLocal('screen-share-started', data);
      });

      this.socket.on('screen-share-stopped', (data) => {
        this.emitLocal('screen-share-stopped', data);
      });

      this.socket.on('screen-signal', (data) => {
        this.emitLocal('screen-signal', data);
      });

    } catch (error) {
      console.error('Error connecting to Socket.IO:', error);
      this.handleReconnect();
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emitLocal('max_reconnect_attempts_reached');
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
      try {
        // Remove all listeners before disconnecting
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch (error) {
        console.warn('Error during socket disconnect:', error);
      } finally {
        this.socket = null;
      }
    }
    this.isAuthenticated = false;
    this.currentChannel = null;
    this.connectionId = null;
    this.reconnectAttempts = 0; // Reset reconnect attempts
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

    // Prevent duplicate joins to the same channel
    if (this.currentChannel === channelId) {
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
    if (this.socket && this.socket.connected) {
      this.socket.on(event, callback);
    } else {
      // Store callback for when socket is ready
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
    // Also remove from pending listeners
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  }

  // Internal event emitter for local events
  emitLocal(event, data) {
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