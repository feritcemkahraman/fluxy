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
    socketService.on('userJoinedVoice', this.handleUserJoined.bind(this));
    socketService.on('userLeftVoice', this.handleUserLeft.bind(this));
    socketService.on('voice-signal', this.handleSignal.bind(this));
    socketService.on('voice-user-muted', this.handleUserMuted.bind(this));
    socketService.on('voice-user-deafened', this.handleUserDeafened.bind(this));
    socketService.on('screen-share-started', this.handleScreenShareStarted.bind(this));
    socketService.on('screen-share-stopped', this.handleScreenShareStopped.bind(this));
    socketService.on('screen-signal', this.handleScreenSignal.bind(this));
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

  // Get user media (microphone)
  async getUserMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false
      });

      // Start voice activity detection
      this.startVoiceActivityDetection();

      return this.localStream;
    } catch (error) {
      throw new Error('Could not access microphone. Please check permissions.');
    }
  }

  // Start voice activity detection
  startVoiceActivityDetection() {
    try {
      if (!this.localStream) return;

      // Create AudioContext
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(this.localStream);

      // Configure analyser
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.microphone.connect(this.analyser);

      // Start monitoring
      this.monitorAudioLevel();
    } catch (error) {
    }
  }

  // Monitor audio level continuously
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

      // Don't stop monitoring if not connected, just don't emit events
      // This allows monitoring to continue even when reconnecting

      try {
        this.analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const volume = average / 255; // Normalize to 0-1

        // Debug every 100 frames to avoid spam
        if (Math.random() < 0.01) {
        }

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

  // Stop voice activity detection
  stopVoiceActivityDetection() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    this.analyser = null;
    this.microphone = null;
    this.isSpeaking = false;
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

      // Get user media
      await this.getUserMedia();
      
      this.currentChannel = channelId;
      this.isConnected = true;

      socketService.joinVoiceChannel(channelId);
      
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
    if (channelId !== this.currentChannel || !this.localStream) return;

    // Create peer connection (initiator)
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: this.localStream
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
    if (channelId !== this.currentChannel) return;

    let peer = this.peers.get(userId);

    if (!peer && this.localStream) {
      // Create peer connection (not initiator)
      peer = new Peer({
        initiator: false,
        trickle: false,
        stream: this.localStream
      });

      this.setupPeerEvents(peer, userId);
      this.peers.set(userId, peer);
    }

    if (peer) {
      peer.signal(signal);
    }
  }

  // Setup peer connection events
  setupPeerEvents(peer, userId) {
    peer.on('signal', (signal) => {
      socketService.sendVoiceSignal(signal, userId, this.currentChannel, this.currentUserId);
    });

    peer.on('stream', (remoteStream) => {
      this.emit('remote-stream', { userId, stream: remoteStream });
    });

    peer.on('error', (error) => {
      this.emit('peer-error', { userId, error });
    });

    peer.on('close', () => {
      this.peers.delete(userId);
      this.emit('peer-disconnected', { userId });
    });

    peer.on('connect', () => {
    });
  }

  // Mute/unmute microphone
  toggleMute() {
    if (!this.localStream) return;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.isMuted = !audioTrack.enabled;

      // Notify other users
      socketService.sendVoiceMuteStatus(this.currentChannel, this.isMuted, this.currentUserId);

      this.emit('mute-changed', { isMuted: this.isMuted });
    }
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

  // Set current user ID
  setCurrentUserId(userId) {
    this.currentUserId = userId;
  }

  // Get current status
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
      screenSharingUsers: Array.from(this.screenPeers.keys())
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
