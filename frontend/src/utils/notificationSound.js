/**
 * Notification Sound Service
 * Handles playing notification sounds for messages
 */

class NotificationSoundService {
  constructor() {
    this.audio = null;
    this.enabled = true;
    this.volume = 0.5;
    this.activeConversationId = null;
  }

  /**
   * Set the currently active conversation
   * @param {string} conversationId - The ID of the active conversation
   */
  setActiveConversation(conversationId) {
    this.activeConversationId = conversationId;
  }

  /**
   * Clear the active conversation
   */
  clearActiveConversation() {
    this.activeConversationId = null;
  }

  /**
   * Play message notification sound
   * @param {string} conversationId - The conversation ID of the incoming message
   */
  playMessageSound(conversationId) {
    if (!this.enabled) return;

    // Don't play sound if the message is from the currently active conversation
    if (conversationId && this.activeConversationId === conversationId) {
      return;
    }

    try {
      // Create new audio instance each time to allow multiple plays
      const { getSoundPath } = require('./assetHelper');
      const audio = new Audio(getSoundPath('mesajses.mp3'));
      audio.volume = this.volume;
      
      // Play the sound
      audio.play().catch(error => {
        console.warn('Failed to play notification sound:', error);
      });
    } catch (error) {
      console.warn('Error creating notification sound:', error);
    }
  }

  /**
   * Play incoming call notification sound
   * Loops until stopped
   */
  playCallSound() {
    if (!this.enabled) return;

    try {
      // Stop any existing call sound
      this.stopCallSound();

      // Create new audio instance for call
      const { getSoundPath } = require('./assetHelper');
      this.callAudio = new Audio(getSoundPath('aramasesi.mp3'));
      this.callAudio.volume = this.volume;
      this.callAudio.loop = true; // Loop the call sound
      
      // Play the sound
      this.callAudio.play().catch(error => {
        console.warn('Failed to play call sound:', error);
      });
    } catch (error) {
      console.warn('Error creating call sound:', error);
    }
  }

  /**
   * Stop the incoming call sound
   */
  stopCallSound() {
    if (this.callAudio) {
      this.callAudio.pause();
      this.callAudio.currentTime = 0;
      this.callAudio = null;
    }
  }

  /**
   * Enable notification sounds
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable notification sounds
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled() {
    return this.enabled;
  }
}

// Create singleton instance
const notificationSound = new NotificationSoundService();

export default notificationSound;
