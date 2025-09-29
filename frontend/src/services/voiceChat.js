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

  // Screen sharing functionality
  async startScreenShare(options = {}) {
    try {
      console.log('🖥️ Starting screen share...');
      
      let constraints;
      
      // Electron-specific screen picker
      if (electronAPI.isElectron()) {
        console.log('🖥️ Using Electron screen picker...');
        
        let sourceId;
        
        // If source is provided from picker, use it
        if (options.sourceId) {
          sourceId = options.sourceId;
          console.log('🖥️ Using selected source:', options.sourceName);
        } else {
          // Fallback: get available sources and use first screen
          const sources = await electronAPI.getDesktopSources();
          
          if (!sources || sources.length === 0) {
            throw new Error('No screen sources available');
          }
          
          const primaryScreen = sources.find(source => source.id.startsWith('screen:')) || sources[0];
          sourceId = primaryScreen.id;
        }
        
        constraints = {
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              // Enhanced quality for Electron
              minWidth: 1280,
              maxWidth: 1920,
              minHeight: 720,
              maxHeight: 1080,
              minFrameRate: 15,
              maxFrameRate: 60
            }
          },
          audio: options.includeAudio ? {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            }
          } : false
        };
        
        console.log('🖥️ Electron screen source selected:', options.sourceName || 'Primary Screen');
      } else {
        // Web browser fallback
        constraints = {
          video: {
            mediaSource: 'screen',
            // High quality settings
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: {
            // Include system audio if available
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000
          }
        };
      }

      // Get screen stream with enhanced quality
      this.screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      console.log('✅ Screen capture successful:', {
        video: this.screenStream.getVideoTracks()[0]?.getSettings(),
        audio: this.screenStream.getAudioTracks()[0]?.getSettings()
      });

      // Notify server
      if (websocketService.socket?.connected && this.currentChannel) {
        websocketService.socket.emit('start-screen-share', {
          channelId: this.currentChannel,
          userId: this.currentUserId
        });
      }

      // Handle stream end (user stops sharing)
      this.screenStream.getVideoTracks()[0].onended = () => {
        console.log('🖥️ Screen share ended by user');
        this.stopScreenShare();
      };

      this.emit('screen-share-started', {
        userId: this.currentUserId,
        stream: this.screenStream
      });

      return this.screenStream;
    } catch (error) {
      console.error('❌ Screen share failed:', error);
      
      // User-friendly error messages
      let errorMessage = 'Ekran paylaşımı başlatılamadı';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Ekran paylaşımı izni reddedildi';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Paylaşılacak ekran bulunamadı';
      }

      if (electronAPI.isElectron()) {
        electronAPI.showNotification('Fluxy - Ekran Paylaşımı', errorMessage);
      }
      
      throw new Error(errorMessage);
    }
  }

  // Stop screen sharing
  async stopScreenShare() {
    try {
      console.log('🖥️ Stopping screen share...');
      
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
        this.screenStream = null;
      }

      // Notify server
      if (websocketService.socket?.connected && this.currentChannel) {
        websocketService.socket.emit('stop-screen-share', {
          channelId: this.currentChannel,
          userId: this.currentUserId
        });
      }

      this.emit('screen-share-stopped', {
        userId: this.currentUserId
      });

      console.log('✅ Screen share stopped');
      return true;
    } catch (error) {
      console.error('❌ Stop screen share failed:', error);
      throw error;
    }
  }

  // Check if currently screen sharing
  isScreenSharing() {
    return this.screenStream && this.screenStream.active;
  }

  // Get screen sharing quality settings
  getScreenQuality() {
    if (!this.screenStream) return null;
    
    const videoTrack = this.screenStream.getVideoTracks()[0];
    if (!videoTrack) return null;
    
    return videoTrack.getSettings();
  }

  // Adjust screen sharing quality
  async adjustScreenQuality(quality = 'high') {
    if (!this.screenStream) return;
    
    const videoTrack = this.screenStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const constraints = {
      high: { width: 1920, height: 1080, frameRate: 30 },
      medium: { width: 1280, height: 720, frameRate: 24 },
      low: { width: 854, height: 480, frameRate: 15 }
    };

    try {
      await videoTrack.applyConstraints({
        ...constraints[quality],
        mediaSource: 'screen'
      });
      
      console.log(`🖥️ Screen quality adjusted to: ${quality}`);
    } catch (error) {
      console.warn('⚠️ Quality adjustment failed:', error);
    }
  }

  // Desktop-specific: Check if running in Electron
  isElectronApp() {
    return electronAPI.isElectron();
  }
}

// Export singleton instance
export default new VoiceChatService();
