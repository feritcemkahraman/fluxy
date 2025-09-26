// Simple Voice Channel Manager
class VoiceChannelManager {
  constructor() {
    this.channels = new Map(); // channelId -> Set of userIds
  }

  // Join voice channel
  joinChannel(channelId, userId) {
    if (!this.channels.has(channelId)) {
      this.channels.set(channelId, new Set());
    }
    
    this.channels.get(channelId).add(userId);
    console.log(`User ${userId} joined voice channel ${channelId}`);
    
    return {
      success: true,
      users: Array.from(this.channels.get(channelId))
    };
  }

  // Leave voice channel
  leaveChannel(channelId, userId) {
    if (this.channels.has(channelId)) {
      this.channels.get(channelId).delete(userId);
      
      // Remove empty channels
      if (this.channels.get(channelId).size === 0) {
        this.channels.delete(channelId);
      }
    }
    
    console.log(`User ${userId} left voice channel ${channelId}`);
    
    return {
      success: true,
      users: this.channels.has(channelId) ? Array.from(this.channels.get(channelId)) : []
    };
  }

  // Get users in channel
  getChannelUsers(channelId) {
    return this.channels.has(channelId) ? Array.from(this.channels.get(channelId)) : [];
  }

  // Check if user is in channel
  isUserInChannel(channelId, userId) {
    return this.channels.has(channelId) && this.channels.get(channelId).has(userId);
  }

  // Get all channels
  getAllChannels() {
    const result = {};
    for (const [channelId, users] of this.channels) {
      result[channelId] = Array.from(users);
    }
    return result;
  }
}

module.exports = new VoiceChannelManager();
