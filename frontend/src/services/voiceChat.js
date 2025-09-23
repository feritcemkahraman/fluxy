import Peer from 'simple-peer';
import { socketService } from './socket';

class VoiceChatService {
  constructor(userId = null) {
    this.currentUserId = userId;
    this.localStream = null;
    this.screenStream = null;
    this.peers = new Map(); // userId -> peer connection
    this.screenPeers = new Map(); // userId -> screen sharing peer
    this.currentChannel = null;
    this.isConnected = false;
    this.isMuted = false;
    this.isDeafened = false;
    this.isScreenSharing = false;
    this.listeners = new Map();

    // Voice activity detection
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.isSpeaking = false;
    this.speakingThreshold = 0.005; // Daha hassas ses algılama
    this.silenceTimeout = null;

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    console.log('🔧 Setting up VoiceChat socket listeners...');
    
    socketService.on('userJoinedVoice', this.handleUserJoined.bind(this));
    socketService.on('userLeftVoice', this.handleUserLeft.bind(this));
    socketService.on('voice-signal', this.handleSignal.bind(this));
    socketService.on('voice-user-muted', this.handleUserMuted.bind(this));
    socketService.on('voice-user-deafened', this.handleUserDeafened.bind(this));
    socketService.on('screen-share-started', this.handleScreenShareStarted.bind(this));
    socketService.on('screen-share-stopped', this.handleScreenShareStopped.bind(this));
    socketService.on('screen-signal', this.handleScreenSignal.bind(this));
    
    console.log('✅ VoiceChat socket listeners set up');
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
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  // Discord-like Enhanced Audio Processing
  async getUserMedia() {
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Bu tarayıcı mikrofon erişimini desteklemiyor. Lütfen modern bir tarayıcı kullanın.');
      }

      console.log('🎤 Mikrofon erişimi isteniyor...');
      
      // Get raw audio stream first
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Discord-like audio constraints
          echoCancellation: true,
          noiseSuppression: false, // We'll handle this ourselves
          autoGainControl: false,  // We'll handle this ourselves
          sampleRate: 48000,
          channelCount: 1,
          
          // Advanced Chrome constraints
          googEchoCancellation: true,
          googEchoCancellation2: true,
          googAutoGainControl: false, // Disabled for custom processing
          googNoiseSuppression: false, // Disabled for custom processing
          googHighpassFilter: true,
          googTypingNoiseDetection: true,
          googAudioMirroring: false,
          
          // Latency optimization
          latency: 0.01 // 10ms target latency
        },
        video: false
      });

      console.log('✅ Raw mikrofon erişimi başarılı');

      // Apply Discord-like audio processing
      this.localStream = await this.setupAdvancedAudioProcessing(rawStream);
      
      console.log('🎛️ Advanced audio processing applied');

      // Start voice activity detection
      this.startVoiceActivityDetection();

      return this.localStream;
    } catch (error) {
      console.error('❌ Mikrofon erişim hatası:', error);
      
      let errorMessage = 'Mikrofon erişimi başarısız.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Mikrofon izni reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini etkinleştirin.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Mikrofon bulunamadı. Lütfen mikrofonunuzun bağlı olduğundan emin olun.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Mikrofon başka bir uygulama tarafından kullanılıyor olabilir.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Mikrofon ayarları desteklenmiyor.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Güvenlik nedeniyle mikrofon erişimi engellendi. HTTPS bağlantısı gerekli olabilir.';
      }
      
      throw new Error(errorMessage);
    }
  }

  // Setup Discord-like advanced audio processing chain
  async setupAdvancedAudioProcessing(inputStream) {
    try {
      // Create AudioContext
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 48000,
          latencyHint: 'interactive'
        });
      }

      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      console.log('🎛️ Setting up Discord-like audio processing chain...');

      // Create source from input stream
      const source = this.audioContext.createMediaStreamSource(inputStream);
      
      // 1. High-pass filter (remove low-frequency noise)
      const highPassFilter = this.audioContext.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.setValueAtTime(80, this.audioContext.currentTime); // Discord uses ~80Hz
      highPassFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);

      // 2. Setup Noise Suppression AudioWorklet
      let noiseSuppressionNode = null;
      try {
        await this.audioContext.audioWorklet.addModule('/noise-suppression-processor.js');
        noiseSuppressionNode = new AudioWorkletNode(this.audioContext, 'noise-suppression-processor');
        
        // Listen for level updates from noise suppression
        noiseSuppressionNode.port.onmessage = (event) => {
          if (event.data.type === 'level') {
            this.noiseSuppressionLevel = event.data.level;
          }
        };
        
        console.log('🔇 Noise suppression AudioWorklet loaded');
      } catch (error) {
        console.warn('⚠️ Noise suppression AudioWorklet not supported');
      }

      // 3. Setup Automatic Gain Control AudioWorklet
      let agcNode = null;
      try {
        await this.audioContext.audioWorklet.addModule('/agc-processor.js');
        agcNode = new AudioWorkletNode(this.audioContext, 'agc-processor');
        
        // Listen for AGC status updates
        agcNode.port.onmessage = (event) => {
          if (event.data.type === 'status') {
            this.agcStatus = {
              currentGain: event.data.currentGain,
              targetGain: event.data.targetGain,
              peakLevel: event.data.peakLevel,
              averageLevel: event.data.averageLevel
            };
          }
        };
        
        console.log('🎚️ AGC AudioWorklet loaded');
      } catch (error) {
        console.warn('⚠️ AGC AudioWorklet not supported');
      }

      // 3. Compressor (Discord-like dynamic range compression)
      const compressor = this.audioContext.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
      compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
      compressor.ratio.setValueAtTime(8, this.audioContext.currentTime);
      compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
      compressor.release.setValueAtTime(0.1, this.audioContext.currentTime);

      // 4. Gain node for final level adjustment
      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);

      // 5. Create destination for processed stream
      const destination = this.audioContext.createMediaStreamDestination();

      // Connect the Discord-like processing chain
      let currentNode = source;
      
      // 1. High-pass filter
      currentNode.connect(highPassFilter);
      currentNode = highPassFilter;
      
      // 2. Noise suppression (if available)
      if (noiseSuppressionNode) {
        currentNode.connect(noiseSuppressionNode);
        currentNode = noiseSuppressionNode;
      }
      
      // 3. AGC (if available)
      if (agcNode) {
        currentNode.connect(agcNode);
        currentNode = agcNode;
      }
      
      // 4. Compressor (final dynamics control)
      currentNode.connect(compressor);
      currentNode = compressor;
      
      // 5. Final gain adjustment
      currentNode.connect(gainNode);
      gainNode.connect(destination);

      // Store references for cleanup
      this.audioProcessingNodes = {
        source,
        highPassFilter,
        noiseSuppressionNode,
        agcNode,
        compressor,
        gainNode,
        destination
      };

      console.log('✅ Discord-like audio processing chain established');
      
      return destination.stream;
    } catch (error) {
      console.error('❌ Advanced audio processing failed:', error);
      console.log('🔄 Falling back to raw stream');
      return inputStream; // Fallback to raw stream
    }
  }

  // Discord-like Advanced Voice Activity Detection
  startVoiceActivityDetection() {
    try {
      if (!this.localStream) return;

      // Use existing AudioContext if available, don't create new one
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(this.localStream);

      // Discord-optimized settings
      this.analyser.fftSize = 512;  // Discord uses 512 for better frequency resolution
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;
      this.microphone.connect(this.analyser);

      // Advanced VAD parameters (Discord-like)
      this.vadConfig = {
        speakingThreshold: -45,      // dB - Discord threshold
        silenceThreshold: -55,       // dB - Hysteresis for stability
        hangTime: 250,               // ms - How long to keep "speaking" after silence
        triggerTime: 40,             // ms - How long speaking before triggering
        smoothingFactor: 0.8,        // Smoothing for level calculation
        speechFreqMin: 300,          // Hz - Speech frequency range
        speechFreqMax: 3400,         // Hz - Speech frequency range
      };

      // VAD state machine
      this.vadState = {
        isSpeaking: false,
        lastSpeakTime: 0,
        lastSilenceTime: 0,
        consecutiveSpeaking: 0,
        consecutiveSilence: 0,
        smoothedLevel: -100,
        levelHistory: []
      };

      console.log('🎤 Advanced VAD initialized with Discord-like settings');
      
      // Start advanced monitoring
      this.monitorAdvancedVoiceActivity();
    } catch (error) {
      console.error('❌ Advanced VAD initialization failed:', error);
      // Fallback to basic VAD
      this.startBasicVoiceActivityDetection();
    }
  }

  // Fallback basic VAD
  startBasicVoiceActivityDetection() {
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    this.microphone.connect(this.analyser);
    this.monitorAudioLevel();
  }

  // Discord-like Advanced Voice Activity Monitoring
  monitorAdvancedVoiceActivity() {
    if (!this.analyser || !this.vadConfig) {
      return;
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const frequencyData = new Float32Array(bufferLength);
    const sampleRate = this.audioContext.sampleRate;

    const checkAdvancedVoiceActivity = () => {
      if (!this.analyser || !this.vadConfig) {
        return;
      }

      try {
        this.analyser.getFloatFrequencyData(frequencyData);

        // Calculate weighted RMS focusing on speech frequencies (300-3400 Hz)
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const frequency = (i * sampleRate) / (2 * bufferLength);
          let weight = 1;
          
          // Boost speech frequencies (Discord approach)
          if (frequency >= this.vadConfig.speechFreqMin && frequency <= this.vadConfig.speechFreqMax) {
            weight = 2.5; // Higher weight for speech frequencies
          } else if (frequency < 100 || frequency > 8000) {
            weight = 0.1; // Lower weight for non-speech frequencies
          }
          
          const linearValue = Math.pow(10, frequencyData[i] / 10);
          weightedSum += linearValue * weight;
          totalWeight += weight;
        }

        // Calculate current level in dB
        const currentLevel = totalWeight > 0 ? 
          10 * Math.log10(weightedSum / totalWeight) : -100;

        // Smooth the level (Discord-like smoothing)
        this.vadState.smoothedLevel = 
          this.vadConfig.smoothingFactor * this.vadState.smoothedLevel + 
          (1 - this.vadConfig.smoothingFactor) * currentLevel;

        // Update level history for adaptive thresholding
        this.vadState.levelHistory.push(this.vadState.smoothedLevel);
        if (this.vadState.levelHistory.length > 50) {
          this.vadState.levelHistory.shift();
        }

        const now = Date.now();

        // State machine for voice activity detection
        if (this.vadState.smoothedLevel > this.vadConfig.speakingThreshold) {
          // Potential speech detected
          this.vadState.consecutiveSpeaking++;
          this.vadState.consecutiveSilence = 0;
          this.vadState.lastSpeakTime = now;
          
          // Trigger speaking state if threshold met
          if (!this.vadState.isSpeaking && 
              this.vadState.consecutiveSpeaking >= Math.ceil(this.vadConfig.triggerTime / 16)) {
            this.vadState.isSpeaking = true;
            this.emitSpeakingState(true);
            console.log(`🗣️ Speaking started (level: ${this.vadState.smoothedLevel.toFixed(1)} dB)`);
          }
        } else if (this.vadState.smoothedLevel < this.vadConfig.silenceThreshold) {
          // Silence detected
          this.vadState.consecutiveSilence++;
          this.vadState.consecutiveSpeaking = 0;
          this.vadState.lastSilenceTime = now;
          
          // Stop speaking state if hang time exceeded
          if (this.vadState.isSpeaking && 
              (now - this.vadState.lastSpeakTime) > this.vadConfig.hangTime) {
            this.vadState.isSpeaking = false;
            this.emitSpeakingState(false);
            console.log(`🤐 Speaking stopped (level: ${this.vadState.smoothedLevel.toFixed(1)} dB)`);
          }
        }

        // Continue monitoring
        requestAnimationFrame(checkAdvancedVoiceActivity);
      } catch (error) {
        console.error('❌ Advanced VAD monitoring error:', error);
        // Fallback to basic monitoring
        this.monitorAudioLevel();
      }
    };

    checkAdvancedVoiceActivity();
  }

  // Emit speaking state change
  emitSpeakingState(isSpeaking) {
    // Always update speaking state
    this.isSpeaking = isSpeaking;
    
    // Emit event even if not connected (for UI feedback)
    this.emit('speaking-changed', {
      userId: this.currentUserId,
      isSpeaking: isSpeaking && !this.isMuted, // Don't show speaking if muted
      level: this.vadState?.smoothedLevel || 0
    });
    
    console.log(`🗣️ Speaking state: ${isSpeaking} (muted: ${this.isMuted})`);
  }

  // Fallback: Basic audio level monitoring
  monitorAudioLevel() {
    if (!this.analyser) {
      return;
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkAudioLevel = () => {
      if (!this.analyser) {
        return;
      }

      try {
        this.analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const volume = average / 255; // Normalize to 0-1

        // Only emit speaking events if connected
        if (this.isConnected) {
          // Check if speaking
          const wasSpeaking = this.isSpeaking;
          this.isSpeaking = volume > this.speakingThreshold && !this.isMuted;

          // Emit speaking status change
          if (this.isSpeaking !== wasSpeaking) {
            this.emit('speaking-changed', {
              userId: this.currentUserId,
              isSpeaking: this.isSpeaking
            });
          }
        }

        // Continue monitoring regardless of connection status
        requestAnimationFrame(checkAudioLevel);
      } catch (error) {
        // Stop monitoring on error
      }
    };

    checkAudioLevel();
  }

  // Stop voice activity detection and cleanup audio processing
  stopVoiceActivityDetection() {
    // Cleanup VAD
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    this.analyser = null;
    this.microphone = null;
    this.isSpeaking = false;
    this.vadState = null;
    this.vadConfig = null;
    
    // Cleanup audio processing nodes
    if (this.audioProcessingNodes) {
      try {
        // Disconnect all nodes
        Object.values(this.audioProcessingNodes).forEach(node => {
          if (node && typeof node.disconnect === 'function') {
            node.disconnect();
          }
        });
        
        console.log('🧹 Audio processing nodes cleaned up');
      } catch (error) {
        console.warn('⚠️ Error during audio processing cleanup:', error);
      }
      
      this.audioProcessingNodes = null;
    }
    
    // Close AudioContext (but keep it for potential reuse)
    if (this.audioContext && this.audioContext.state !== 'closed') {
      // Don't close immediately, might be reused
      // this.audioContext.close();
      console.log('🎛️ AudioContext suspended for potential reuse');
    }
  }

  // Join voice channel
  async joinChannel(channelId) {
    try {
      if (this.currentChannel === channelId) {
        return;
      }

      // Leave current channel if connected
      if (this.currentChannel) {
        await this.leaveChannel();
      }

      // Try to get user media, but don't fail if microphone is not available
      try {
        await this.getUserMedia();
        console.log('🎤 Microphone access granted');
      } catch (error) {
        console.warn('⚠️ Could not access microphone, joining in listen-only mode:', error.message);
        // Continue without microphone - user can still join to listen
      }
      
      this.currentChannel = channelId;
      this.isConnected = true;

      // Wait for socket authentication before joining
      try {
        await socketService.joinVoiceChannel(channelId);
        console.log('✅ Voice channel join request sent');
      } catch (socketError) {
        console.error('❌ Failed to join voice channel:', socketError.message);
        this.isConnected = false;
        this.currentChannel = null;
        throw new Error(`Voice channel join failed: ${socketError.message}`);
      }
      
      this.emit('connected', { channelId });
      return true;
    } catch (error) {
      this.emit('error', error.message);
      throw error;
    }
  }

  // Leave voice channel
  async leaveChannel() {
    if (!this.currentChannel) return;

    // Close all peer connections
    this.peers.forEach(peer => {
      peer.destroy();
    });
    this.peers.clear();

    // Stop local streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Stop voice activity detection
    this.stopVoiceActivityDetection();
    
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
      this.isScreenSharing = false;
    }
    
    // Close screen sharing peers
    this.screenPeers.forEach(peer => {
      peer.destroy();
    });
    this.screenPeers.clear();

    // Notify server
    socketService.leaveVoiceChannel(this.currentChannel);

    const leftChannel = this.currentChannel;
    this.currentChannel = null;
    this.isConnected = false;

    this.emit('disconnected', { channelId: leftChannel });
  }

  // Handle new user joining
  handleUserJoined({ userId, channelId }) {
    console.log(`👤 User joined voice: ${userId} in channel: ${channelId}`);
    
    if (channelId !== this.currentChannel) {
      console.log(`❌ Channel mismatch: current=${this.currentChannel}, joined=${channelId}`);
      return;
    }
    
    if (!this.localStream) {
      console.log(`❌ No local stream available for peer connection`);
      return;
    }

    console.log(`🤝 Creating peer connection as initiator for user: ${userId}`);
    console.log(`🎛️ Using processed stream:`, this.localStream.getTracks().map(t => t.kind));

    // Create peer connection (initiator) with processed stream
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: this.localStream // This should be the processed stream
    });

    this.setupPeerEvents(peer, userId);
    this.peers.set(userId, peer);

    this.emit('user-joined', { userId, channelId });
  }

  // Handle user leaving
  handleUserLeft({ userId, channelId }) {
    if (this.peers.has(userId)) {
      this.peers.get(userId).destroy();
      this.peers.delete(userId);
    }

    this.emit('user-left', { userId, channelId });
  }

  // Handle WebRTC signaling
  handleSignal({ signal, userId, channelId }) {
    console.log(`📡 Received signal from user: ${userId} in channel: ${channelId}`);
    
    if (channelId !== this.currentChannel) {
      console.log(`❌ Signal channel mismatch: current=${this.currentChannel}, signal=${channelId}`);
      return;
    }

    let peer = this.peers.get(userId);

    if (!peer && this.localStream) {
      console.log(`🤝 Creating peer connection as receiver for user: ${userId}`);
      console.log(`🎛️ Using processed stream:`, this.localStream.getTracks().map(t => t.kind));
      
      // Create peer connection (not initiator) with processed stream
      peer = new Peer({
        initiator: false,
        trickle: false,
        stream: this.localStream // This should be the processed stream
      });

      this.setupPeerEvents(peer, userId);
      this.peers.set(userId, peer);
    }

    if (peer) {
      console.log(`📤 Sending signal to peer: ${userId}`);
      peer.signal(signal);
    } else {
      console.log(`❌ No peer found for user: ${userId}`);
    }
  }

  // Setup peer connection events
  setupPeerEvents(peer, userId) {
    peer.on('signal', (signal) => {
      console.log(`📡 Sending signal to user: ${userId}`);
      
      // Discord-like Opus codec prioritization
      if (signal.type === 'offer' || signal.type === 'answer') {
        signal.sdp = this.prioritizeOpusCodec(signal.sdp);
        console.log(`🎵 Opus codec prioritized for user: ${userId}`);
      }
      
      socketService.sendVoiceSignal(signal, userId, this.currentChannel, this.currentUserId);
    });

    peer.on('stream', (remoteStream) => {
      console.log(`🎧 Received remote stream from user: ${userId}`);
      this.emit('remote-stream', { userId, stream: remoteStream });
    });

    peer.on('error', (error) => {
      console.error(`❌ Peer error for user ${userId}:`, error);
      this.emit('peer-error', { userId, error });
    });

    peer.on('close', () => {
      console.log(`🔌 Peer connection closed for user: ${userId}`);
      this.peers.delete(userId);
      this.emit('peer-disconnected', { userId });
    });

    peer.on('connect', () => {
      console.log(`✅ Peer connected to user: ${userId}`);
    });
  }

  // Mute/unmute microphone
  toggleMute() {
    if (!this.localStream) return;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.isMuted = !audioTrack.enabled;
      
      console.log(`🎤 Mute toggled: ${this.isMuted ? 'MUTED' : 'UNMUTED'}`);
      
      // Update all peer connections with new stream state
      this.peers.forEach((peer, userId) => {
        try {
          // The stream is already connected, just the track enabled state changed
          console.log(`🔄 Updated mute state for peer: ${userId}`);
        } catch (error) {
          console.warn(`⚠️ Failed to update peer ${userId}:`, error);
        }
      });
      
      this.emit('mute-changed', { isMuted: this.isMuted });
    }
    socketService.sendVoiceMuteStatus(this.currentChannel, this.isMuted, this.currentUserId);
  }

  // Deafen/undeafen (mute all incoming audio)
  toggleDeafen() {
    this.isDeafened = !this.isDeafened;

    // Mute all remote streams
    this.peers.forEach(peer => {
      if (peer.remoteStream) {
        peer.remoteStream.getAudioTracks().forEach(track => {
          track.enabled = !this.isDeafened;
        });
      }
    });

    // If deafening, also mute microphone
    if (this.isDeafened && !this.isMuted) {
      this.toggleMute();
    }

    socketService.sendVoiceDeafenStatus(this.currentChannel, this.isDeafened, this.currentUserId);

    this.emit('deafen-changed', { isDeafened: this.isDeafened });
  }

  // Handle user mute status
  handleUserMuted({ userId, isMuted }) {
    this.emit('user-mute-changed', { userId, isMuted });
  }

  // Handle user deafen status
  handleUserDeafened({ userId, isDeafened }) {
    this.emit('user-deafen-changed', { userId, isDeafened });
  }

  // Screen sharing methods
  async startScreenShare() {
    try {
      if (this.isScreenSharing) {
        throw new Error('Already sharing screen');
      }

      if (!this.currentChannel) {
        throw new Error('Not connected to a voice channel');
      }

      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      this.isScreenSharing = true;

      // Handle screen share ending (user clicks stop sharing)
      this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopScreenShare();
      });

      // Create screen sharing peers for existing users
      this.peers.forEach((_, userId) => {
        this.createScreenPeer(userId, true);
      });

      // Notify server
      socketService.startScreenShare(this.currentChannel, this.currentUserId);

      // Emit event for current user's screen share
      this.emit('user-started-screen-share', { userId: this.currentUserId });
      this.emit('remote-screen-stream', { userId: this.currentUserId, stream: this.screenStream });
      this.emit('screen-share-started', { stream: this.screenStream });
      return this.screenStream;
    } catch (error) {
      this.emit('error', 'Could not start screen sharing. Please check permissions.');
      throw error;
    }
  }

  async stopScreenShare() {
    if (!this.isScreenSharing) return;

    // Stop screen stream
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }

    // Close all screen sharing peers
    this.screenPeers.forEach(peer => {
      peer.destroy();
    });
    this.screenPeers.clear();

    this.isScreenSharing = false;

    // Notify server
    socketService.stopScreenShare(this.currentChannel, this.currentUserId);

    // Emit event for current user stopping screen share
    this.emit('user-stopped-screen-share', { userId: this.currentUserId });
    this.emit('screen-share-stopped');
  }

  createScreenPeer(userId, initiator) {
    if (!this.screenStream) return;

    const peer = new Peer({
      initiator,
      trickle: false,
      stream: this.screenStream
    });

    peer.on('signal', (signal) => {
      socketService.sendScreenSignal(signal, userId, this.currentChannel, this.currentUserId);
    });

    peer.on('stream', (remoteStream) => {
      this.emit('remote-screen-stream', { userId, stream: remoteStream });
    });

    peer.on('error', (error) => {
      this.emit('screen-peer-error', { userId, error });
    });

    peer.on('close', () => {
      this.screenPeers.delete(userId);
      this.emit('screen-peer-disconnected', { userId });
    });

    this.screenPeers.set(userId, peer);
    return peer;
  }

  // Handle screen sharing events
  handleScreenShareStarted({ userId, channelId }) {
    if (channelId !== this.currentChannel) return;
    
    // Create screen peer to receive the stream
    this.createScreenPeer(userId, false);
    this.emit('user-started-screen-share', { userId });
  }

  handleScreenShareStopped({ userId, channelId }) {
    if (this.screenPeers.has(userId)) {
      this.screenPeers.get(userId).destroy();
      this.screenPeers.delete(userId);
    }
    this.emit('user-stopped-screen-share', { userId });
  }

  handleScreenSignal({ signal, userId, channelId }) {
    if (channelId !== this.currentChannel) return;

    const peer = this.screenPeers.get(userId);
    if (peer) {
      peer.signal(signal);
    }
  }

  // Discord-like Opus codec prioritization
  prioritizeOpusCodec(sdp) {
    // Find Opus codec in SDP and move it to the front
    const lines = sdp.split('\n');
    let audioMLine = '';
    let opusPayloadType = null;
    
    // Find audio m-line and Opus payload type
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Find audio m-line
      if (line.startsWith('m=audio')) {
        audioMLine = line;
      }
      
      // Find Opus codec
      if (line.includes('opus/48000/2')) {
        const match = line.match(/a=rtpmap:(\d+) opus\/48000\/2/);
        if (match) {
          opusPayloadType = match[1];
        }
      }
    }
    
    // Prioritize Opus if found
    if (audioMLine && opusPayloadType) {
      const parts = audioMLine.split(' ');
      if (parts.length > 3) {
        const payloadTypes = parts.slice(3);
        
        // Remove Opus from current position
        const filteredTypes = payloadTypes.filter(type => type !== opusPayloadType);
        
        // Add Opus at the beginning
        const prioritizedTypes = [opusPayloadType, ...filteredTypes];
        
        // Reconstruct m-line
        const newMLine = `${parts[0]} ${parts[1]} ${parts[2]} ${prioritizedTypes.join(' ')}`;
        
        // Replace in SDP
        sdp = sdp.replace(audioMLine, newMLine);
        
        console.log(`🎵 Opus codec (${opusPayloadType}) prioritized in SDP`);
      }
    }
    
    return sdp;
  }

  // Set current user ID
  setCurrentUserId(userId) {
    this.currentUserId = userId;
  }

  // Get current status with Discord-like audio processing info
  getStatus() {
    const peerUserIds = Array.from(this.peers.keys());

    // Include current user in connected users if we're connected
    const allConnectedUsers = [...peerUserIds];
    if (this.isConnected && this.currentUserId && !allConnectedUsers.includes(this.currentUserId)) {
      allConnectedUsers.push(this.currentUserId);
    }

    return {
      isConnected: this.isConnected,
      currentChannel: this.currentChannel,
      isMuted: this.isMuted,
      isDeafened: this.isDeafened,
      isScreenSharing: this.isScreenSharing,
      connectedUsers: allConnectedUsers,
      screenSharingUsers: Array.from(this.screenPeers.keys()),
      
      // Discord-like audio processing status
      audioProcessing: {
        hasAdvancedProcessing: !!this.audioProcessingNodes,
        noiseSuppressionLevel: this.noiseSuppressionLevel || null,
        agcStatus: this.agcStatus || null,
        vadConfig: this.vadConfig || null,
        vadState: this.vadState ? {
          isSpeaking: this.vadState.isSpeaking,
          smoothedLevel: this.vadState.smoothedLevel
        } : null
      }
    };
  }

  // Debug method for Discord-like audio processing
  getAudioProcessingDebugInfo() {
    return {
      audioContext: {
        state: this.audioContext?.state,
        sampleRate: this.audioContext?.sampleRate,
        currentTime: this.audioContext?.currentTime
      },
      processing: {
        hasNoiseSuppressionNode: !!this.audioProcessingNodes?.noiseSuppressionNode,
        hasAGCNode: !!this.audioProcessingNodes?.agcNode,
        noiseSuppressionLevel: this.noiseSuppressionLevel,
        agcStatus: this.agcStatus
      },
      vad: {
        config: this.vadConfig,
        state: this.vadState,
        isSpeaking: this.isSpeaking
      },
      peers: {
        count: this.peers.size,
        userIds: Array.from(this.peers.keys())
      }
    };
  }

  // Cleanup
  destroy() {
    this.leaveChannel();
    socketService.off('voice-user-joined');
    socketService.off('voice-user-left');
    socketService.off('voice-signal');
    socketService.off('voice-user-muted');
    socketService.off('voice-user-deafened');
    socketService.off('screen-share-started');
    socketService.off('screen-share-stopped');
    socketService.off('screen-signal');
  }
}

// Create singleton instance
export const voiceChatService = new VoiceChatService();
export default voiceChatService;
