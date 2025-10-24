// Voice Call Service - WebRTC Peer-to-Peer Voice/Video Calls
// Discord-like individual calling system

import OptimizedScreenShare from './optimizedScreenShare';
import devLog from '../utils/devLogger';

class VoiceCallService {
  constructor() {
    this.socket = null;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.currentCall = null;
    this.callState = 'idle'; // idle, calling, ringing, connected
    this.listeners = new Map();
    this.makingOffer = false; // Perfect negotiation flag
    this.ignoreOffer = false; // Perfect negotiation flag
    this.optimizedScreenShare = null; // Optimized screen share instance
    
    // Discord-level RTC Configuration with FREE TURN servers
    this.rtcConfiguration = {
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
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };
  }

  // Initialize with socket and user
  initialize(socket, user) {
    this.socket = socket;
    this.user = user;
    this.setupSocketListeners();
  }

  // Setup socket event listeners
  setupSocketListeners() {
    if (!this.socket) return;

    // Listen for incoming calls
    this.socket.on('voiceCall:incoming', (data) => {
      this.currentCall = {
        type: 'incoming',
        userId: data.callerId,
        username: data.callerUsername,
        avatar: data.callerAvatar,
        callType: data.callType
      };
      this.callState = 'ringing';
      this.emit('incomingCall', data);
    });

    // Call is ringing
    this.socket.on('voiceCall:ringing', () => {
      this.callState = 'calling';
      this.emit('callRinging');
    });

    // Call accepted
    this.socket.on('voiceCall:accepted', async (data) => {
      this.callState = 'connected';
      this.emit('callAccepted', data);
      // Create WebRTC offer when call is accepted
      await this.createOffer();
    });

    // Call rejected
    this.socket.on('voiceCall:rejected', (data) => {
      this.callState = 'rejected';
      this.emit('callRejected', data);
      this.endCall();
    });

    // Call ended
    this.socket.on('voiceCall:ended', (data) => {
      this.emit('callEnded', data);
      // Don't call endCall() here to avoid duplicate emit
      // Just cleanup locally without emitting
      this.cleanupLocal();
    });

    // WebRTC offer received
    this.socket.on('voiceCall:offer', async ({ callerId, offer }) => {
      await this.handleOffer(callerId, offer);
    });

    // WebRTC answer received
    this.socket.on('voiceCall:answer', async ({ userId, answer }) => {
      devLog.verbose('🔄 Received WebRTC answer');
      await this.handleAnswer(answer);
    });

    // ICE candidate received
    this.socket.on('voiceCall:iceCandidate', async ({ userId, candidate }) => {
      await this.handleIceCandidate(candidate);
    });

    // Call error
    this.socket.on('voiceCall:error', (data) => {
      console.error('❌ Voice call error:', data.message);
      this.emit('callError', data);
    });

    // Remote speaking status
    this.socket.on('voiceCall:remoteSpeaking', (data) => {
      this.emit('remoteSpeaking', data);
    });

    // Remote mute status
    this.socket.on('voiceCall:remoteMuteStatus', (data) => {
      this.emit('remoteMuteStatus', data);
    });

    // Screen share events
    this.socket.on('voiceCall:screenShareStarted', (data) => {
      console.log('🖥️ Remote user started screen sharing');
      this.emit('remoteScreenShareStarted', data);
    });

    this.socket.on('voiceCall:screenShareStopped', (data) => {
      console.log('🖥️ Remote user stopped screen sharing');
      this.emit('remoteScreenShareStopped', data);
    });

    // Renegotiation needed (when remote adds screen share track)
    this.socket.on('voiceCall:renegotiationNeeded', async (data) => {
      console.log('🔄 Renegotiation needed from remote user');
      // Remote user added a new track (screen share), we need to handle the new offer
      this.emit('renegotiationNeeded', data);
    });
  }

