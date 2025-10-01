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
    console.log('🔊 playMessageSound called:', {
      enabled: this.enabled,
      conversationId,
      activeConversationId: this.activeConversationId,
      shouldPlay: conversationId !== this.activeConversationId
    });

    if (!this.enabled) {
      console.log('🔇 Sound disabled');
      return;
    }

    // Don't play sound if the message is from the currently active conversation
    if (conversationId && this.activeConversationId === conversationId) {
      console.log('🔇 Same conversation, not playing sound');
      return;
    }

    try {
      // Create new audio instance each time to allow multiple plays
      const audio = new Audio('/sounds/mesajses.mp3');
      audio.volume = this.volume;
      
      console.log('🔊 Playing sound...');
      // Play the sound
      audio.play().then(() => {
        console.log('✅ Sound played successfully');
      }).catch(error => {
        console.warn('❌ Failed to play notification sound:', error);
      });
    } catch (error) {
      console.warn('❌ Error creating notification sound:', error);
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
