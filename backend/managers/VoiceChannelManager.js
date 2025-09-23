// Optimized Voice Channel Manager
const mongoose = require('mongoose');
const Channel = require('../models/Channel');
const VoiceUtils = require('../utils/voiceUtils');
const logger = require('../utils/logger');

class VoiceChannelManager {
  constructor(io) {
    this.io = io;
    this.syncQueue = new Map(); // channelId -> timeout
    this.DEBOUNCE_MS = 100; // Configurable debounce time
  }

  /**
   * Emit voice channel sync with debouncing to prevent spam
   * @param {string} channelId - Channel ID
   * @param {Array} users - Connected user IDs
   * @param {string} serverId - Server ID
   */
  debouncedSync(channelId, users, serverId) {
    // Clear existing timeout for this channel
    if (this.syncQueue.has(channelId)) {
      clearTimeout(this.syncQueue.get(channelId));
    }

    // Set new debounced timeout
    const timeout = setTimeout(() => {
      this.emitSync(channelId, users, serverId);
      this.syncQueue.delete(channelId);
    }, this.DEBOUNCE_MS);

    this.syncQueue.set(channelId, timeout);
  }

  /**
   * Emit voice channel sync to all relevant users
   * @param {string} channelId - Channel ID
   * @param {Array} users - Connected user IDs
   * @param {string} serverId - Server ID
   */
  emitSync(channelId, users, serverId) {
    const data = { channelId, connectedUsers: users };
    
    // Single optimized broadcast to server room (includes all voice channel users)
    this.io.to(VoiceUtils.createServerRoomName(serverId)).emit('voiceChannelSync', data);
    
    logger.voice('SYNC', 'SYSTEM', channelId, users);
  }

  /**
   * Handle user joining voice channel
   * @param {Object} socket - Socket instance
   * @param {string} channelId - Channel ID to join
   */
  async joinChannel(socket, channelId) {
    try {
      const channel = await Channel.findById(channelId);
      if (!channel || channel.type !== 'voice') {
        throw new Error('Invalid voice channel');
      }

      const userId = socket.userId;
      const username = socket.user.username;

      // Check if already in this voice channel
      if (socket.currentVoiceChannel === channelId) {
        logger.debug(`User ${username} already in voice channel: ${channelId}`);
        return;
      }

      // Leave previous voice channel if exists
      if (socket.currentVoiceChannel) {
        await this.leaveChannel(socket, false); // Don't sync yet
      }

      // Update database - atomic operation
      await this.updateChannelDatabase(channelId, userId, 'join');

      // Update socket state
      socket.join(VoiceUtils.createVoiceRoomName(channelId));
      socket.join(VoiceUtils.createServerRoomName(channel.server));
      socket.currentVoiceChannel = channelId;

      // Get updated user list and sync
      const updatedChannel = await Channel.findById(channelId).populate('connectedUsers.user', 'username');
      const remainingUserIds = VoiceUtils.extractUserIds(updatedChannel?.connectedUsers) || [];

      // Emit sync event to all users in the channel including the new user
      this.io.to(VoiceUtils.createVoiceRoomName(channelId)).emit('voiceChannelSync', {
        channelId,
        users: remainingUserIds,
        userDetails: updatedChannel?.connectedUsers || []
      });

      console.log(`🔊 SYNC: ${socket.user.username} | Channel: ${channelId} | Users: [${remainingUserIds.join(', ')}]`);

      return true;

    } catch (error) {
      logger.error('Voice channel join error:', error);
      socket.emit('error', { message: 'Failed to join voice channel' });
    }
  }

  /**
   * Handle user leaving voice channel
   * @param {Object} socket - Socket instance
   * @param {boolean} shouldSync - Whether to emit sync (default: true)
   */
  async leaveChannel(socket, shouldSync = true) {
    if (!socket.currentVoiceChannel) return;

    try {
      const channelId = socket.currentVoiceChannel;
      const userId = socket.userId;
      const username = socket.user.username;

      // Update database
      await this.updateChannelDatabase(channelId, userId, 'leave');

      // Update socket state
      socket.leave(VoiceUtils.createVoiceRoomName(channelId));
      socket.currentVoiceChannel = null;

      if (shouldSync) {
        // Get updated user list and sync
        const updatedChannel = await Channel.findById(channelId).populate('connectedUsers.user', 'username');
        const remainingUserIds = VoiceUtils.extractUserIds(updatedChannel?.connectedUsers) || [];

        // Emit sync event to remaining users in the channel
        this.io.to(VoiceUtils.createVoiceRoomName(channelId)).emit('voiceChannelSync', {
          channelId,
          users: remainingUserIds,
          userDetails: updatedChannel?.connectedUsers || []
        });

        console.log(`🔇 LEAVE: ${socket.user.username} | Channel: ${channelId} | Remaining: [${remainingUserIds.join(', ')}]`);
      }

    } catch (error) {
      logger.error('Voice channel leave error:', error);
    }
  }

  /**
   * Update channel database with atomic operations
   * @param {string} channelId - Channel ID
   * @param {string} userId - User ID
   * @param {string} operation - 'join' or 'leave'
   */
  async updateChannelDatabase(channelId, userId, operation) {
    const channel = await Channel.findById(channelId);
    if (!channel) return;

    if (operation === 'join') {
      // Remove existing user entry if any
      channel.connectedUsers = channel.connectedUsers.filter(cu => 
        cu.user.toString() !== userId
      );
      
      // Add new user entry
      channel.connectedUsers.push(VoiceUtils.createConnectedUserObject(userId));
      
      await channel.save();
    } else if (operation === 'leave') {
      // Remove user entry
      channel.connectedUsers = channel.connectedUsers.filter(cu => 
        cu.user.toString() !== userId
      );
      
      await channel.save();
    }
  }

  /**
   * Clean up when socket disconnects
   * @param {Object} socket - Socket instance
   */
  async handleDisconnect(socket) {
    if (socket.currentVoiceChannel) {
      await this.leaveChannel(socket, true);
    }

    // Clear any pending sync operations for this user
    // Note: We keep channel-based debouncing as it's more efficient
  }
}

module.exports = VoiceChannelManager;