  // Initiate a call
  async initiateCall(targetUserId, callType = 'voice') {
    try {
      devLog.log(`📞 Initiating ${callType} call to:`, targetUserId);
      
      // Check if socket is available
      if (!this.socket) {
        throw new Error('Socket not initialized. Please wait for connection.');
      }
      
      // Try to get local media stream (optional for listen-only mode)
      let hasMedia = false;
      try {
        await this.getLocalStream(callType === 'video');
        hasMedia = true;
        console.log('✅ Media stream acquired for outgoing call');
      } catch (mediaError) {
        console.warn('⚠️ Failed to get media, starting call in listen-only mode:', mediaError.message);
        
        // Create silent audio track for listen-only mode
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const destination = audioContext.createMediaStreamDestination();
          this.localStream = destination.stream;
          
          console.log('✅ Silent stream created for listen-only outgoing call');
          this.emit('info', {
            type: 'listen-only-call',
            message: 'Mikrofonunuz bulunamadı. Sadece dinleme modunda arama başlatıldı.'
          });
        } catch (fallbackError) {
          console.error('❌ Even silent stream failed:', fallbackError);
          throw new Error('Medya cihazları bulunamadı');
        }
      }
      
      this.currentCall = {
        type: 'outgoing',
        userId: targetUserId,
        callType,
        listenOnly: !hasMedia
      };
      
      this.callState = 'calling';
      
      // Perfect negotiation: Caller is impolite (doesn't back off)
      this.isPolite = false;
      
      // Notify server
      this.socket.emit('voiceCall:initiate', { targetUserId, callType });
      
      return { success: true };
    } catch (error) {
      console.error('Failed to initiate call:', error);
      this.endCall();
      return { success: false, error: error.message };
    }
  }

  // Accept incoming call
  async acceptCall() {
    try {
      console.log('✅ Accepting call');
      
      if (!this.currentCall || this.currentCall.type !== 'incoming') {
        throw new Error('No incoming call to accept');
      }
      
      // Try to get local media stream (optional for listen-only mode)
      let hasMedia = false;
      try {
        await this.getLocalStream(this.currentCall.callType === 'video');
        hasMedia = true;
        console.log('✅ Media stream acquired for call');
      } catch (mediaError) {
        console.warn('⚠️ Failed to get media, accepting in listen-only mode:', mediaError.message);
        
        // Create silent audio track for listen-only mode
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const destination = audioContext.createMediaStreamDestination();
          this.localStream = destination.stream;
          
          console.log('✅ Silent stream created for listen-only mode');
          this.emit('info', {
            type: 'listen-only-call',
            message: 'Mikrofonunuz bulunamadı. Sadece dinleme modunda aramaya katıldınız.'
          });
        } catch (fallbackError) {
          console.error('❌ Even silent stream failed:', fallbackError);
          throw new Error('Medya cihazları bulunamadı');
        }
      }
      
      this.callState = 'connected';
      
      // Perfect negotiation: Callee is polite (backs off on collision)
      this.isPolite = true;
      
      // Notify server
      this.socket.emit('voiceCall:accept', { callerId: this.currentCall.userId });
      
      return { success: true, listenOnly: !hasMedia };
    } catch (error) {
      console.error('Failed to accept call:', error);
      this.endCall();
      return { success: false, error: error.message };
    }
  }

  // Reject incoming call
  rejectCall() {
    console.log('❌ Rejecting call');
    
    if (!this.currentCall || this.currentCall.type !== 'incoming') {
      return;
    }
    
    this.socket.emit('voiceCall:reject', { callerId: this.currentCall.userId });
    this.endCall();
  }

  // End current call
  endCall(callDuration = 0) {
    console.log('📴 Ending call');
    
    if (this.currentCall && this.socket) {
      this.socket.emit('voiceCall:end', { 
        targetUserId: this.currentCall.userId,
        callDuration 
      });
    }
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Clear remote stream
    this.remoteStream = null;
    
    this.currentCall = null;
    this.callState = 'idle';
    
    this.emit('callClosed');
  }

  // Get local media stream - Discord-level quality with fallbacks
  async getLocalStream(includeVideo = false) {
    // Try to get saved deviceId from settings
    let savedDeviceId = null;
    try {
      const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
      savedDeviceId = settings?.voice?.inputDevice;
    } catch (e) {
      // Ignore settings parsing errors
    }

    // Level 1: Enhanced Discord-quality
    try {
      const constraints = {
        audio: {
          // Use saved deviceId if available (ideal, not exact)
          ...(savedDeviceId && savedDeviceId !== 'default' ? { deviceId: { ideal: savedDeviceId } } : {}),
          
          // Core WebRTC processing
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          
          // Discord-quality audio (48kHz Opus codec)
          sampleRate: { ideal: 48000, min: 48000 },
          sampleSize: { ideal: 16 },
          channelCount: { ideal: 1 },
          latency: { ideal: 0.01, max: 0.02 },
          
          // Chrome-specific optimizations (Discord uses these)
          googEchoCancellation: { ideal: true },
          googNoiseSuppression: { ideal: true },
          googAutoGainControl: { ideal: true },
          googHighpassFilter: { ideal: true },
          googTypingNoiseDetection: { ideal: true },
          googAudioMirroring: { ideal: false }
        },
        video: includeVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Local stream acquired (Discord-level quality)');
      
      this.emit('localStream', this.localStream);
      return this.localStream;
      
    } catch (error) {
      console.warn('⚠️ Enhanced quality failed, trying basic:', error.message);
      
      // Level 2: Basic quality (no specific deviceId)
      try {
        const basicConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: includeVideo ? {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } : false
        };
        
        this.localStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
        console.log('✅ Local stream acquired (basic quality)');
        
        this.emit('localStream', this.localStream);
        return this.localStream;
        
      } catch (basicError) {
        console.warn('⚠️ Basic quality failed, trying minimal:', basicError.message);
        
        // Level 3: Minimal (just audio/video: true)
        try {
          const minimalConstraints = {
            audio: true,
            video: includeVideo
          };
          
          this.localStream = await navigator.mediaDevices.getUserMedia(minimalConstraints);
          console.log('⚠️ Local stream acquired (minimal quality - no processing)');
          
          this.emit('localStream', this.localStream);
          return this.localStream;
          
        } catch (minimalError) {
          console.error('❌ All media attempts failed:', minimalError);
          
          // If video was requested but failed, try audio-only as last resort
          if (includeVideo) {
            console.warn('🎥 Video failed, trying audio-only...');
            try {
              const audioOnlyConstraints = { audio: true, video: false };
              this.localStream = await navigator.mediaDevices.getUserMedia(audioOnlyConstraints);
              console.log('✅ Audio-only stream acquired');
              
              this.emit('localStream', this.localStream);
              return this.localStream;
            } catch (audioOnlyError) {
              console.error('❌ Even audio-only failed:', audioOnlyError);
            }
          }
          
          throw minimalError;
        }
      }
    }
  }

  // Optimize Opus codec in SDP (Discord-level)
  optimizeOpusSDP(sdp) {
    if (!sdp) return sdp;
    
    const opusMatch = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);
    if (!opusMatch) return sdp;
    
    const payloadType = opusMatch[1];
    const fmtpRegex = new RegExp(`a=fmtp:${payloadType} .*\\r\\n`);
    
    if (fmtpRegex.test(sdp)) {
      sdp = sdp.replace(
        fmtpRegex,
        `a=fmtp:${payloadType} maxaveragebitrate=64000;stereo=0;useinbandfec=1;usedtx=0\r\n`
      );
    } else {
      sdp = sdp.replace(
        new RegExp(`(a=rtpmap:${payloadType} opus\\/48000\\/2\\r\\n)`),
        `$1a=fmtp:${payloadType} maxaveragebitrate=64000;stereo=0;useinbandfec=1;usedtx=0\r\n`
      );
    }
    
    console.log('✅ Opus codec optimized (Discord-level: 64kbps, FEC enabled)');
    return sdp;
  }

  // Create WebRTC peer connection
  createPeerConnection(targetUserId) {
    this.peerConnection = new RTCPeerConnection(this.rtcConfiguration);
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }
    
    // DISCORD OPTIMIZATION: Apply Opus codec settings on negotiation
    this.peerConnection.addEventListener('negotiationneeded', async () => {
      if (this.peerConnection.signalingState !== 'stable') return;
      
      try {
        await this.peerConnection.setLocalDescription();
        
        const optimizedSdp = this.optimizeOpusSDP(this.peerConnection.localDescription.sdp);
        const optimizedOffer = new RTCSessionDescription({
          type: this.peerConnection.localDescription.type,
          sdp: optimizedSdp
        });
        
        await this.peerConnection.setLocalDescription(optimizedOffer);
      } catch (err) {
        console.error('Negotiation failed:', err);
      }
    });
    
    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('voiceCall:iceCandidate', {
          targetUserId,
          candidate: event.candidate
        });
      }
    };
    
    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      devLog.verbose('🔊 Received remote stream');
      this.remoteStream = event.streams[0];
      this.emit('remoteStream', this.remoteStream);
    };
    
    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      devLog.verbose('Connection state:', this.peerConnection.connectionState);
      this.emit('connectionStateChange', this.peerConnection.connectionState);
      
      if (this.peerConnection.connectionState === 'failed') {
        this.endCall();
      }
    };
    
    return this.peerConnection;
  }

  // Create WebRTC offer (Perfect Negotiation Pattern)
  async createOffer(isRenegotiation = false) {
    try {
      if (!this.currentCall) return;
      
      // Only create peer connection if it doesn't exist
      if (!this.peerConnection) {
        this.createPeerConnection(this.currentCall.userId);
      }
      
      const signalingState = this.peerConnection.signalingState;
      console.log(`📤 Creating offer (renegotiation: ${isRenegotiation}), signaling state:`, signalingState);
      
      // For initial offer, check if already created
      if (!isRenegotiation && this.peerConnection.localDescription && signalingState === 'stable') {
        console.log('⚠️ Initial offer already created and connection stable, skipping');
        return;
      }
      
      // Perfect negotiation: Set flag before making offer
      this.makingOffer = true;
      
      try {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        
        this.socket.emit('voiceCall:offer', {
          targetUserId: this.currentCall.userId,
          offer: offer
        });
        
        console.log(`📤 WebRTC offer sent ${isRenegotiation ? '(renegotiation)' : ''}`);
      } finally {
        this.makingOffer = false;
      }
    } catch (error) {
      console.error('Failed to create offer:', error);
      this.makingOffer = false;
      // Don't end call on renegotiation errors
      if (!isRenegotiation) {
        this.endCall();
      }
    }
  }

  // Handle WebRTC offer (Perfect Negotiation Pattern)
  async handleOffer(callerId, offer) {
    try {
      // Only create new peer connection if it doesn't exist
      if (!this.peerConnection) {
        this.createPeerConnection(callerId);
      }
      
      const signalingState = this.peerConnection.signalingState;
      console.log('📥 Received offer, current signaling state:', signalingState);
      
      // Perfect Negotiation: Check for offer collision
      const offerCollision = signalingState !== 'stable' && signalingState !== 'have-remote-offer';
      
      // Ignore offer if we're making an offer (polite peer backs off)
      this.ignoreOffer = !this.isPolite && offerCollision;
      
      if (this.ignoreOffer) {
        console.log('⚠️ Ignoring offer due to collision (impolite peer)');
        return;
      }
      
      // If collision and we're polite, rollback our offer
      if (offerCollision) {
        console.log('⚠️ Offer collision detected, rolling back (polite peer)');
        await this.peerConnection.setLocalDescription({ type: 'rollback' });
      }
      
      // Set remote description (the offer)
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.socket.emit('voiceCall:answer', {
        targetUserId: callerId,
        answer: answer
      });
      
      console.log('📤 WebRTC answer sent');
    } catch (error) {
      console.error('Failed to handle offer:', error);
      // Don't end call on renegotiation errors, just log
      if (!this.peerConnection || this.peerConnection.connectionState === 'new') {
        this.endCall();
      }
    }
  }

  // Handle WebRTC answer
  async handleAnswer(answer) {
    try {
      if (!this.peerConnection) {
        console.log('⚠️ No peer connection for answer');
        return;
      }
      
      // Check signaling state
      if (this.peerConnection.signalingState === 'stable') {
        console.log('⚠️ Peer connection already stable, ignoring answer');
        return;
      }
      
      // Only set remote description if we're in the right state
      if (this.peerConnection.signalingState === 'have-local-offer') {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        devLog.verbose('✅ WebRTC answer processed');
      } else {
        console.log('⚠️ Wrong signaling state for answer:', this.peerConnection.signalingState);
      }
    } catch (error) {
      console.error('Failed to handle answer:', error);
      this.endCall();
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(candidate) {
    try {
      if (!this.peerConnection) return;
      
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }

  // Mute/unmute microphone
  toggleMute() {
    if (!this.localStream) return { isMuted: false };
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const isMuted = !audioTrack.enabled;
      this.emit('muteToggled', isMuted);
      
      // Notify other user about mute status
      if (this.currentCall && this.socket) {
        this.socket.emit('voiceCall:muteStatus', {
          targetUserId: this.currentCall.userId,
          isMuted
        });
      }
      
      return { isMuted };
    }
    return { isMuted: false };
  }

  // Enable/disable video
  toggleVideo() {
    if (!this.localStream) return { isVideoOff: false };
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const isVideoOff = !videoTrack.enabled;
      this.emit('videoToggled', isVideoOff);
      return { isVideoOff };
    }
    return { isVideoOff: false };
  }

  /**
   * Send speaking status to remote user
   * @param {string} targetUserId - Target user ID
   * @param {boolean} isSpeaking - Whether user is currently speaking
   */
  sendSpeakingStatus(targetUserId, isSpeaking) {
    if (!this.socket) return;
    
    this.socket.emit('voiceCall:speaking', {
      targetUserId,
      isSpeaking
    });
  }

  /**
   * Start screen sharing - Electron-First Approach
   * @returns {Promise<{success: boolean, stream?: MediaStream, error?: string}>}
   */
  async startScreenShare(options = {}) {
    try {
      console.log('🖥️ startScreenShare called with options:', options);
      let constraints = null;
      let screenStream;
      
      // Check if Electron
      const isElectron = window.electronAPI?.isElectron?.();
      
      if (isElectron) {
        // Electron native implementation
        let sourceId;
        
        if (options.source?.id) {
          sourceId = options.source.id;
          console.log('✅ Using selected source:', sourceId, 'Name:', options.source.name);
        } else if (options.sourceId) {
          sourceId = options.sourceId;
          console.log('✅ Using selected sourceId:', sourceId);
        } else {
          // Fallback: get available sources and use first screen
          const sources = await window.electronAPI.getDesktopSources();
          
          if (!sources || sources.length === 0) {
            return { success: false, error: 'Ekran kaynağı bulunamadı' };
          }
          
          const primaryScreen = sources.find(source => source.id.startsWith('screen:')) || sources[0];
          sourceId = primaryScreen.id;
        }
        
        const isWindowShare = sourceId.startsWith('window:');
        // Discord-like quality: Lower FPS for better CPU performance
        const quality = options.quality || { width: 1280, height: 720, frameRate: 15 };
        
        constraints = {
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              maxWidth: quality.width,
              maxHeight: quality.height,
              maxFrameRate: quality.frameRate
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
        
        // Get screen stream
        try {
          screenStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (audioError) {
          // If audio fails, try video only
          if (audioError.name === 'NotReadableError' && constraints.audio) {
            const videoOnlyConstraints = {
              ...constraints,
              audio: false
            };
            screenStream = await navigator.mediaDevices.getUserMedia(videoOnlyConstraints);
          } else {
            throw audioError;
          }
        }
      } else {
        // Browser fallback
        const quality = options.quality || { width: 1920, height: 1080, frameRate: 30 };
        
        constraints = {
          video: {
            width: { ideal: Math.min(quality.width, 1920) },
            height: { ideal: Math.min(quality.height, 1080) },
            frameRate: { ideal: Math.min(quality.frameRate, 60) },
            cursor: 'always'
          },
          audio: options.includeAudio !== false ? {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          } : false
        };
        
        screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      }

      // 🚀 OPTIMIZATION: Use OffscreenCanvas for better performance
      let optimizedStream = screenStream;
      
      try {
        // Create hidden video element for processing
        const tempVideo = document.createElement('video');
        tempVideo.srcObject = screenStream;
        tempVideo.muted = true;
        tempVideo.playsInline = true;
        await tempVideo.play();

        // Initialize optimized screen share
        this.optimizedScreenShare = new OptimizedScreenShare();
        optimizedStream = await this.optimizedScreenShare.initialize(tempVideo);
        this.optimizedScreenShare.startProcessing();
        
        devLog.log('✅ Optimized screen share initialized');
      } catch (error) {
        console.warn('⚠️ Optimized screen share failed, using original stream:', error);
        optimizedStream = screenStream;
      }

      // Add screen track to peer connection
      if (this.peerConnection) {
        const screenTrack = optimizedStream.getVideoTracks()[0];
        const audioTrack = optimizedStream.getAudioTracks()[0];
        
        // Find existing video sender or add new track
        const videoSender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video');
        
        if (videoSender) {
          // Replace existing video track
          await videoSender.replaceTrack(screenTrack);
        } else {
          // Add new video track
          this.peerConnection.addTrack(screenTrack, optimizedStream);
        }
        
        // Add audio track if available
        if (audioTrack) {
          const audioSender = this.peerConnection.getSenders().find(s => s.track?.kind === 'audio' && s.track !== this.localStream?.getAudioTracks()[0]);
          if (!audioSender) {
            this.peerConnection.addTrack(audioTrack, optimizedStream);
          }
        }
        
        // Store screen stream and original video track
        this.screenStream = optimizedStream;
        this.originalVideoTrack = videoSender?.track;
        
        // Handle screen share stop
        screenTrack.onended = () => {
          this.stopScreenShare();
        };

        // Notify remote user and trigger renegotiation
        if (this.currentCall && this.socket) {
          this.socket.emit('voiceCall:screenShareStarted', {
            targetUserId: this.currentCall.userId
          });
          
          // Request renegotiation to send new offer with screen track
          this.socket.emit('voiceCall:renegotiate', {
            targetUserId: this.currentCall.userId
          });
          
          // Create new offer with screen share track (force renegotiation)
          await this.createOffer(true);
        }

        this.emit('screenShareStarted', optimizedStream);
        return { success: true, stream: optimizedStream };
      }

      return { success: false, error: 'Peer connection yok' };
    } catch (error) {
      console.error('Screen share error:', error);
      
      let errorMessage = error.message;
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Ekran paylaşımı izni reddedildi';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Tarayıcı ekran paylaşımını desteklemiyor';
      } else if (error.message.includes('No screen sources')) {
        errorMessage = 'Paylaşılacak ekran bulunamadı';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare() {
    if (this.screenStream) {
      // Stop optimized screen share
      if (this.optimizedScreenShare) {
        this.optimizedScreenShare.stop();
        this.optimizedScreenShare = null;
        devLog.log('✅ Optimized screen share stopped');
      }
      
      // Stop screen stream
      this.screenStream.getTracks().forEach(track => track.stop());
      
      // Restore original video track if exists
      if (this.originalVideoTrack && this.peerConnection) {
        const videoSender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(this.originalVideoTrack);
        }
      }
      
      // Notify remote user
      if (this.currentCall && this.socket) {
        this.socket.emit('voiceCall:screenShareStopped', {
          targetUserId: this.currentCall.userId
        });
        
        // Renegotiate to remove screen track (force renegotiation)
        await this.createOffer(true);
      }
      
      this.screenStream = null;
      this.originalVideoTrack = null;
      this.emit('screenShareEnded');
    }
  }

  // Event emitter
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => callback(data));
  }

  // Get current call state
  getCallState() {
    return {
      state: this.callState,
      call: this.currentCall
    };
  }

  // Cleanup local resources without emitting to server
  cleanupLocal() {
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Clear remote stream
    this.remoteStream = null;
    
    // Reset perfect negotiation flags
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.isPolite = false;
    
    this.currentCall = null;
    this.callState = 'idle';
  }

  // Cleanup
  cleanup() {
    this.endCall();
    this.listeners.clear();
    console.log('🧹 Voice call service cleaned up');
  }
}

// Export singleton instance
const voiceCallService = new VoiceCallService();
export default voiceCallService;
