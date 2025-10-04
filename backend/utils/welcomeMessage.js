const Message = require('../models/Message');
const Channel = require('../models/Channel');

/**
 * Discord-style welcome message utility
 * Sends welcome message when user joins a server
 * 
 * @param {Object} params
 * @param {Object} params.user - User object
 * @param {Object} params.server - Server object
 * @param {Object} params.io - Socket.IO instance
 * @returns {Promise<Object>} Created message or null
 */
async function sendWelcomeMessage({ user, server, io }) {
  try {
    // Find first text channel
    const firstTextChannel = await Channel.findOne({
      server: server._id,
      type: 'text'
    }).sort({ createdAt: 1 });

    if (!firstTextChannel) {
      console.log('⚠️ No text channel found for welcome message');
      return null;
    }

    console.log('🔍 First text channel found:', firstTextChannel._id);

    // Create welcome message
    const welcomeMessage = new Message({
      content: `🎉 **${user.displayName || user.username}** sunucuya katıldı! Hoş geldin!`,
      author: user._id,
      channel: firstTextChannel._id,
      server: server._id,
      type: 'system',
      isSystemMessage: true,
      systemMessageType: 'member_join'
    });

    await welcomeMessage.save();
    console.log('✅ Welcome message saved:', welcomeMessage._id);

    // Update channel's last message
    await Channel.findByIdAndUpdate(firstTextChannel._id, {
      lastMessage: welcomeMessage._id,
      $inc: { messageCount: 1 }
    });

    // Populate message for broadcast
    const populatedMessage = await Message.findById(welcomeMessage._id)
      .populate('author', 'username displayName avatar discriminator status');

    const messageData = {
      _id: populatedMessage._id,
      content: populatedMessage.content,
      author: {
        _id: populatedMessage.author._id,
        id: populatedMessage.author._id,
        username: populatedMessage.author.username,
        displayName: populatedMessage.author.displayName || populatedMessage.author.username,
        avatar: populatedMessage.author.avatar,
        discriminator: populatedMessage.author.discriminator,
        status: populatedMessage.author.status
      },
      channel: populatedMessage.channel,
      server: populatedMessage.server,
      type: populatedMessage.type,
      isSystemMessage: populatedMessage.isSystemMessage,
      systemMessageType: populatedMessage.systemMessageType,
      createdAt: populatedMessage.createdAt
    };

    // Broadcast to all server members EXCEPT the joining user
    // The joining user will load it from API to avoid duplicates
    if (io) {
      console.log('📡 Broadcasting welcome message to server room:', `server_${server._id}`);

      const userSockets = await io.in(`user_${user._id}`).fetchSockets();
      const userSocketIds = userSockets.map(s => s.id);

      console.log('👤 Joining user socket IDs:', userSocketIds);

      // Get all sockets in server room except user's sockets
      const serverRoom = io.sockets.adapter.rooms.get(`server_${server._id}`);
      console.log('🏠 Server room sockets:', serverRoom ? Array.from(serverRoom) : 'No room');

      if (serverRoom) {
        let broadcastCount = 0;
        serverRoom.forEach(socketId => {
          if (!userSocketIds.includes(socketId)) {
            io.to(socketId).emit('newMessage', messageData);
            broadcastCount++;
          } else {
            console.log('⏭️ Skipping socket (joining user):', socketId);
          }
        });
        console.log(`📤 Broadcasted to ${broadcastCount} sockets (excluding joining user)`);
      }
    }

    return populatedMessage;
  } catch (error) {
    console.error('❌ Welcome message error:', error);
    // Don't fail the join process if welcome message fails
    return null;
  }
}

module.exports = { sendWelcomeMessage };
