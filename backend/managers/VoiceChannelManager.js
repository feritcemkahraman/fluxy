// Optimized Voice Channel Manager
const mongoose = require('mongoose');
const Channel = require('../models/Channel');
const VoiceUtils = require('../utils/voiceUtils');
const logger = require('../utils/logger');

class VoiceChannelManager {
  constructor(io) {
    this.io = io;
    this.syncQueue = new Map(); // channelId -> timeout
    this.disconnectQueue = new Map(); // userId -> timeout for delayed cleanup
    this.DEBOUNCE_MS = 100; // Configurable debounce time
    this.DISCONNECT_DELAY_MS = 30000; // 30 seconds delay before cleanup
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

      // Check for reconnection scenario (user has pending cleanup)
      const wasReconnection = await this.handleReconnection(socket, channelId);
      if (wasReconnection) {
        return; // Reconnection handled, no need to proceed with full join
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
      const connectedUserIds = VoiceUtils.extractUserIds(updatedChannel.connectedUsers);

      // Debounced sync to prevent spam
      this.debouncedSync(channelId, connectedUserIds, channel.server);

      logger.voice('JOIN', username, channelId, connectedUserIds);

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
        const channel = await Channel.findById(channelId).populate('connectedUsers.user', 'username');
        const connectedUserIds = VoiceUtils.extractUserIds(channel.connectedUsers);

        // Debounced sync
        this.debouncedSync(channelId, connectedUserIds, channel.server);

        logger.voice('LEAVE', username, channelId, connectedUserIds);
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
    if (operation === 'join') {
      // Use session for transaction-like behavior
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // First, remove any existing entries for this user
          await Channel.findByIdAndUpdate(
            channelId,
            {
              $pull: { connectedUsers: { user: userId } }
            },
            { session }
          );

          // Then add the user
          await Channel.findByIdAndUpdate(
            channelId,
            {
              $push: { 
                connectedUsers: VoiceUtils.createConnectedUserObject(userId)
              }
            },
            { session }
          );
        });
      } finally {
        await session.endSession();
      }
    } else if (operation === 'leave') {
      await Channel.findByIdAndUpdate(channelId, {
        $pull: { connectedUsers: { user: userId } }
      });
    }
  }

  /**
   * Clean up when socket disconnects
   * @param {Object} socket - Socket instance
   */
  async handleDisconnect(socket) {
    if (socket.currentVoiceChannel) {
      const userId = socket.userId;
      const username = socket.user.username;
      const channelId = socket.currentVoiceChannel;

      // Cancel any existing reconnect grace period for this user
      if (this.disconnectQueue.has(userId)) {
        clearTimeout(this.disconnectQueue.get(userId));
      }

      // Set a delayed cleanup - user has 30 seconds to reconnect
      const cleanupTimeout = setTimeout(async () => {
        try {
          // Check if user has reconnected by checking if they're in any socket rooms
          const socketsInRoom = await this.io.in(VoiceUtils.createVoiceRoomName(channelId)).fetchSockets();
          const userStillConnected = socketsInRoom.some(s => s.userId === userId);

          if (!userStillConnected) {
            // User hasn't reconnected, proceed with cleanup
            logger.voice('DISCONNECT_CLEANUP', username, channelId, []);
            await this.cleanupUserFromChannel(userId, channelId);
          } else {
            logger.voice('DISCONNECT_CANCELLED', username, channelId, ['User reconnected']);
          }
        } catch (error) {
          logger.error('Disconnect cleanup error:', error);
        } finally {
          this.disconnectQueue.delete(userId);
        }
      }, this.DISCONNECT_DELAY_MS);

      this.disconnectQueue.set(userId, cleanupTimeout);
      logger.voice('DISCONNECT_QUEUED', username, channelId, [`Cleanup in ${this.DISCONNECT_DELAY_MS/1000}s`]);
    }

    // Clear any pending sync operations for this user
    // Note: We keep channel-based debouncing as it's more efficient
  }

  /**
   * Clean up user from voice channel (delayed cleanup)
   * @param {string} userId - User ID
   * @param {string} channelId - Channel ID
   */
  async cleanupUserFromChannel(userId, channelId) {
    try {
      // Remove from database
      await Channel.findByIdAndUpdate(channelId, {
        $pull: { connectedUsers: { user: userId } }
      });

      // Get updated channel info and sync
      const channel = await Channel.findById(channelId).populate('connectedUsers.user', 'username');
      if (channel) {
        const connectedUserIds = VoiceUtils.extractUserIds(channel.connectedUsers);
        this.debouncedSync(channelId, connectedUserIds, channel.server);
      }
    } catch (error) {
      logger.error('User cleanup error:', error);
    }
  }

  /**
   * Handle user reconnection - cancel delayed cleanup
   * @param {Object} socket - Socket instance
   * @param {string} channelId - Channel ID to rejoin
   */
  async handleReconnection(socket, channelId) {
    const userId = socket.userId;
    
    // Cancel delayed cleanup if user is reconnecting
    if (this.disconnectQueue.has(userId)) {
      clearTimeout(this.disconnectQueue.get(userId));
      this.disconnectQueue.delete(userId);
      
      // Update socket state for rejoining
      socket.join(VoiceUtils.createVoiceRoomName(channelId));
      const channel = await Channel.findById(channelId);
      if (channel) {
        socket.join(VoiceUtils.createServerRoomName(channel.server));
        socket.currentVoiceChannel = channelId;
        
        logger.voice('RECONNECTED', socket.user.username, channelId, ['Grace period cancelled']);
        
        // Sync current state to make sure UI is updated
        const connectedUserIds = VoiceUtils.extractUserIds(channel.connectedUsers);
        this.debouncedSync(channelId, connectedUserIds, channel.server);
      }
      
      return true; // Indicate successful reconnection
    }
    
    return false; // No pending cleanup, proceed with normal join
  }
}

module.exports = VoiceChannelManager;