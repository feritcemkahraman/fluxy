// Simple Voice Chat Service - Stack Overflow Safe Version
import websocketService from './websocket';
import electronAPI from '../utils/electronAPI';

class VoiceChatService {
  constructor() {
    this.isConnected = false;
    this.currentChannel = null;
    this.currentUserId = null;
    this.participants = [];
    this.localStream = null;
    this.isMuted = false;
    this.isDeafened = false;
    
    // Simple callback system instead of EventEmitter
    this.callbacks = {
      connected: [],
      disconnected: [],
      participantsChanged: [],
      muteChanged: [],
      deafenChanged: [],
      'speaking-changed': []
    };
  }

  // Simple event system without EventEmitter
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.callbacks[event]) {
      const index = this.callbacks[event].indexOf(callback);
      if (index > -1) {
        this.callbacks[event].splice(index, 1);
      }
    }
  }

  // Safe emit that won't cause stack overflow
  emit(event, data) {
    if (this.callbacks[event]) {
      // Call immediately instead of setTimeout to prevent unmount issues
      this.callbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Callback error:', error);
        }
      });
    } else {
      console.warn('❌ No callbacks for event:', event);
    }
  }

  // Enhanced getUserMedia for Electron
  async getUserMedia() {
    try {
      // Enhanced audio constraints for desktop app
      const constraints = {
        audio: {
          // Browser built-in processing
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          
          // Quality settings for desktop
          sampleRate: 48000,
          channelCount: 1,
          
          // Advanced Chrome settings (works in Electron)
          googEchoCancellation: true,
          googNoiseSuppression: true,
          googAutoGainControl: true,
          googHighpassFilter: true,
          googTypingNoiseDetection: true,
          
          // Latency optimization for desktop
          latency: 0.01 // 10ms target latency
        }
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      // console.log('✅ Enhanced audio stream acquired for desktop');
      return this.localStream;
    } catch (error) {
      console.error('❌ Enhanced audio failed, falling back to basic:', error);
      
      // Fallback to basic audio
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return this.localStream;
      } catch (basicError) {
        console.error('❌ Basic audio also failed:', basicError);
        throw basicError;
      }
    }
  }

  // Join voice channel
  async joinChannel(channelId) {
    try {
      // Check if already connected to this channel
      if (this.isConnected && this.currentChannel === channelId) {
        // Already connected, just emit events
        this.emit('connected', { channelId });
        this.emit('participantsChanged', this.participants);
        return true;
      }
      
      // Get enhanced microphone access for desktop (only if not already connected)
      if (!this.localStream) {
        await this.getUserMedia();
      }
      
      this.isConnected = true;
      this.currentChannel = channelId;
      
      // Create proper participant object for current user
      const currentUserData = {
        id: this.currentUserId,
        _id: this.currentUserId,
        username: this.currentUser?.username || 'Unknown User',
        displayName: this.currentUser?.displayName || this.currentUser?.username || 'Unknown User',
        avatar: this.currentUser?.avatar,
        status: this.currentUser?.status || 'online'
      };
      
      this.participants = [{
        user: currentUserData,
        isMuted: this.isMuted,
        isDeafened: this.isDeafened,
        isCurrentUser: true,
        isSpeaking: false
      }];
      
      console.log('🎤 Created participant for current user:', currentUserData);
      
      // Notify server
      if (websocketService.socket?.connected) {
        websocketService.socket.emit('join-voice-channel', { channelId });
      }
      
      this.emit('connected', { channelId });
      this.emit('participantsChanged', this.participants);
      return true;
    } catch (error) {
      console.error('❌ Voice join failed:', error);
      
      // Show error notification on desktop
      if (electronAPI.isElectron()) {
        electronAPI.showNotification('Fluxy - Hata', `Ses kanalına katılamadı: ${error.message}`);
      }
      
      throw error;
    }
  }

  // Leave voice channel
  async leaveChannel() {
    try {
      // console.log('🚪 Leaving voice channel:', this.currentChannel);
      
      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
      
      const leftChannel = this.currentChannel;
      
      // Notify server
      if (websocketService.socket?.connected && leftChannel) {
        websocketService.socket.emit('leave-voice-channel', { channelId: leftChannel });
      }
      
      this.isConnected = false;
      this.currentChannel = null;
      this.participants = [];
      
      // Voice channel leave notification removed as requested
      
      this.emit('disconnected', { channelId: leftChannel });
      this.emit('participantsChanged', []);
      
      return true;
    } catch (error) {
      console.error('❌ Voice leave failed:', error);
      throw error;
    }
  }

  // Toggle mute with desktop integration
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    
    // Desktop notification for mute status removed as requested
    
    this.emit('muteChanged', this.isMuted);
  }

  // Toggle deafen with desktop integration
  toggleDeafen() {
    this.isDeafened = !this.isDeafened;
    
    // Deafen yapıldığında otomatik mute da olmalı (Discord gibi)
    if (this.isDeafened && !this.isMuted) {
      this.isMuted = true;
      this.emit('muteChanged', this.isMuted);
    }
    
    // Desktop notification for deafen status removed as requested
    
    this.emit('deafenChanged', this.isDeafened);
  }

  // Get current state
  getState() {
    return {
      isConnected: this.isConnected,
      currentChannel: this.currentChannel,
      participants: this.participants,
      isMuted: this.isMuted,
      isDeafened: this.isDeafened
    };
  }

  // Alias for getState (backward compatibility)
  getStatus() {
    return this.getState();
  }

  // Set user ID and user data
  setCurrentUserId(userId) {
    this.currentUserId = userId;
  }

  setCurrentUser(user) {
    this.currentUser = user;
    this.currentUserId = user?._id || user?.id;
    console.log('🎤 Voice chat user set:', {
      userId: this.currentUserId,
      username: user?.username,
      displayName: user?.displayName
    });
  }

  // Desktop-specific: Check if running in Electron
  isElectronApp() {
    return electronAPI.isElectron();
  }
}

// Export singleton instance
export default new VoiceChatService();
