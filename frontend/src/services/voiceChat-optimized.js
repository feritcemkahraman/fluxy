// Optimized Voice Chat Service with Memory Management & Security
import websocketService from './websocket';
import electronAPI from '../utils/electronAPI';

// ============================================================================
// SECURITY & BUFFER OVERFLOW PROTECTION
// ============================================================================

const VOICE_LIMITS = {
  MAX_PARTICIPANTS: 50,
  MAX_AUDIO_BUFFER_SIZE: 1024 * 1024, // 1MB
  MAX_CALLBACK_QUEUE: 100,
  AUDIO_TIMEOUT: 30000, // 30 seconds
  RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 2000 // 2 seconds
};

// Secure data validator for voice chat
function validateVoiceData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid voice data format');
  }

  // Validate participant count
  if (data.participants && Array.isArray(data.participants)) {
    if (data.participants.length > VOICE_LIMITS.MAX_PARTICIPANTS) {
      throw new Error(`Too many participants: ${data.participants.length}`);
    }
  }

  // Validate audio buffer size
  if (data.audioBuffer && data.audioBuffer.byteLength > VOICE_LIMITS.MAX_AUDIO_BUFFER_SIZE) {
    throw new Error(`Audio buffer too large: ${data.audioBuffer.byteLength} bytes`);
  }

  return true;
}

// ============================================================================
// OPTIMIZED VOICE CHAT SERVICE
// ============================================================================

