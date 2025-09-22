// Voice Channel Utility Functions
const VoiceUtils = {
  /**
   * Extract user IDs from connected users array
   * @param {Array} connectedUsers - Array of connected user objects
   * @returns {Array} Array of unique user ID strings
   */
  extractUserIds(connectedUsers) {
    if (!Array.isArray(connectedUsers)) return [];
    
    return connectedUsers
      .map(cu => {
        if (typeof cu === 'string') return cu;
        return cu.user?._id?.toString() || cu.user?.id?.toString() || cu.user?.toString();
      })
      .filter(Boolean)
      .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates
  },

  /**
   * Create voice room name with consistent format
   * @param {string} channelId - Channel ID
   * @returns {string} Voice room name
   */
  createVoiceRoomName(channelId) {
    return `voice:${channelId}`;
  },

  /**
   * Create server room name with consistent format
   * @param {string} serverId - Server ID
   * @returns {string} Server room name
   */
  createServerRoomName(serverId) {
    return `server_${serverId}`;
  },

  /**
   * Create connected user object for database
   * @param {string} userId - User ID
   * @returns {Object} Connected user object
   */
  createConnectedUserObject(userId) {
    return {
      user: userId,
      joinedAt: new Date(),
      isMuted: false,
      isDeafened: false
    };
  },

  /**
   * Log voice channel operation
   * @param {string} operation - Operation type
   * @param {string} username - Username
   * @param {string} channelId - Channel ID
   * @param {Array} users - Connected users
   */
  logVoiceOperation(operation, username, channelId, users = []) {
    console.log(`🔊 ${operation}: ${username} | Channel: ${channelId} | Users: [${users.join(', ')}]`);
  }
};

module.exports = VoiceUtils;