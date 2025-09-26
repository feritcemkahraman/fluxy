// Simple Voice Chat Service - Electron Compatible
import { EventEmitter } from 'events';
import websocketService from './websocket';
import electronAPI from '../utils/electronAPI';

class VoiceChatService extends EventEmitter {
  constructor() {
    super();
    this.isConnected = false;
    this.currentChannel = null;
    this.currentUserId = null;
    this.participants = [];
    this.localStream = null;
    this.isMuted = false;
    this.isDeafened = false;
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
      // console.log('🎤 Joining voice channel:', channelId);
      
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
      this.participants = [{ user: { id: this.currentUserId }, isMuted: false }];
      
      // Notify server
      if (websocketService.socket?.connected) {
        websocketService.socket.emit('join-voice-channel', { channelId });
      }
      
      // Show desktop notification (only when actually joining, not when already connected)
      if (electronAPI.isElectron()) {
        electronAPI.showNotification('Fluxy', `Ses kanalına katıldınız: ${channelId}`);
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
      
      // Show desktop notification
      if (electronAPI.isElectron()) {
        electronAPI.showNotification('Fluxy', `Ses kanalından ayrıldınız`);
      }
      
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
    
    // Desktop notification for mute status
    if (electronAPI.isElectron()) {
      electronAPI.showNotification('Fluxy', this.isMuted ? 'Mikrofon kapatıldı' : 'Mikrofon açıldı');
    }
    
    this.emit('muteChanged', this.isMuted);
  }

  // Toggle deafen with desktop integration
  toggleDeafen() {
    this.isDeafened = !this.isDeafened;
    
    // Desktop notification for deafen status
    if (electronAPI.isElectron()) {
      electronAPI.showNotification('Fluxy', this.isDeafened ? 'Kulaklık kapatıldı' : 'Kulaklık açıldı');
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

  // Set user ID
  setCurrentUserId(userId) {
    this.currentUserId = userId;
  }

  // Desktop-specific: Check if running in Electron
  isElectronApp() {
    return electronAPI.isElectron();
  }
}

// Export singleton instance
export default new VoiceChatService();