class VoiceChatService {
  constructor() {
    this.isConnected = false;
    this.currentChannel = null;
    this.currentUserId = null;
    this.participants = [];
    this.localStream = null;
    this.isMuted = false;
    this.isDeafened = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    
    // Performance optimizations
    this.audioContext = null;
    this.audioWorklet = null;
    this.streamCleanupTimer = null;
    
    // Memory management
    this.callbackQueue = new Map();
    this.maxCallbacks = VOICE_LIMITS.MAX_CALLBACK_QUEUE;
    
    // Enhanced callback system with memory management
    this.callbacks = {
      connected: new Set(),
      disconnected: new Set(),
      participantsChanged: new Set(),
      muteChanged: new Set(),
      deafenChanged: new Set(),
      'speaking-changed': new Set(),
      error: new Set()
    };

    // Bind methods to prevent memory leaks
    this.handleStreamEnd = this.handleStreamEnd.bind(this);
    this.handleAudioError = this.handleAudioError.bind(this);
    this.cleanup = this.cleanup.bind(this);
    
    // Setup cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.cleanup);
      window.addEventListener('unload', this.cleanup);
    }
  }

  // ============================================================================
  // SECURE EVENT SYSTEM WITH MEMORY MANAGEMENT
  // ============================================================================

  on(event, callback) {
    if (!this.callbacks[event]) {
      console.warn(`Unknown event: ${event}`);
      return;
    }

    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    // Prevent memory leaks by limiting callbacks
    if (this.callbacks[event].size >= this.maxCallbacks) {
      console.warn(`Too many callbacks for event: ${event}`);
      return;
    }

    this.callbacks[event].add(callback);
  }

  off(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].delete(callback);
    }
  }

  // Safe emit with error handling and performance monitoring
  emit(event, data) {
    if (!this.callbacks[event]) {
      console.warn('❌ No callbacks for event:', event);
      return;
    }

    // Validate data before emitting
    try {
      if (data && typeof data === 'object') {
        validateVoiceData(data);
      }
    } catch (error) {
      console.error('Voice data validation failed:', error.message);
      this.emit('error', { type: 'validation', message: error.message });
      return;
    }

    console.log('🔊 VoiceChat emit:', event, data);
    
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      this.callbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Callback error for ${event}:`, error);
          this.emit('error', { type: 'callback', event, error: error.message });
        }
      });
    });
  }

  // ============================================================================
  // ENHANCED AUDIO MANAGEMENT
  // ============================================================================

  async getUserMedia() {
    try {
      // Clean up existing stream first
      if (this.localStream) {
        this.stopLocalStream();
      }

      // Enhanced audio constraints for Electron with better performance
      const constraints = {
        audio: {
          // Core settings
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          
          // Quality settings optimized for desktop
          sampleRate: { ideal: 48000, min: 44100 },
          channelCount: { ideal: 1 },
          
          // Latency optimization
          latency: { ideal: 0.01, max: 0.05 }, // 10-50ms
          
          // Advanced Chrome/Electron settings
          googEchoCancellation: true,
          googNoiseSuppression: true,
          googAutoGainControl: true,
          googHighpassFilter: true,
          googTypingNoiseDetection: true,
          googAudioMirroring: false,
          
          // Performance optimizations
          googCpuOveruseDetection: true,
          googCpuUnderuseThreshold: 55,
          googCpuOveruseThreshold: 85
        }
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Setup stream monitoring
      this.setupStreamMonitoring();
      
      console.log('✅ Enhanced audio stream acquired');
      return this.localStream;
      
    } catch (error) {
      console.error('❌ Enhanced audio failed, trying fallback:', error);
      
      // Fallback to basic audio
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        this.setupStreamMonitoring();
        return this.localStream;
        
      } catch (basicError) {
        console.error('❌ Basic audio also failed:', basicError);
        this.emit('error', { 
          type: 'audio', 
          message: 'Microphone access failed',
          details: basicError.message 
        });
        throw basicError;
      }
    }
  }

  setupStreamMonitoring() {
    if (!this.localStream) return;

    // Monitor stream health
    this.localStream.getTracks().forEach(track => {
      track.addEventListener('ended', this.handleStreamEnd);
      track.addEventListener('mute', () => {
        console.warn('Audio track muted unexpectedly');
        this.emit('error', { type: 'audio', message: 'Audio track muted' });
      });
    });

    // Setup cleanup timer
    if (this.streamCleanupTimer) {
      clearTimeout(this.streamCleanupTimer);
    }
    
    this.streamCleanupTimer = setTimeout(() => {
      if (this.localStream && !this.isConnected) {
        console.log('Cleaning up unused audio stream');
        this.stopLocalStream();
      }
    }, VOICE_LIMITS.AUDIO_TIMEOUT);
  }

  handleStreamEnd() {
    console.warn('Audio stream ended unexpectedly');
    this.emit('error', { type: 'audio', message: 'Audio stream ended' });
    
    // Attempt to reconnect if still connected to voice channel
    if (this.isConnected && this.currentChannel) {
      this.attemptReconnect();
    }
  }

  handleAudioError(error) {
    console.error('Audio error:', error);
    this.emit('error', { type: 'audio', message: error.message });
  }

  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.removeEventListener('ended', this.handleStreamEnd);
        track.stop();
      });
      this.localStream = null;
    }

    if (this.streamCleanupTimer) {
      clearTimeout(this.streamCleanupTimer);
      this.streamCleanupTimer = null;
    }
  }

  // ============================================================================
  // OPTIMIZED VOICE CHANNEL OPERATIONS
  // ============================================================================

  async joinChannel(channelId) {
    try {
      console.log('🎤 Starting joinChannel:', channelId);
      
      // Validate channel ID
      if (!channelId || typeof channelId !== 'string') {
        throw new Error('Invalid channel ID');
      }

      // Check if already connected to this channel
      if (this.isConnected && this.currentChannel === channelId) {
        console.log('✅ Already connected to this channel');
        this.emit('connected', { channelId });
        this.emit('participantsChanged', this.participants);
        return true;
      }

      // Leave current channel if connected to different one
      if (this.isConnected && this.currentChannel !== channelId) {
        await this.leaveChannel();
      }
      
      console.log('🎧 Getting user media...');
      
      // Get microphone access with timeout
      const mediaPromise = this.getUserMedia();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Media access timeout')), 10000);
      });
      
      await Promise.race([mediaPromise, timeoutPromise]);
      console.log('✅ User media acquired');
      
      this.isConnected = true;
      this.currentChannel = channelId;
      this.reconnectAttempts = 0;
      
      // Create optimized participant object
      this.participants = [{
        user: { 
          id: this.currentUserId,
          _id: this.currentUserId,
          username: this.currentUser?.username || this.currentUser?.displayName || 'You',
          displayName: this.currentUser?.displayName || this.currentUser?.username || 'You'
        },
        isMuted: this.isMuted,
        isDeafened: this.isDeafened,
        isCurrentUser: true,
        isSpeaking: false,
        joinedAt: Date.now()
      }];
      
      console.log('📡 Notifying server...');
      
      // Notify server with error handling
      if (websocketService.socket?.connected) {
        websocketService.socket.emit('join-voice-channel', { 
          channelId,
          timestamp: Date.now(),
          audioSettings: {
            sampleRate: this.localStream?.getAudioTracks()[0]?.getSettings()?.sampleRate || 48000,
            channelCount: 1
          }
        });
      } else {
        throw new Error('WebSocket not connected');
      }
      
      console.log('🔊 Emitting connected event...');
      this.emit('connected', { channelId, timestamp: Date.now() });
      this.emit('participantsChanged', this.participants);
      
      // Desktop notification
      if (electronAPI.isElectron()) {
        electronAPI.showNotification('Fluxy', `Ses kanalına katıldınız: ${channelId}`);
      }
      
      console.log('✅ joinChannel completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Voice join failed:', error);
      
      // Cleanup on failure
      this.isConnected = false;
      this.currentChannel = null;
      this.stopLocalStream();
      
      // Show error notification
      if (electronAPI.isElectron()) {
        electronAPI.showNotification('Fluxy - Hata', `Ses kanalına katılamadı: ${error.message}`);
      }
      
      this.emit('error', { 
        type: 'connection', 
        message: 'Failed to join voice channel',
        details: error.message 
      });
      
      throw error;
    }
  }

  async leaveChannel() {
    try {
      console.log('🚪 Leaving voice channel:', this.currentChannel);
      
      const leftChannel = this.currentChannel;
      
      // Stop local stream
      this.stopLocalStream();
      
      // Clear reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      // Notify server
      if (websocketService.socket?.connected && leftChannel) {
        websocketService.socket.emit('leave-voice-channel', { 
          channelId: leftChannel,
          timestamp: Date.now()
        });
      }
      
      this.isConnected = false;
      this.currentChannel = null;
      this.participants = [];
      this.reconnectAttempts = 0;
      
      this.emit('disconnected', { channelId: leftChannel, timestamp: Date.now() });
      this.emit('participantsChanged', []);
      
      console.log('✅ Successfully left voice channel');
      return true;
      
    } catch (error) {
      console.error('❌ Voice leave failed:', error);
      this.emit('error', { 
        type: 'disconnection', 
        message: 'Failed to leave voice channel',
        details: error.message 
      });
      throw error;
    }
  }

  // ============================================================================
  // AUDIO CONTROLS WITH OPTIMIZATION
  // ============================================================================

  toggleMute() {
    try {
      this.isMuted = !this.isMuted;
      
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => {
          track.enabled = !this.isMuted;
        });
      }
      
      // Update participant state
      if (this.participants.length > 0 && this.participants[0].isCurrentUser) {
        this.participants[0].isMuted = this.isMuted;
      }
      
      console.log(`🎤 Mute toggled: ${this.isMuted ? 'ON' : 'OFF'}`);
      this.emit('muteChanged', this.isMuted);
      
      // Notify server
      if (websocketService.socket?.connected && this.currentChannel) {
        websocketService.socket.emit('voice-state-change', {
          channelId: this.currentChannel,
          isMuted: this.isMuted,
          isDeafened: this.isDeafened,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      console.error('Mute toggle failed:', error);
      this.emit('error', { type: 'audio', message: 'Failed to toggle mute' });
    }
  }

  toggleDeafen() {
    try {
      this.isDeafened = !this.isDeafened;
      
      // Auto-mute when deafened (Discord behavior)
      if (this.isDeafened && !this.isMuted) {
        this.isMuted = true;
        if (this.localStream) {
          this.localStream.getAudioTracks().forEach(track => {
            track.enabled = false;
          });
        }
        this.emit('muteChanged', this.isMuted);
      }
      
      // Update participant state
      if (this.participants.length > 0 && this.participants[0].isCurrentUser) {
        this.participants[0].isMuted = this.isMuted;
        this.participants[0].isDeafened = this.isDeafened;
      }
      
      console.log(`🔇 Deafen toggled: ${this.isDeafened ? 'ON' : 'OFF'}`);
      this.emit('deafenChanged', this.isDeafened);
      
      // Notify server
      if (websocketService.socket?.connected && this.currentChannel) {
        websocketService.socket.emit('voice-state-change', {
          channelId: this.currentChannel,
          isMuted: this.isMuted,
          isDeafened: this.isDeafened,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      console.error('Deafen toggle failed:', error);
      this.emit('error', { type: 'audio', message: 'Failed to toggle deafen' });
    }
  }

  // ============================================================================
  // RECONNECTION & ERROR HANDLING
  // ============================================================================

  async attemptReconnect() {
    if (this.reconnectAttempts >= VOICE_LIMITS.RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      this.emit('error', { 
        type: 'connection', 
        message: 'Failed to reconnect after multiple attempts' 
      });
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${VOICE_LIMITS.RECONNECT_ATTEMPTS}`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        if (this.currentChannel) {
          await this.joinChannel(this.currentChannel);
        }
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.attemptReconnect();
      }
    }, VOICE_LIMITS.RECONNECT_DELAY * this.reconnectAttempts);
  }

  // ============================================================================
  // STATE MANAGEMENT & UTILITIES
  // ============================================================================

  getState() {
    return {
      isConnected: this.isConnected,
      currentChannel: this.currentChannel,
      participants: [...this.participants], // Return copy to prevent mutations
      isMuted: this.isMuted,
      isDeafened: this.isDeafened,
      reconnectAttempts: this.reconnectAttempts,
      hasLocalStream: !!this.localStream,
      timestamp: Date.now()
    };
  }

  getStatus() {
    return this.getState();
  }

  setCurrentUserId(userId) {
    if (typeof userId !== 'string') {
      throw new Error('User ID must be a string');
    }
    this.currentUserId = userId;
  }

  setCurrentUser(user) {
    this.currentUser = user;
    this.currentUserId = user?._id || user?.id;
  }

  isElectronApp() {
    return electronAPI.isElectron();
  }

  // ============================================================================
  // MEMORY MANAGEMENT & CLEANUP
  // ============================================================================

  cleanup() {
    console.log('🧹 Cleaning up VoiceChatService...');
    
    try {
      // Stop audio streams
      this.stopLocalStream();
      
      // Clear timers
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      if (this.streamCleanupTimer) {
        clearTimeout(this.streamCleanupTimer);
        this.streamCleanupTimer = null;
      }
      
      // Clear callbacks to prevent memory leaks
      Object.keys(this.callbacks).forEach(event => {
        this.callbacks[event].clear();
      });
      
      // Reset state
      this.isConnected = false;
      this.currentChannel = null;
      this.participants = [];
      this.reconnectAttempts = 0;
      
      // Close audio context if exists
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }
      
      console.log('✅ VoiceChatService cleanup completed');
      
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================

  getPerformanceMetrics() {
    return {
      isConnected: this.isConnected,
      participantCount: this.participants.length,
      hasLocalStream: !!this.localStream,
      reconnectAttempts: this.reconnectAttempts,
      callbackCounts: Object.fromEntries(
        Object.entries(this.callbacks).map(([event, callbacks]) => [event, callbacks.size])
      ),
      memoryUsage: {
        participants: this.participants.length,
        callbacks: Object.values(this.callbacks).reduce((sum, set) => sum + set.size, 0)
      },
      timestamp: Date.now()
    };
  }
}

// Export singleton instance with cleanup registration
const voiceChatService = new VoiceChatService();

// Register cleanup on module unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    voiceChatService.cleanup();
  });
}

export default voiceChatService;
