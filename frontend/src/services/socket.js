import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    // Prevent multiple connection attempts
    if (this.socket?.connecting || this.socket?.connected) {
      return;
    }


    this.socket = io(SOCKET_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 3, // Reduced for less spam
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000, // Reduced
      randomizationFactor: 0.5,
      forceNew: false, // Changed to prevent conflicts
      upgrade: true,
      rememberUpgrade: true
    });

    this.socket.on('connect', () => {
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.emit('disconnected', reason);

      // If disconnected due to authentication error, don't try to reconnect
      if (reason === 'io server disconnect') {
        this.emit('authError');
      }
    });

    this.socket.on('connect_error', (error) => {
      this.emit('connectionError', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.emit('reconnected', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      // Handle reconnection error if needed
    });

    this.socket.on('reconnect_failed', () => {
      this.emit('reconnectFailed');
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  setupEventListeners() {
    // New message received
    this.socket.on('newMessage', (message) => {
      this.emit('newMessage', message);
    });

    // User status updates
    this.socket.on('userStatusUpdate', (data) => {
      this.emit('userStatusUpdate', data);
    });

    // Voice channel updates
    this.socket.on('voiceChannelUpdate', (data) => {
      this.emit('voiceChannelUpdate', data);
    });

    this.socket.on('userJoinedVoice', (data) => {
      this.emit('userJoinedVoice', data);
    });

    this.socket.on('userLeftVoice', (data) => {
      this.emit('userLeftVoice', data);
    });

    // Typing indicators
    this.socket.on('userTyping', (data) => {
      this.emit('userTyping', data);
    });

    // Message reactions
    this.socket.on('reactionUpdate', (data) => {
      this.emit('reactionUpdate', data);
    });

    // Voice chat events
    this.socket.on('voice-user-joined', (data) => {
      this.emit('voice-user-joined', data);
    });

    this.socket.on('voice-user-left', (data) => {
      this.emit('voice-user-left', data);
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

    // Screen sharing events
    this.socket.on('screen-share-started', (data) => {
      this.emit('screen-share-started', data);
    });

    this.socket.on('screen-share-stopped', (data) => {
      this.emit('screen-share-stopped', data);
    });

    this.socket.on('screen-signal', (data) => {
      this.emit('screen-signal', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      this.emit('error', error);
    });
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  // Socket actions
  joinServer(serverId) {
    if (this.socket?.connected) {
      this.socket.emit('joinServer', serverId);
    }
  }

  leaveServer(serverId) {
    if (this.socket?.connected) {
      this.socket.emit('leaveServer', serverId);
    }
  }

  sendMessage(messageData) {
    if (this.socket?.connected) {
      this.socket.emit('sendMessage', messageData);
    }
  }

  joinVoiceChannel(channelId) {
    if (this.socket?.connected) {
      this.socket.emit('joinVoiceChannel', { channelId });
    }
  }

  leaveVoiceChannel() {
    if (this.socket?.connected) {
      this.socket.emit('leaveVoiceChannel');
    }
  }

  sendTyping(channelId, serverId, isTyping) {
    if (this.socket?.connected) {
      this.socket.emit('typing', { channelId, serverId, isTyping });
    }
  }

  addReaction(messageId, emoji) {
    if (this.socket?.connected) {
      this.socket.emit('addReaction', { messageId, emoji });
    }
  }

  updateUserStatus(status) {
    if (this.socket?.connected) {
      this.socket.emit('updateUserStatus', { status });
    }
  }

  // Voice chat methods
  joinVoiceChannelWebRTC(channelId, userId) {
    if (this.socket?.connected) {
      this.socket.emit('join-voice-channel', { channelId, userId });
    }
  }

  leaveVoiceChannelWebRTC(channelId, userId) {
    if (this.socket?.connected) {
      this.socket.emit('leave-voice-channel', { channelId, userId });
    }
  }

  sendVoiceSignal(signal, userId, channelId, fromUserId) {
    if (this.socket?.connected) {
      this.socket.emit('voice-signal', { signal, userId, channelId, fromUserId });
    }
  }

  sendVoiceMuteStatus(channelId, isMuted, userId) {
    if (this.socket?.connected) {
      this.socket.emit('voice-mute-status', { channelId, isMuted, userId });
    }
  }

  sendVoiceDeafenStatus(channelId, isDeafened, userId) {
    if (this.socket?.connected) {
      this.socket.emit('voice-deafen-status', { channelId, isDeafened, userId });
    }
  }

  // Screen sharing methods
  startScreenShare(channelId, userId) {
    if (this.socket?.connected) {
      this.socket.emit('start-screen-share', { channelId, userId });
    }
  }

  stopScreenShare(channelId, userId) {
    if (this.socket?.connected) {
      this.socket.emit('stop-screen-share', { channelId, userId });
    }
  }

  sendScreenSignal(signal, userId, channelId, fromUserId) {
    if (this.socket?.connected) {
      this.socket.emit('screen-signal', { signal, userId, channelId, fromUserId });
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
export { socketService };
