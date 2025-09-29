// Voice Call Service - WebRTC Peer-to-Peer Voice/Video Calls
// Discord-like individual calling system

class VoiceCallService {
  constructor() {
    this.socket = null;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.currentCall = null;
    this.callState = 'idle'; // idle, calling, ringing, connected
    this.listeners = new Map();
    
    // WebRTC configuration
    this.rtcConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  // Initialize with socket
  initialize(socket) {
    this.socket = socket;
    this.setupSocketListeners();
    console.log('🎤 Voice call service initialized');
  }

  // Setup socket event listeners
  setupSocketListeners() {
    if (!this.socket) return;

    // Incoming call
    this.socket.on('voiceCall:incoming', (data) => {
      console.log('📞 Incoming call from:', data.callerUsername);
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

    // Call ringing
    this.socket.on('voiceCall:ringing', (data) => {
      console.log('📱 Call ringing...');
      this.callState = 'calling';
      this.emit('callRinging', data);
    });

    // Call accepted
    this.socket.on('voiceCall:accepted', async (data) => {
      console.log('✅ Call accepted by:', data.username);
      this.callState = 'connected';
      this.emit('callAccepted', data);
      
      // Create offer for WebRTC connection
      await this.createOffer();
    });

    // Call rejected
    this.socket.on('voiceCall:rejected', (data) => {
      console.log('❌ Call rejected by:', data.username);
      this.endCall();
      this.emit('callRejected', data);
    });

    // Call ended
    this.socket.on('voiceCall:ended', (data) => {
      console.log('📴 Call ended by:', data.username);
      this.endCall();
      this.emit('callEnded', data);
    });

    // WebRTC offer received
    this.socket.on('voiceCall:offer', async ({ callerId, offer }) => {
      console.log('🔄 Received WebRTC offer');
      await this.handleOffer(callerId, offer);
    });

    // WebRTC answer received
    this.socket.on('voiceCall:answer', async ({ userId, answer }) => {
      console.log('🔄 Received WebRTC answer');
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
  }

  // Initiate a call
  async initiateCall(targetUserId, callType = 'voice') {
    try {
      console.log(`📞 Initiating ${callType} call to:`, targetUserId);
      
      // Check if socket is available
      if (!this.socket) {
        throw new Error('Socket not initialized. Please wait for connection.');
      }
      
      // Get local media stream
      await this.getLocalStream(callType === 'video');
      
      this.currentCall = {
        type: 'outgoing',
        userId: targetUserId,
        callType
      };
      
      this.callState = 'calling';
      
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
      
      // Get local media stream
      await this.getLocalStream(this.currentCall.callType === 'video');
      
      this.callState = 'connected';
      
      // Notify server
      this.socket.emit('voiceCall:accept', { callerId: this.currentCall.userId });
      
      return { success: true };
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
  endCall() {
    console.log('📴 Ending call');
    
    if (this.currentCall && this.socket) {
      this.socket.emit('voiceCall:end', { targetUserId: this.currentCall.userId });
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

  // Get local media stream
  async getLocalStream(includeVideo = false) {
    try {
      const constraints = {
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
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('🎤 Local stream acquired');
      
      this.emit('localStream', this.localStream);
      
      return this.localStream;
    } catch (error) {
      console.error('Failed to get local stream:', error);
      throw error;
    }
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
      console.log('🔊 Received remote stream');
      this.remoteStream = event.streams[0];
      this.emit('remoteStream', this.remoteStream);
    };
    
    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
      this.emit('connectionStateChange', this.peerConnection.connectionState);
      
      if (this.peerConnection.connectionState === 'failed') {
        this.endCall();
      }
    };
    
    return this.peerConnection;
  }

  // Create WebRTC offer
  async createOffer() {
    try {
      if (!this.currentCall) return;
      
      this.createPeerConnection(this.currentCall.userId);
      
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.socket.emit('voiceCall:offer', {
        targetUserId: this.currentCall.userId,
        offer: offer
      });
      
      console.log('📤 WebRTC offer sent');
    } catch (error) {
      console.error('Failed to create offer:', error);
      this.endCall();
    }
  }

  // Handle WebRTC offer
  async handleOffer(callerId, offer) {
    try {
      this.createPeerConnection(callerId);
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.socket.emit('voiceCall:answer', {
        targetUserId: callerId,
        answer: answer
      });
      
      console.log('📤 WebRTC answer sent');
    } catch (error) {
      console.error('Failed to handle offer:', error);
      this.endCall();
    }
  }

  // Handle WebRTC answer
  async handleAnswer(answer) {
    try {
      if (!this.peerConnection) return;
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('✅ WebRTC answer processed');
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
    if (!this.localStream) return false;
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.emit('muteToggled', !audioTrack.enabled);
      return !audioTrack.enabled;
    }
    return false;
  }

  // Enable/disable video
  toggleVideo() {
    if (!this.localStream) return false;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      this.emit('videoToggled', !videoTrack.enabled);
      return !videoTrack.enabled;
    }
    return false;
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
