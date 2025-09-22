// Optimized Voice Channel Management
class VoiceChannelManager {
  constructor(io) {
    this.io = io;
    this.activeChannels = new Map(); // channelId -> Set of userIds
    this.userToChannel = new Map(); // userId -> channelId
    this.syncQueue = new Map(); // channelId -> timeout
  }

  // Debounced sync to prevent spam
  debouncedSync(channelId, users, serverId) {
    // Clear existing timeout
    if (this.syncQueue.has(channelId)) {
      clearTimeout(this.syncQueue.get(channelId));
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.emitSync(channelId, users, serverId);
      this.syncQueue.delete(channelId);
    }, 100); // 100ms debounce

    this.syncQueue.set(channelId, timeout);
  }

  emitSync(channelId, users, serverId) {
    const data = { channelId, connectedUsers: users };
    
    // Single broadcast to server room (includes voice channel users)
    this.io.to(`server_${serverId}`).emit('voiceChannelSync', data);
    console.log(`📤 Optimized voice sync to server_${serverId}:`, users);
  }

  async joinChannel(socket, channelId) {
    const userId = socket.userId;
    
    // Leave previous channel first
    await this.leaveChannel(socket, false);
    
    // Update memory cache
    this.userToChannel.set(userId, channelId);
    if (!this.activeChannels.has(channelId)) {
      this.activeChannels.set(channelId, new Set());
    }
    this.activeChannels.get(channelId).add(userId);
    
    // Update database (batch operation)
    await this.updateChannelDB(channelId);
    
    // Socket room management
    socket.join(`voice:${channelId}`);
    socket.currentVoiceChannel = channelId;
    
    const channel = await Channel.findById(channelId);
    const users = Array.from(this.activeChannels.get(channelId));
    
    // Debounced sync
    this.debouncedSync(channelId, users, channel.server);
  }

  async leaveChannel(socket, shouldSync = true) {
    const userId = socket.userId;
    const channelId = this.userToChannel.get(userId);
    
    if (!channelId) return;
    
    // Update memory cache
    this.userToChannel.delete(userId);
    if (this.activeChannels.has(channelId)) {
      this.activeChannels.get(channelId).delete(userId);
      
      // Clean up empty channels
      if (this.activeChannels.get(channelId).size === 0) {
        this.activeChannels.delete(channelId);
      }
    }
    
    // Socket cleanup
    socket.leave(`voice:${channelId}`);
    socket.currentVoiceChannel = null;
    
    // Update database
    await this.updateChannelDB(channelId);
    
    if (shouldSync) {
      const channel = await Channel.findById(channelId);
      const users = this.activeChannels.get(channelId) ? 
        Array.from(this.activeChannels.get(channelId)) : [];
      
      this.debouncedSync(channelId, users, channel.server);
    }
  }

  async updateChannelDB(channelId) {
    const users = this.activeChannels.get(channelId);
    if (!users) {
      // Channel is empty, clear DB
      await Channel.findByIdAndUpdate(channelId, {
        $set: { connectedUsers: [] }
      });
      return;
    }

    // Batch update - replace entire array
    const connectedUsers = Array.from(users).map(userId => ({
      user: userId,
      joinedAt: new Date(),
      isMuted: false,
      isDeafened: false
    }));

    await Channel.findByIdAndUpdate(channelId, {
      $set: { connectedUsers }
    });
  }
}

module.exports = VoiceChannelManager;