// Simple Voice Chat Service - Stack Overflow Safe Version
import websocketService from './websocket';
import EventEmitter from 'events';
import logger from '../utils/logger';

// Global Electron API access
const electronAPI = window.electronAPI || {};

class VoiceChatService extends EventEmitter {
  constructor() {
    super();
    this.isConnected = false;
    this.currentChannel = null;
    this.currentUserId = null;
    this.participants = [];
    this.localStream = null;
    this.screenStream = null;
    this.currentUser = null;
    this.isMuted = false;
    this.isDeafened = false;
    
    // WebRTC Mesh Network (Discord-like group calls)
    this.peerConnections = new Map(); // userId -> RTCPeerConnection
    this.remoteStreams = new Map(); // userId -> MediaStream
    this.webrtcListenersSetup = false; // Prevent duplicate listeners
    
    // Discord-level RTC Configuration with FREE TURN servers
    this.rtcConfig = {
      iceServers: [
        // STUN servers (for NAT traversal)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.relay.metered.ca:80' },
        
        // FREE TURN servers (for firewall bypass)
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      // Discord-level ICE parameters
      iceTransportPolicy: 'all', // Use both STUN and TURN
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };
    
    // Voice Activity Detection (Discord-like)
    this.vadEnabled = true;
    this.vadThreshold = 25; // Speaking threshold
    this.isSpeaking = false;
    this.vadAnalyser = null;
    this.vadCheckInterval = null;
    
    // Network quality monitoring
    this.networkStats = new Map(); // userId -> stats
    this.statsCheckInterval = null;
    
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
          logger.error('Callback error:', error);
        }
      });
    } else {
      logger.warn('❌ No callbacks for event:', event);
    }
  }

  // Enhanced getUserMedia for Electron - Discord-level quality
  async getUserMedia() {
    // Try to get saved deviceId from settings (if any)
    let savedDeviceId = null;
    try {
      const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
      savedDeviceId = settings?.voice?.inputDevice;
    } catch (e) {
      // Ignore settings parsing errors
    }

    try {
      // Discord Standard Mode - Maximum voice quality
      const constraints = {
        audio: {
          // Use saved deviceId if available, otherwise let browser choose
          ...(savedDeviceId && savedDeviceId !== 'default' ? { deviceId: { ideal: savedDeviceId } } : {}),
          
          // Core WebRTC processing (natural, not robotic)
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          
          // Discord-quality audio (48kHz Opus codec)
          sampleRate: { ideal: 48000, min: 48000 }, // Force 48kHz
          sampleSize: { ideal: 16 },
          channelCount: { ideal: 1 }, // Mono for voice
          
          // Low latency for real-time communication
          latency: { ideal: 0.01, max: 0.02 },
          
          // Chrome-specific optimizations (Discord uses these)
          googEchoCancellation: { ideal: true },
          googNoiseSuppression: { ideal: true },
          googAutoGainControl: { ideal: true },
          googHighpassFilter: { ideal: true },
          googTypingNoiseDetection: { ideal: true },
          googAudioMirroring: { ideal: false }
        }
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      logger.log('✅ Discord-level audio processing enabled');
      
      // Setup Voice Activity Detection (VAD)
      if (this.vadEnabled) {
        this.setupVAD();
      }
      
      return this.localStream;
    } catch (error) {
      logger.error('❌ Enhanced audio failed, falling back to basic:', error);
      
      // Fallback 1: Try without specific deviceId (in case device not found)
      try {
        const basicConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };
        
        this.localStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
        logger.log('✅ Basic audio with processing enabled');
        return this.localStream;
      } catch (fallbackError) {
        logger.error('❌ Basic audio with processing failed, trying minimal:', fallbackError);
        
        // Fallback 2: Absolute minimal - just audio: true
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          logger.log('⚠️ Minimal audio mode (no processing)');
          return this.localStream;
        } catch (minimalError) {
          logger.error('❌ All audio attempts failed:', minimalError);
          throw minimalError;
        }
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
      
      // Try to get microphone access (optional - allow listen-only mode)
      let hasAudioInput = false;
      if (!this.localStream) {
        try {
          await this.getUserMedia();
          hasAudioInput = true;
          logger.log('✅ Microphone access granted');
        } catch (micError) {
          logger.warn('⚠️ No microphone access - joining in listen-only mode:', micError.message);
          // Continue without microphone (listen-only mode)
          hasAudioInput = false;
          this.isMuted = true; // Auto-mute since no mic available
          
          // Show user-friendly notification
          this.emit('info', {
            type: 'listen-only',
            message: 'Mikrofonunuz bulunamadı. Sadece dinleme modunda katılıyorsunuz.'
          });
        }
      } else {
        hasAudioInput = true;
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
      
      // Setup WebRTC signaling listeners
      this.setupWebRTCSignaling();
      
      // Notify server
      if (websocketService.socket?.connected) {
        websocketService.socket.emit('join-voice-channel', { channelId });
      }
      
      this.emit('connected', { channelId });
      this.emit('participantsChanged', this.participants);
      return true;
    } catch (error) {
      logger.error('❌ Voice join failed:', error);
      
      // Show error notification on desktop
      if (electronAPI.isElectron?.()) {
        electronAPI.showNotification?.('Fluxy - Hata', `Ses kanalına katılamadı: ${error.message}`);
      }
      
      throw error;
    }
  }

  // Leave voice channel
  async leaveChannel() {
    try {
      // logger.log('🚺 Leaving voice channel:', this.currentChannel);
      
      // Stop VAD monitoring
      this.stopVADMonitoring();
      
      // Close all peer connections
      this.peerConnections.forEach((pc, userId) => {
        this.closePeerConnection(userId);
      });
      
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
      logger.error('❌ Voice leave failed:', error);
      throw error;
    }
  }

  // Toggle mute with desktop integration + real-time broadcast
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    
    // Broadcast mute status to server
    if (websocketService.socket?.connected && this.currentChannel) {
      websocketService.socket.emit('voice-mute-status', {
        channelId: this.currentChannel,
        isMuted: this.isMuted,
        userId: this.currentUserId
      });
      // logger.log(`🔇 Mute status sent to server: ${this.isMuted}`);
    }
    
    this.emit('muteChanged', this.isMuted);
  }

  // Toggle deafen with desktop integration + real-time broadcast
  toggleDeafen() {
    this.isDeafened = !this.isDeafened;
    
    // Deafen yapıldığında otomatik mute da olmalı (Discord gibi)
    if (this.isDeafened && !this.isMuted) {
      this.isMuted = true;
      this.emit('muteChanged', this.isMuted);
      
      // Disable local audio tracks
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }
      
      // Also broadcast mute status
      if (websocketService.socket?.connected && this.currentChannel) {
        websocketService.socket.emit('voice-mute-status', {
          channelId: this.currentChannel,
          isMuted: this.isMuted,
          userId: this.currentUserId
        });
      }
    }
    
    // Mute/unmute all remote audio elements (Discord-like deafen)
    const audioElements = document.querySelectorAll('audio[data-user-id]');
    audioElements.forEach(audioElement => {
      audioElement.volume = this.isDeafened ? 0 : 1.0;
    });
    
    // Broadcast deafen status to server
    if (websocketService.socket?.connected && this.currentChannel) {
      websocketService.socket.emit('voice-deafen-status', {
        channelId: this.currentChannel,
        isDeafened: this.isDeafened,
        userId: this.currentUserId
      });
      // logger.log(`🔇 Deafen status sent to server: ${this.isDeafened}`);
    }
    
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
  }

  // Screen sharing functionality - ELECTRON-FIRST APPROACH
  async startScreenShare(options = {}) {
    try {
      logger.log('🖥️ Starting screen share (Electron-First)...');
      
      let constraints = null;
      
      // PRIMARY: Electron native implementation
      if (electronAPI.isElectron?.()) {
        
        let sourceId;
        
        logger.log('🔍 Screen share options received:', options);
        
        // If source is provided from picker, use it
        if (options.sourceId) {
          sourceId = options.sourceId;
          logger.log('🖥️ Using selected source ID:', sourceId, 'Name:', options.sourceName);
        } else {
          logger.log('⚠️ No sourceId provided, using fallback');
          // Fallback: get available sources and use first screen
          const sources = await electronAPI.getDesktopSources();
          
          if (!sources || sources.length === 0) {
            throw new Error('No screen sources available');
          }
          
          const primaryScreen = sources.find(source => source.id.startsWith('screen:')) || sources[0];
          sourceId = primaryScreen.id;
          logger.log('🔄 Fallback to:', sourceId);
        }
        
        // For window sharing, audio often fails - try video first
        const isWindowShare = sourceId.startsWith('window:');
        
        // Apply quality settings from options
        const quality = options.quality || { width: 1920, height: 1080, frameRate: 60 };
        logger.log('🎯 Applying quality settings:', quality);
        
        // 144Hz optimization - add minimum constraints for high refresh
        const is144Hz = quality.frameRate >= 144;
        if (is144Hz) {
          logger.log('⚡ 144Hz mode detected - applying optimizations');
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
          logger.warn('⚠️ Audio sharing not supported for window capture, using video only');
        }
        
        logger.log('🖥️ Electron screen source selected:', options.sourceName || 'Primary Screen');
        logger.log('🔧 Electron constraints:', JSON.stringify(constraints, null, 2));
      } else {
        // FALLBACK: Web browser (limited functionality)
        logger.warn('⚠️ Running in browser mode - limited screen sharing capabilities');
        logger.warn('💡 For best experience, use the Electron desktop app');
        
        const quality = options.quality || { width: 1920, height: 1080, frameRate: 60 };
        logger.log('🌐 Browser fallback quality:', quality);
        
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
          logger.warn('⚠️ Browser fallback: 144Hz not supported, using 60Hz');
        }
      }

      // Get screen stream with enhanced quality
      if (electronAPI.isElectron?.()) {
        // For Electron, use getUserMedia with desktop source
        try {
          this.screenStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (audioError) {
          // If audio fails, try video only
          if (audioError.name === 'NotReadableError' && constraints.audio) {
            logger.warn('⚠️ Audio capture failed, retrying with video only:', audioError.message);
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
      
      logger.log('✅ Screen capture successful:', {
        video: videoTrack?.getSettings(),
        audio: audioTrack?.getSettings()
      });

      // 144Hz performance monitoring
      if (videoTrack && options.quality?.frameRate >= 144) {
        const settings = videoTrack.getSettings();
        logger.log('⚡ 144Hz Performance Check:', {
          actualFrameRate: settings.frameRate,
          actualWidth: settings.width,
          actualHeight: settings.height,
          isOptimal: settings.frameRate >= 120
        });
        
        if (settings.frameRate < 120) {
          logger.warn('⚠️ 144Hz mode aktif ama gerçek FPS düşük:', settings.frameRate);
          logger.warn('💡 Sistem performansını kontrol edin (GPU, CPU kullanımı)');
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
        logger.log('🖥️ Screen share ended by user');
        this.stopScreenShare();
      };

      this.emit('screen-share-started', {
        userId: this.currentUserId,
        stream: this.screenStream
      });

      return this.screenStream;
    } catch (error) {
      logger.error('❌ Screen share failed:', error);
      logger.error('Error details:', {
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

      if (electronAPI.isElectron?.()) {
        electronAPI.showNotification?.('Fluxy - Ekran Paylaşımı', errorMessage);
      }
      
      throw new Error(errorMessage);
    }
  }

  // Stop screen sharing
  async stopScreenShare() {
    try {
      logger.log('🖥️ Stopping screen share...');
      
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

      logger.log('✅ Screen share stopped');
      return true;
    } catch (error) {
      logger.error('❌ Stop screen share failed:', error);
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
      
      logger.log(`🖥️ Screen quality adjusted to: ${quality}`);
    } catch (error) {
      logger.warn('⚠️ Quality adjustment failed:', error);
    }
  }

  // Apply advanced audio processing (Discord-like)
  async applyAdvancedAudioProcessing() {
    try {
      if (!this.localStream) return;
      
      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(this.localStream);
      const destination = audioContext.createMediaStreamDestination();
      
      // 1. High-pass filter (remove low frequency noise like breathing)
      const highpassFilter = audioContext.createBiquadFilter();
      highpassFilter.type = 'highpass';
      highpassFilter.frequency.value = 100; // Cut below 100Hz (breathing, wind)
      highpassFilter.Q.value = 0.7;
      
      // 2. Compressor (normalize volume, Discord-like)
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -50; // Start compressing at -50dB
      compressor.knee.value = 40;
      compressor.ratio.value = 12; // Aggressive compression
      compressor.attack.value = 0.003; // 3ms attack
      compressor.release.value = 0.25; // 250ms release
      
      // 3. Noise gate (cut very quiet sounds)
      const noiseGate = audioContext.createGain();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      
      // Connect nodes
      source.connect(highpassFilter);
      highpassFilter.connect(compressor);
      compressor.connect(noiseGate);
      noiseGate.connect(analyser);
      analyser.connect(destination);
      
      // Noise gate logic (Discord-like)
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      // THROTTLED: Check every 100ms instead of every frame (CPU optimization)
      let lastNoiseCheckTime = 0;
      const NOISE_CHECK_INTERVAL = 100;
      
      const checkNoise = (timestamp) => {
        if (!this.localStream || !this.localStream.active) return;
        
        if (timestamp - lastNoiseCheckTime >= NOISE_CHECK_INTERVAL) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          
          // Threshold: if sound is below 25, mute it (noise gate)
          if (average < 25) {
            noiseGate.gain.setValueAtTime(0, audioContext.currentTime);
          } else {
            noiseGate.gain.setValueAtTime(1, audioContext.currentTime);
          }
          
          lastNoiseCheckTime = timestamp;
        }
        
        if (this.localStream && this.localStream.active) {
          requestAnimationFrame(checkNoise);
        }
      };
      requestAnimationFrame(checkNoise);
      
      // Replace original stream with processed stream
      const processedTrack = destination.stream.getAudioTracks()[0];
      const originalTrack = this.localStream.getAudioTracks()[0];
      
      this.localStream.removeTrack(originalTrack);
      this.localStream.addTrack(processedTrack);
      originalTrack.stop();
      
      logger.log('✅ Advanced audio processing applied (noise gate + compressor + highpass)');
    } catch (error) {
      logger.warn('⚠️ Advanced audio processing failed, using basic:', error);
    }
  }

  // ==================== VOICE ACTIVITY DETECTION (Discord-like) ====================
  
  // Setup Voice Activity Detection
  setupVAD() {
    if (!this.localStream) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(this.localStream);
      
      this.vadAnalyser = audioContext.createAnalyser();
      this.vadAnalyser.fftSize = 2048;
      this.vadAnalyser.smoothingTimeConstant = 0.3;
      
      source.connect(this.vadAnalyser);
      
      // Start VAD monitoring
      this.startVADMonitoring();
      
      logger.log('✅ Voice Activity Detection (VAD) enabled - Discord mode');
    } catch (error) {
      logger.warn('⚠️ VAD setup failed:', error);
    }
  }
  
  // Monitor voice activity (Discord-like speaking detection) - THROTTLED for CPU protection
  startVADMonitoring() {
    if (!this.vadAnalyser) return;
    
    const dataArray = new Uint8Array(this.vadAnalyser.frequencyBinCount);
    let lastVADCheckTime = 0;
    const VAD_CHECK_INTERVAL = 100; // 100ms instead of every frame (10x less CPU usage)
    
    const checkVoiceActivity = (timestamp) => {
      if (!this.localStream || !this.localStream.active) return;
      
      // Throttle: Only check every 100ms (10 times per second is enough for VAD)
      if (timestamp - lastVADCheckTime >= VAD_CHECK_INTERVAL) {
        this.vadAnalyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        // Discord threshold: 25-30 for speaking
        const wasSpeaking = this.isSpeaking;
        this.isSpeaking = average > this.vadThreshold && !this.isMuted;
        
        // Notify on speaking state change
        if (wasSpeaking !== this.isSpeaking) {
          this.emit('speaking-changed', {
            userId: this.currentUserId,
            isSpeaking: this.isSpeaking
          });
          
          // Broadcast to server
          if (websocketService.socket?.connected && this.currentChannel) {
            websocketService.socket.emit('voice-speaking-status', {
              channelId: this.currentChannel,
              userId: this.currentUserId,
              isSpeaking: this.isSpeaking
            });
          }
        }
        
        lastVADCheckTime = timestamp;
      }
      
      // Continue monitoring
      this.vadCheckInterval = requestAnimationFrame(checkVoiceActivity);
    };
    
    requestAnimationFrame(checkVoiceActivity);
  }
  
  // Stop VAD monitoring
  stopVADMonitoring() {
    if (this.vadCheckInterval) {
      cancelAnimationFrame(this.vadCheckInterval);
      this.vadCheckInterval = null;
    }
    this.isSpeaking = false;
  }
  
  // ==================== OPUS CODEC OPTIMIZATION (Discord-level) ====================
  
  // Optimize Opus codec in SDP (Discord uses this)
  optimizeOpusSDP(sdp) {
    if (!sdp) return sdp;
    
    // Discord Opus settings:
    // - maxaveragebitrate: 64000 (64kbps - high quality voice)
    // - useinbandfec: 1 (Forward Error Correction - packet loss recovery)
    // - usedtx: 0 (Disable DTX for better quality)
    // - stereo: 0 (Mono for voice, 1 for music)
    
    // Find Opus payload type (usually 111)
    const opusMatch = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);
    if (!opusMatch) return sdp;
    
    const payloadType = opusMatch[1];
    
    // Check if fmtp line already exists
    const fmtpRegex = new RegExp(`a=fmtp:${payloadType} .*\\r\\n`);
    
    if (fmtpRegex.test(sdp)) {
      // Update existing fmtp line
      sdp = sdp.replace(
        fmtpRegex,
        `a=fmtp:${payloadType} maxaveragebitrate=64000;stereo=0;useinbandfec=1;usedtx=0\r\n`
      );
    } else {
      // Add new fmtp line after rtpmap
      sdp = sdp.replace(
        new RegExp(`(a=rtpmap:${payloadType} opus\\/48000\\/2\\r\\n)`),
        `$1a=fmtp:${payloadType} maxaveragebitrate=64000;stereo=0;useinbandfec=1;usedtx=0\r\n`
      );
    }
    
    logger.log('✅ Opus codec optimized (Discord-level: 64kbps, FEC enabled)');
    return sdp;
  }
  
  // ==================== NETWORK QUALITY MONITORING (Discord-like) ====================
  
  // Start monitoring network stats for a peer
  startNetworkMonitoring(userId, peerConnection) {
    if (!peerConnection) return;
    
    const checkStats = async () => {
      if (!peerConnection || peerConnection.connectionState === 'closed') {
        this.stopNetworkMonitoring(userId);
        return;
      }
      
      try {
        const stats = await peerConnection.getStats();
        let audioStats = null;
        
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            audioStats = {
              packetsLost: report.packetsLost || 0,
              packetsReceived: report.packetsReceived || 0,
              jitter: report.jitter || 0,
              bytesReceived: report.bytesReceived || 0,
              timestamp: report.timestamp
            };
          }
        });
        
        if (audioStats) {
          const prevStats = this.networkStats.get(userId);
          
          if (prevStats) {
            const timeDiff = (audioStats.timestamp - prevStats.timestamp) / 1000;
            const packetLoss = ((audioStats.packetsLost - prevStats.packetsLost) / 
              (audioStats.packetsReceived - prevStats.packetsReceived)) * 100 || 0;
            
            // Discord quality thresholds:
            // Excellent: < 1% loss, < 30ms jitter
            // Good: 1-3% loss, 30-60ms jitter
            // Poor: > 3% loss, > 60ms jitter
            
            if (packetLoss > 5 || audioStats.jitter > 0.1) {
              logger.warn(`⚠️ Poor connection to ${userId}: ${packetLoss.toFixed(1)}% loss, ${(audioStats.jitter * 1000).toFixed(0)}ms jitter`);
            }
          }
          
          this.networkStats.set(userId, audioStats);
        }
      } catch (error) {
        // Ignore stats errors
      }
      
      // Check every 2 seconds (Discord does this)
      setTimeout(() => checkStats(), 2000);
    };
    
    checkStats();
  }
  
  // Stop monitoring network stats
  stopNetworkMonitoring(userId) {
    this.networkStats.delete(userId);
  }
  
  // ==================== WEBRTC MESH NETWORK (Discord-like Group Calls) ====================
  
  // Setup WebRTC signaling listeners
  setupWebRTCSignaling() {
    // Prevent duplicate listeners
    if (this.webrtcListenersSetup) return;
    
    const socket = websocketService.getSocket();
    if (!socket) return;
    
    this.webrtcListenersSetup = true;

    // Receive offer from another user
    socket.on('voice:offer', async ({ channelId, fromUserId, fromUsername, offer }) => {
      if (channelId !== this.currentChannel) return;
      
      logger.log(`📡 Received offer from ${fromUsername}`);
      
      try {
        // Create peer connection if doesn't exist
        if (!this.peerConnections.has(fromUserId)) {
          await this.createPeerConnection(fromUserId, fromUsername);
        }
        
        const pc = this.peerConnections.get(fromUserId);
        
        // Check signaling state before setting remote description
        if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
          logger.warn(`⚠️ Ignoring offer, peer connection in state: ${pc.signalingState}`);
          return;
        }
        
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit('voice:answer', {
          channelId: this.currentChannel,
          targetUserId: fromUserId,
          answer: pc.localDescription
        });
        
        logger.log(`✅ Sent answer to ${fromUsername}`);
      } catch (error) {
        logger.error('Error handling offer:', error);
      }
    });

    // Receive answer from another user
    socket.on('voice:answer', async ({ channelId, fromUserId, answer }) => {
      if (channelId !== this.currentChannel) return;
      
      try {
        const pc = this.peerConnections.get(fromUserId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          logger.log(`✅ Answer received from user ${fromUserId}`);
        }
      } catch (error) {
        logger.error('Error handling answer:', error);
      }
    });

    // Receive ICE candidate from another user
    socket.on('voice:ice-candidate', async ({ channelId, fromUserId, candidate }) => {
      if (channelId !== this.currentChannel) return;
      
      try {
        const pc = this.peerConnections.get(fromUserId);
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        logger.error('Error adding ICE candidate:', error);
      }
    });
  }

  // Create peer connection for a user
  async createPeerConnection(userId, username) {
    try {
      const pc = new RTCPeerConnection(this.rtcConfig);
      
      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          logger.log(`📤 Adding local track to peer ${username}`);
          pc.addTrack(track, this.localStream);
        });
      }
      
      // DISCORD OPTIMIZATION: Apply Opus codec settings on negotiation
      pc.addEventListener('negotiationneeded', async () => {
        if (pc.signalingState !== 'stable') return;
        
        try {
          await pc.setLocalDescription();
          
          // Optimize Opus codec in SDP
          const optimizedSdp = this.optimizeOpusSDP(pc.localDescription.sdp);
          const optimizedOffer = new RTCSessionDescription({
            type: pc.localDescription.type,
            sdp: optimizedSdp
          });
          
          await pc.setLocalDescription(optimizedOffer);
        } catch (err) {
          logger.error('Negotiation failed:', err);
        }
      });
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const socket = websocketService.getSocket();
          socket.emit('voice:ice-candidate', {
            channelId: this.currentChannel,
            targetUserId: userId,
            candidate: event.candidate
          });
        }
      };
      
      // Handle remote stream
      pc.ontrack = (event) => {
        logger.log(`🎵 Received remote stream from ${username}`);
        const remoteStream = event.streams[0];
        this.remoteStreams.set(userId, remoteStream);
        
        // Play remote audio
        this.playRemoteAudio(userId, remoteStream);
      };
      
      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        logger.log(`Connection state with ${username}: ${pc.connectionState}`);
        
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          // Attempt reconnection
          setTimeout(() => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
              this.restartIce(userId);
            }
          }, 3000);
        }
      };
      
      this.peerConnections.set(userId, pc);
      logger.log(`✅ Peer connection created for ${username}`);
      
      // Start network quality monitoring
      this.startNetworkMonitoring(userId, pc);
      
      return pc;
    } catch (error) {
      logger.error(`❌ Failed to create peer connection for ${username}:`, error);
      throw error;
    }
  }

  // Send offer to a user
  async sendOffer(userId) {
    try {
      const pc = this.peerConnections.get(userId);
      if (!pc || !this.currentChannel) {
        logger.error('❌ Cannot send offer: missing peer connection or channel');
        return;
      }
      
      const offer = await pc.createOffer();
      
      // Optimize Opus codec in SDP before setting
      const optimizedSdp = this.optimizeOpusSDP(offer.sdp);
      const optimizedOffer = new RTCSessionDescription({
        type: 'offer',
        sdp: optimizedSdp
      });
      
      await pc.setLocalDescription(optimizedOffer);
      
      const socket = websocketService.getSocket();
      socket.emit('voice:offer', {
        channelId: this.currentChannel,
        targetUserId: userId,
        offer: pc.localDescription
      });
      
      logger.log(`📡 Sent offer to user ${userId}`);
    } catch (error) {
      logger.error('Error sending offer:', error);
    }
  }

  // ICE restart for reconnection
  async restartIce(userId) {
    try {
      logger.log(`🔄 Attempting ICE restart for user ${userId}`);
      const pc = this.peerConnections.get(userId);
      if (!pc || !this.currentChannel) return;
      
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      
      const socket = websocketService.getSocket();
      socket.emit('voice:offer', {
        channelId: this.currentChannel,
        targetUserId: userId,
        offer: pc.localDescription
      });
      
      logger.log(`✅ ICE restart offer sent to user ${userId}`);
    } catch (error) {
      logger.error('ICE restart failed:', error);
    }
  }

  // Play remote audio
  playRemoteAudio(userId, stream) {
    // Create audio element for remote stream
    let audioElement = document.getElementById(`remote-audio-${userId}`);
    
    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.id = `remote-audio-${userId}`;
      audioElement.setAttribute('data-user-id', userId); // For volume control
      audioElement.autoplay = true;
      audioElement.volume = 1.0; // Default volume
      document.body.appendChild(audioElement);
    }
    
    audioElement.srcObject = stream;
    
    // Apply deafen status
    if (this.isDeafened) {
      audioElement.volume = 0;
    }
    
    audioElement.play().catch(err => {
      logger.error('Failed to play remote audio:', err);
    });
  }

  // Close peer connection
  closePeerConnection(userId) {
    // Stop network monitoring
    this.stopNetworkMonitoring(userId);
    
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }
    
    const stream = this.remoteStreams.get(userId);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.remoteStreams.delete(userId);
    }
    
    // Remove audio element
    const audioElement = document.getElementById(`remote-audio-${userId}`);
    if (audioElement) {
      audioElement.remove();
    }
  }

  // ==================== END WEBRTC MESH NETWORK ====================

  // Desktop-specific: Check if running in Electron
  isElectronApp() {
    return electronAPI.isElectron?.() || false;
  }
}

// Export singleton instance
export default new VoiceChatService();

