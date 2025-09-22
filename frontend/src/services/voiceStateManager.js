// Frontend Voice State Manager - Optimized
class VoiceStateManager {
  constructor() {
    this.channelUsers = new Map();
    this.updateQueue = new Map();
    this.subscribers = new Set();
    this.DEBOUNCE_MS = 50; // Faster debounce for UI responsiveness
  }

  /**
   * Update channel users with debouncing to prevent excessive re-renders
   * @param {string} channelId - Channel ID
   * @param {Array} users - Array of user IDs
   */
  updateChannel(channelId, users) {
    // Prevent unnecessary updates
    const currentUsers = this.channelUsers.get(channelId) || [];
    if (this.arraysEqual(currentUsers, users)) {
      console.log('🔄 Voice state unchanged, skipping update');
      return;
    }

    // Clear existing timeout for this channel
    if (this.updateQueue.has(channelId)) {
      clearTimeout(this.updateQueue.get(channelId));
    }

    // Set debounced update
    const timeout = setTimeout(() => {
      this.channelUsers.set(channelId, [...users]); // Clone array
      this.notifySubscribers();
      this.updateQueue.delete(channelId);
      
      console.log(`🔄 Voice state updated for channel ${channelId}:`, users);
    }, this.DEBOUNCE_MS);

    this.updateQueue.set(channelId, timeout);
  }

  /**
   * Remove channel from state
   * @param {string} channelId - Channel ID to remove
   */
  removeChannel(channelId) {
    if (this.channelUsers.has(channelId)) {
      this.channelUsers.delete(channelId);
      this.notifySubscribers();
      console.log(`🗑️ Removed channel ${channelId} from voice state`);
    }
  }

  /**
   * Compare arrays for equality
   * @param {Array} a - First array
   * @param {Array} b - Second array
   * @returns {boolean} Are arrays equal
   */
  arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, i) => val === sortedB[i]);
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    // Return unsubscribe function
    return () => this.subscribers.delete(callback);
  }

  /**
   * Notify all subscribers of state change
   */
  notifySubscribers() {
    const state = Object.fromEntries(this.channelUsers);
    this.subscribers.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Voice state subscriber error:', error);
      }
    });
  }

  /**
   * Get users for specific channel
   * @param {string} channelId - Channel ID
   * @returns {Array} Array of user IDs
   */
  getChannelUsers(channelId) {
    return this.channelUsers.get(channelId) || [];
  }

  /**
   * Get all channels state
   * @returns {Object} All channels with their users
   */
  getAllChannels() {
    return Object.fromEntries(this.channelUsers);
  }

  /**
   * Clear all state (useful for logout/reset)
   */
  clear() {
    this.channelUsers.clear();
    this.updateQueue.forEach(timeout => clearTimeout(timeout));
    this.updateQueue.clear();
    this.notifySubscribers();
    console.log('🧹 Voice state cleared');
  }

  /**
   * Get statistics for debugging
   */
  getStats() {
    return {
      totalChannels: this.channelUsers.size,
      totalSubscribers: this.subscribers.size,
      pendingUpdates: this.updateQueue.size,
      channels: Object.fromEntries(
        Array.from(this.channelUsers.entries()).map(([id, users]) => [
          id, { userCount: users.length, users }
        ])
      )
    };
  }
}

// Create singleton instance
const voiceStateManager = new VoiceStateManager();

export { VoiceStateManager, voiceStateManager };