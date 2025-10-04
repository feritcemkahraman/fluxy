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
    
    // WebRTC Mesh Network (Discord-like group calls)
    this.peerConnections = new Map(); // userId -> RTCPeerConnection
    this.remoteStreams = new Map(); // userId -> MediaStream
    this.webrtcListenersSetup = false; // Prevent duplicate listeners
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
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
      // Discord Krisp-like audio constraints (maximum noise suppression)
      const constraints = {
        audio: {
          // Core processing - MANDATORY for quality
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          
          // High quality audio
          sampleRate: 48000,
          sampleSize: 16,
          channelCount: 1,
          
          // Chrome/Electron advanced processing (Krisp-like)
          googEchoCancellation: true,
          googExperimentalEchoCancellation: true,
          googAutoGainControl: true,
          googExperimentalAutoGainControl: true,
          googNoiseSuppression: true,
          googExperimentalNoiseSuppression: true,
          googHighpassFilter: true,
          googTypingNoiseDetection: true,
          googAudioMirroring: false,
          googNoiseReduction: true,
          
          // Advanced noise suppression (Krisp-like)
          googBeamforming: true,
          googArrayGeometry: true,
          
          // Voice Activity Detection
          googDucking: false,
          
          // Low latency
          latency: 0.01
        }
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Discord-like audio processing enabled');
      
      // Note: Web Audio API processing disabled - it breaks the stream
      // Browser's native processing (echoCancellation, noiseSuppression, autoGainControl) is enough
      
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
      console.error('❌ Voice leave failed:', error);
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
      // console.log(`🔇 Mute status sent to server: ${this.isMuted}`);
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
      
      // Also broadcast mute status
      if (websocketService.socket?.connected && this.currentChannel) {
        websocketService.socket.emit('voice-mute-status', {
          channelId: this.currentChannel,
          isMuted: this.isMuted,
          userId: this.currentUserId
        });
      }
    }
    
    // Broadcast deafen status to server
    if (websocketService.socket?.connected && this.currentChannel) {
      websocketService.socket.emit('voice-deafen-status', {
        channelId: this.currentChannel,
        isDeafened: this.isDeafened,
        userId: this.currentUserId
      });
      // console.log(`🔇 Deafen status sent to server: ${this.isDeafened}`);
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
      console.log('🖥️ Starting screen share (Electron-First)...');
      
      let constraints = null;
      
      // PRIMARY: Electron native implementation
      if (electronAPI.isElectron()) {
        
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
      const checkNoise = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        // Threshold: if sound is below 25, mute it (noise gate)
        if (average < 25) {
          noiseGate.gain.setValueAtTime(0, audioContext.currentTime);
        } else {
          noiseGate.gain.setValueAtTime(1, audioContext.currentTime);
        }
        
        if (this.localStream && this.localStream.active) {
          requestAnimationFrame(checkNoise);
        }
      };
      checkNoise();
      
      // Replace original stream with processed stream
      const processedTrack = destination.stream.getAudioTracks()[0];
      const originalTrack = this.localStream.getAudioTracks()[0];
      
      this.localStream.removeTrack(originalTrack);
      this.localStream.addTrack(processedTrack);
      originalTrack.stop();
      
      console.log('✅ Advanced audio processing applied (noise gate + compressor + highpass)');
    } catch (error) {
      console.warn('⚠️ Advanced audio processing failed, using basic:', error);
    }
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
      
      console.log(`📡 Received offer from ${fromUsername}`);
      
      try {
        // Create peer connection if doesn't exist
        if (!this.peerConnections.has(fromUserId)) {
          await this.createPeerConnection(fromUserId, fromUsername);
        }
        
        const pc = this.peerConnections.get(fromUserId);
        
        // Check signaling state before setting remote description
        if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
          console.warn(`⚠️ Ignoring offer, peer connection in state: ${pc.signalingState}`);
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
        
        console.log(`✅ Sent answer to ${fromUsername}`);
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    // Receive answer from another user
    socket.on('voice:answer', async ({ channelId, fromUserId, answer }) => {
      if (channelId !== this.currentChannel) return;
      
      try {
        const pc = this.peerConnections.get(fromUserId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log(`✅ Answer received from user ${fromUserId}`);
        }
      } catch (error) {
        console.error('Error handling answer:', error);
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
        console.error('Error adding ICE candidate:', error);
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
          console.log(`📤 Adding local track to peer ${username}`);
          pc.addTrack(track, this.localStream);
        });
      }
      
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
        console.log(`🎵 Received remote stream from ${username}`);
        const remoteStream = event.streams[0];
        this.remoteStreams.set(userId, remoteStream);
        
        // Play remote audio
        this.playRemoteAudio(userId, remoteStream);
      };
      
      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${username}: ${pc.connectionState}`);
        
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
      console.log(`✅ Peer connection created for ${username}`);
      
      return pc;
    } catch (error) {
      console.error(`❌ Failed to create peer connection for ${username}:`, error);
      throw error;
    }
  }

  // Send offer to a user
  async sendOffer(userId) {
    try {
      const pc = this.peerConnections.get(userId);
      if (!pc || !this.currentChannel) {
        console.error('❌ Cannot send offer: missing peer connection or channel');
        return;
      }
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const socket = websocketService.getSocket();
      socket.emit('voice:offer', {
        channelId: this.currentChannel,
        targetUserId: userId,
        offer: pc.localDescription
      });
      
      console.log(`📡 Sent offer to user ${userId}`);
    } catch (error) {
      console.error('Error sending offer:', error);
    }
  }

  // ICE restart for reconnection
  async restartIce(userId) {
    try {
      console.log(`🔄 Attempting ICE restart for user ${userId}`);
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
      
      console.log(`✅ ICE restart offer sent to user ${userId}`);
    } catch (error) {
      console.error('ICE restart failed:', error);
    }
  }

  // Play remote audio
  playRemoteAudio(userId, stream) {
    // Create audio element for remote stream
    let audioElement = document.getElementById(`remote-audio-${userId}`);
    
    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.id = `remote-audio-${userId}`;
      audioElement.autoplay = true;
      document.body.appendChild(audioElement);
    }
    
    audioElement.srcObject = stream;
    audioElement.play().catch(err => {
      console.error('Failed to play remote audio:', err);
    });
  }

  // Close peer connection
  closePeerConnection(userId) {
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
    return electronAPI.isElectron();
  }
}

// Export singleton instance
export default new VoiceChatService();
