class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isAuthenticated = false;
    this.currentChannel = null;
    this.connectionId = null;
  }

  connect(token) {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      // Use configured WebSocket URL (ngrok backend)
      const wsUrl = process.env.REACT_APP_WS_URL;
      
      if (!wsUrl) {
        console.error('REACT_APP_WS_URL is not configured');
        return;
      }
      
      console.log('Connecting to WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected to ngrok backend');
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        // Authenticate immediately after connection
        if (token) {
          this.authenticate(token);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isAuthenticated = false;
        this.currentChannel = null;
        this.emit('disconnected', { code: event.code, reason: event.reason });
        
        // Attempt to reconnect if not a manual close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(token);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.emit('error', error);
    }
  }

  scheduleReconnect(token) {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect(token);
      }
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.isAuthenticated = false;
    this.currentChannel = null;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket not connected, cannot send message:', message);
    return false;
  }

  authenticate(token) {
    return this.send({
      type: 'authenticate',
      data: { token }
    });
  }

  joinChannel(channelId) {
    if (!this.isAuthenticated) {
      console.warn('Cannot join channel: not authenticated');
      return false;
    }
    
    this.currentChannel = channelId;
    return this.send({
      type: 'joinChannel',
      data: { channelId }
    });
  }

  leaveChannel(channelId) {
    if (!this.isAuthenticated) {
      console.warn('Cannot leave channel: not authenticated');
      return false;
    }
    
    if (this.currentChannel === channelId) {
      this.currentChannel = null;
    }
    
    return this.send({
      type: 'leaveChannel',
      data: { channelId }
    });
  }

  sendMessage(channelId, content, serverId) {
    if (!this.isAuthenticated) {
      console.warn('Cannot send message: not authenticated');
      return false;
    }
    
    return this.send({
      type: 'sendMessage',
      data: { channelId, content, serverId }
    });
  }

  sendTyping(channelId, isTyping) {
    if (!this.isAuthenticated) {
      return false;
    }
    
    return this.send({
      type: 'typing',
      data: { channelId, isTyping }
    });
  }

  addReaction(messageId, emoji, channelId) {
    if (!this.isAuthenticated) {
      console.warn('Cannot add reaction: not authenticated');
      return false;
    }
    
    return this.send({
      type: 'reaction',
      data: { messageId, emoji, channelId }
    });
  }

  handleMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'authenticated':
        this.isAuthenticated = true;
        console.log('WebSocket authenticated');
        this.emit('authenticated', data);
        break;
        
      case 'newMessage':
        this.emit('newMessage', data);
        break;
        
      case 'userTyping':
        this.emit('userTyping', data);
        break;
        
      case 'reactionUpdate':
        this.emit('reactionUpdate', data);
        break;
        
      case 'userJoinedChannel':
        this.emit('userJoinedChannel', data);
        break;
        
      case 'userLeftChannel':
        this.emit('userLeftChannel', data);
        break;
        
      default:
        console.log('Unhandled message type:', type, data);
    }
  }

  // Event listener management
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
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }

  // Compatibility methods for existing code
  joinServer(serverId) {
    console.log('joinServer called (WebSocket implementation):', serverId);
    // In WebSocket implementation, server joining might be handled differently
  }

  leaveServer(serverId) {
    console.log('leaveServer called (WebSocket implementation):', serverId);
  }

  joinVoiceChannel(channelId) {
    console.log('joinVoiceChannel called (WebSocket implementation):', channelId);
    // Voice chat requires additional WebRTC implementation
  }

  leaveVoiceChannel() {
    console.log('leaveVoiceChannel called (WebSocket implementation)');
  }

  updateUserStatus(status) {
    console.log('updateUserStatus called (WebSocket implementation):', status);
  }

  // Voice and screen sharing methods (placeholder for future implementation)
  joinVoiceChannelWebRTC(channelId, userId) {
    console.log('Voice WebRTC not yet implemented for WebSocket API');
  }

  leaveVoiceChannelWebRTC(channelId, userId) {
    console.log('Voice WebRTC not yet implemented for WebSocket API');
  }

  sendVoiceSignal(signal, userId, channelId, fromUserId) {
    console.log('Voice signaling not yet implemented for WebSocket API');
  }

  sendVoiceMuteStatus(channelId, isMuted, userId) {
    console.log('Voice mute status not yet implemented for WebSocket API');
  }

  sendVoiceDeafenStatus(channelId, isDeafened, userId) {
    console.log('Voice deafen status not yet implemented for WebSocket API');
  }

  startScreenShare(channelId, userId) {
    console.log('Screen sharing not yet implemented for WebSocket API');
  }

  stopScreenShare(channelId, userId) {
    console.log('Screen sharing not yet implemented for WebSocket API');
  }

  sendScreenSignal(signal, userId, channelId, fromUserId) {
    console.log('Screen signaling not yet implemented for WebSocket API');
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  getConnectionInfo() {
    return {
      connected: this.isConnected(),
      authenticated: this.isAuthenticated,
      currentChannel: this.currentChannel,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;
export { webSocketService };