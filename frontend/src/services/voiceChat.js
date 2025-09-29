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

  // Screen sharing functionality - ELECTRON-FIRST APPROACH
  async startScreenShare(options = {}) {
    try {
      console.log('🖥️ Starting screen share (Electron-First)...');
      
      let constraints = null;
      
      // PRIMARY: Electron native implementation
      if (electronAPI.isElectron()) {
        console.log('🖥️ Using Electron screen picker...');
        
        let sourceId;
        
        console.log('🔍 Screen share options received:', options);
        
        // If source is provided from picker, use it
        if (options.sourceId) {
          sourceId = options.sourceId;
          console.log('🖥️ Using selected source ID:', sourceId, 'Name:', options.sourceName);
        } else {
          console.log('⚠️ No sourceId provided, using fallback');
          // Fallback: get available sources and use first screen
          const sources = await electronAPI.getDesktopSources();
          
          if (!sources || sources.length === 0) {
            throw new Error('No screen sources available');
          }
          
          const primaryScreen = sources.find(source => source.id.startsWith('screen:')) || sources[0];
          sourceId = primaryScreen.id;
          console.log('🔄 Fallback to:', sourceId);
        }
        
        // For window sharing, audio often fails - try video first
        const isWindowShare = sourceId.startsWith('window:');
        
        // Apply quality settings from options
        const quality = options.quality || { width: 1920, height: 1080, frameRate: 60 };
        console.log('🎯 Applying quality settings:', quality);
        
        // 144Hz optimization - add minimum constraints for high refresh
        const is144Hz = quality.frameRate >= 144;
        if (is144Hz) {
          console.log('⚡ 144Hz mode detected - applying optimizations');
        }
        
        constraints = {
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              // Dynamic quality constraints based on user selection
              maxWidth: quality.width,
              maxHeight: quality.height,
              maxFrameRate: quality.frameRate,
              // 144Hz optimization - force minimum frame rate
              ...(is144Hz && {
                minFrameRate: 120, // Minimum 120 FPS for 144Hz mode
                minWidth: quality.width,
                minHeight: quality.height
              })
            }
          },
          audio: (options.includeAudio && !isWindowShare) ? {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            }
          } : false
        };
        
        // Log warning for window audio
        if (options.includeAudio && isWindowShare) {
          console.warn('⚠️ Audio sharing not supported for window capture, using video only');
        }
        
        console.log('🖥️ Electron screen source selected:', options.sourceName || 'Primary Screen');
        console.log('🔧 Electron constraints:', JSON.stringify(constraints, null, 2));
      } else {
        // FALLBACK: Web browser (limited functionality)
        console.warn('⚠️ Running in browser mode - limited screen sharing capabilities');
        console.warn('💡 For best experience, use the Electron desktop app');
        
        const quality = options.quality || { width: 1920, height: 1080, frameRate: 60 };
        console.log('🌐 Browser fallback quality:', quality);
        
        // Simplified constraints for browser fallback
        constraints = {
          video: {
            width: { ideal: Math.min(quality.width, 1920) }, // Limit browser resolution
            height: { ideal: Math.min(quality.height, 1080) },
            frameRate: { ideal: Math.min(quality.frameRate, 60) }, // Limit browser FPS
            cursor: 'always'
          },
          audio: options.includeAudio !== false ? {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          } : false
        };
        
        // Browser limitations warning
        if (quality.frameRate > 60) {
          console.warn('⚠️ Browser fallback: 144Hz not supported, using 60Hz');
        }
      }

      // Get screen stream with enhanced quality
      if (electronAPI.isElectron()) {
        // For Electron, use getUserMedia with desktop source
        try {
          this.screenStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (audioError) {
          // If audio fails, try video only
          if (audioError.name === 'NotReadableError' && constraints.audio) {
            console.warn('⚠️ Audio capture failed, retrying with video only:', audioError.message);
            const videoOnlyConstraints = {
              ...constraints,
              audio: false
            };
            this.screenStream = await navigator.mediaDevices.getUserMedia(videoOnlyConstraints);
          } else {
            throw audioError;
          }
        }
      } else {
        // Use getDisplayMedia for browser
        this.screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      }
      
      const videoTrack = this.screenStream.getVideoTracks()[0];
      const audioTrack = this.screenStream.getAudioTracks()[0];
      
      console.log('✅ Screen capture successful:', {
        video: videoTrack?.getSettings(),
        audio: audioTrack?.getSettings()
      });

      // 144Hz performance monitoring
      if (videoTrack && options.quality?.frameRate >= 144) {
        const settings = videoTrack.getSettings();
        console.log('⚡ 144Hz Performance Check:', {
          actualFrameRate: settings.frameRate,
          actualWidth: settings.width,
          actualHeight: settings.height,
          isOptimal: settings.frameRate >= 120
        });
        
        if (settings.frameRate < 120) {
          console.warn('⚠️ 144Hz mode aktif ama gerçek FPS düşük:', settings.frameRate);
          console.warn('💡 Sistem performansını kontrol edin (GPU, CPU kullanımı)');
        }
      }

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
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        constraints: constraints
      });
      
      // User-friendly error messages
      let errorMessage = 'Ekran paylaşımı başlatılamadı';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Ekran paylaşımı izni reddedildi';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Paylaşılacak ekran bulunamadı';
      } else if (error.message.includes('min constraints')) {
        errorMessage = 'Ekran paylaşımı ayarları desteklenmiyor';
      } else if (error.message.includes('getDisplayMedia')) {
        errorMessage = 'Tarayıcı ekran paylaşımını desteklemiyor';
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
