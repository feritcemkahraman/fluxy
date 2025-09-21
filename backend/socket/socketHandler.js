const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Server = require('../models/Server');
const Channel = require('../models/Channel');
const Message = require('../models/Message');

// Store connected users
const connectedUsers = new Map();
// Store voice channel users
const voiceChannels = new Map(); // channelId -> Set of userIds

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    console.log('❌ Socket authentication failed:', error.message);

    // Log more details about the error
    if (error.name === 'JsonWebTokenError') {
      console.log('❌ JWT Token Error - Invalid token');
      console.log('❌ Token might be malformed or from different secret');
    } else if (error.name === 'TokenExpiredError') {
      console.log('❌ JWT Token Error - Token expired');
      console.log('❌ Token expired at:', error.expiredAt);
    } else if (error.name === 'NotBeforeError') {
      console.log('❌ JWT Token Error - Token not active yet');
    }

    next(new Error('Authentication failed'));
  }
};

const handleConnection = (io) => {
  io.use(socketAuth);

  io.on('connection', async (socket) => {
    // Emit authentication success to frontend with connection data
    socket.emit('authenticated', {
      connectionId: socket.id,
      user: {
        id: socket.user._id,
        username: socket.user.username,
        status: socket.user.status
      }
    });
    
    // Check if user already has an active connection
    const existingConnection = connectedUsers.get(socket.userId);
    if (existingConnection) {
      console.log(`User ${socket.user.username} already has an active connection. Disconnecting old connection.`);
      
      // Disconnect the old socket
      const oldSocket = io.sockets.sockets.get(existingConnection.socketId);
      if (oldSocket) {
        oldSocket.disconnect(true);
      }
    }

    // Store connected user - keep existing status if already connected
    const currentStatus = existingConnection ? existingConnection.status : socket.user.status || 'online';
    
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
      status: currentStatus
    });

    // Update user status to online only if they were offline
    if (socket.user.status === 'offline') {
      await User.findByIdAndUpdate(socket.userId, { 
        status: 'online',
        lastSeen: new Date()
      });
    }

    // Join user to their server rooms
    const userServers = await Server.find({
      'members.user': socket.userId
    });

    // Join user to their personal room for friend notifications
    socket.join(`user_${socket.userId}`);

    userServers.forEach(server => {
      socket.join(`server_${server._id}`);
      console.log(`✅ User ${socket.user.username} joined server room: server_${server._id}`);
    });

    // Broadcast user current status to all servers
    userServers.forEach(server => {
      socket.to(`server_${server._id}`).emit('userStatusUpdate', {
        userId: String(socket.userId), // Ensure it's a string
        status: socket.user.status, // Use actual user status, not hardcoded 'online'
        username: socket.user.username
      });
    });

    // Handle joining a server
    socket.on('joinServer', async (serverId) => {
      try {
        const server = await Server.findById(serverId);
        if (server && server.members.some(member => 
          member.user.toString() === socket.userId
        )) {
          socket.join(`server_${serverId}`);
          console.log(`✅ User ${socket.user.username} manually joined server room: server_${serverId}`);
          console.log(`👥 Server room members count: ${io.sockets.adapter.rooms.get(`server_${serverId}`)?.size || 0}`);
        } else {
          console.log(`❌ User ${socket.user.username} not authorized for server: ${serverId}`);
        }
      } catch (error) {
        console.error('Join server error:', error);
      }
    });

    // Handle leaving a server
    socket.on('leaveServer', (serverId) => {
      socket.leave(`server_${serverId}`);
      console.log(`User ${socket.user.username} left server: ${serverId}`);
    });

    // Handle joining a voice channel
    socket.on('joinVoiceChannel', async (data) => {
      try {
        const { channelId } = data;
        const channel = await Channel.findById(channelId);
        
        if (channel && channel.type === 'voice') {
          // Check if already in this voice channel
          if (socket.currentVoiceChannel === channelId) {
            console.log(`⚠️ User ${socket.user.username} already in voice channel: ${channelId}`);
            return; // Don't rejoin the same channel
          }

          // Leave previous voice channel if any (only if different)
          if (socket.currentVoiceChannel && socket.currentVoiceChannel !== channelId) {
            console.log(`🔄 User ${socket.user.username} leaving previous voice channel: ${socket.currentVoiceChannel}`);
            
            const previousChannelId = socket.currentVoiceChannel;
            socket.leave(`voice:${previousChannelId}`);
            
            // Remove from previous channel's database
            await Channel.findByIdAndUpdate(previousChannelId, {
              $pull: {
                connectedUsers: { user: socket.userId }
              }
            });
            
            // Notify others in previous voice channel
            socket.to(`voice:${previousChannelId}`).emit('userLeftVoice', {
              userId: socket.userId,
              username: socket.user.username
            });
            
            // Note: voiceChannelUpdate removed - using voiceChannelSync instead
          }

          // Join new voice channel
          socket.join(`voice:${channelId}`);
          // Also ensure user is in the server room to receive voice updates
          socket.join(`server_${channel.server}`);
          socket.currentVoiceChannel = channelId;

          // Add user to channel's connected users - first remove if exists, then add
          console.log(`💾 Adding user ${socket.user.username} to channel ${channelId} in database`);
          
          // First remove user if already exists to prevent duplicates
          await Channel.findByIdAndUpdate(channelId, {
            $pull: {
              connectedUsers: { user: socket.userId }
            }
          });
          
          // Then add user
          await Channel.findByIdAndUpdate(channelId, {
            $push: {
              connectedUsers: {
                user: socket.userId,
                joinedAt: new Date(),
                isMuted: false,
                isDeafened: false
              }
            }
          });

          // Check current connected users after update
          const updatedChannel = await Channel.findById(channelId).populate('connectedUsers.user', 'username');
          console.log(`👥 Current connected users in channel ${channelId}:`, 
            updatedChannel.connectedUsers.map(cu => cu.user?.username || cu.user).join(', ')
          );

          // Send current voice channel state to ALL users in the voice channel (including the joining user)
          const allConnectedUserIds = updatedChannel.connectedUsers.map(cu => {
            const userId = cu.user?._id?.toString() || cu.user?.id?.toString() || cu.user?.toString();
            console.log(`🔍 Connected user mapping - cu.user:`, cu.user, `→ userId:`, userId);
            return userId;
          }).filter((userId, index, array) => array.indexOf(userId) === index); // Remove duplicates
          
          // Send sync to ALL users in voice channel (including joining user)
          io.to(`voice:${channelId}`).emit('voiceChannelSync', {
            channelId,
            connectedUsers: allConnectedUserIds
          });
          console.log(`📤 Sent voice channel sync to ALL users in voice:${channelId}:`, allConnectedUserIds);

          // Also send to the joining user directly (in case they're not in the room yet)
          socket.emit('voiceChannelSync', {
            channelId,
            connectedUsers: allConnectedUserIds
          });
          console.log(`📤 Sent direct voice channel sync to ${socket.user.username}:`, allConnectedUserIds);

          // Notify others in voice channel (legacy event for compatibility)
          socket.to(`voice:${channelId}`).emit('userJoinedVoice', {
            userId: socket.userId,
            username: socket.user.username,
            avatar: socket.user.avatar
          });

          // Note: No longer sending voiceChannelUpdate since voiceChannelSync provides complete state

          console.log(`✅ User ${socket.user.username} joined voice channel: ${channelId}`);
        }
      } catch (error) {
        console.error('Join voice channel error:', error);
      }
    });

    // Handle leaving a voice channel
    socket.on('leaveVoiceChannel', async () => {
      if (socket.currentVoiceChannel) {
        const channelId = socket.currentVoiceChannel;
        
        try {
          // Remove user from channel's connected users
          await Channel.findByIdAndUpdate(channelId, {
            $pull: {
              connectedUsers: { user: socket.userId }
            }
          });

          // Get updated channel with remaining users
          const updatedChannel = await Channel.findById(channelId).populate('connectedUsers.user', 'username');
          console.log(`👥 Remaining users in channel ${channelId}:`, 
            updatedChannel.connectedUsers.map(cu => cu.user?.username || cu.user).join(', ')
          );

          // Send updated voice channel state to ALL users in the voice channel
          const allConnectedUserIds = updatedChannel.connectedUsers.map(cu => {
            const userId = cu.user?._id?.toString() || cu.user?.id?.toString() || cu.user?.toString();
            return userId;
          }).filter((userId, index, array) => array.indexOf(userId) === index); // Remove duplicates
          
          // Send sync to ALL users still in voice channel
          io.to(`voice:${channelId}`).emit('voiceChannelSync', {
            channelId,
            connectedUsers: allConnectedUserIds
          });
          console.log(`📤 Sent voice channel sync after user left to voice:${channelId}:`, allConnectedUserIds);

          // Notify others in voice channel (legacy event for compatibility)
          socket.to(`voice:${channelId}`).emit('userLeftVoice', {
            userId: socket.userId,
            username: socket.user.username
          });

          console.log(`✅ User ${socket.user.username} left voice channel: ${channelId}`);

          socket.leave(`voice:${channelId}`);
          socket.currentVoiceChannel = null;

          console.log(`User ${socket.user.username} left voice channel: ${channelId}`);
        } catch (error) {
          console.error('Leave voice channel error:', error);
        }
      }
    });

    // Handle sending a message
    socket.on('sendMessage', async (data) => {
      try {
        const { content, channelId, replyTo } = data;

        // Validate channel access
        const channel = await Channel.findById(channelId);
        if (!channel) {
          socket.emit('error', { message: 'Channel not found' });
          return;
        }

        const server = await Server.findById(channel.server);
        const isMember = server.members.some(member => 
          member.user.toString() === socket.userId
        );

        if (!isMember) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Create message
        const message = new Message({
          content,
          author: socket.userId,
          channel: channelId,
          server: channel.server,
          replyTo: replyTo || null
        });

        await message.save();

        // Update channel's last message
        await Channel.findByIdAndUpdate(channelId, {
          lastMessage: message._id,
          $inc: { messageCount: 1 }
        });

        // Populate message for broadcast
        const populatedMessage = await Message.findById(message._id)
          .populate('author', 'username displayName avatar discriminator status')
          .populate('replyTo', 'content author');

        // Broadcast to all server members
        io.to(`server_${channel.server}`).emit('newMessage', {
          _id: populatedMessage._id,
          content: populatedMessage.content,
          author: {
            _id: populatedMessage.author._id,
            id: populatedMessage.author._id,
            username: populatedMessage.author.username,
            displayName: populatedMessage.author.displayName || populatedMessage.author.username || 'Anonymous',
            avatar: populatedMessage.author.avatar,
            discriminator: populatedMessage.author.discriminator,
            status: populatedMessage.author.status
          },
          channel: populatedMessage.channel,
          server: populatedMessage.server,
          replyTo: populatedMessage.replyTo,
          reactions: populatedMessage.reactions,
          createdAt: populatedMessage.createdAt
        });

      } catch (error) {
        console.error('❌ Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle user status updates
    socket.on('updateUserStatus', async (data) => {
      try {
        const { status } = data;

        // Update user status in database
        await User.findByIdAndUpdate(socket.userId, { 
          status,
          lastSeen: new Date()
        });

        // Update connected users map
        const connectedUser = connectedUsers.get(socket.userId);
        if (connectedUser) {
          connectedUser.status = status;
          connectedUsers.set(socket.userId, connectedUser);
        }

        // Note: Broadcast is handled by HTTP API in profile.js to avoid duplication

      } catch (error) {
        console.error('❌ Update user status error:', error);
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      const { channelId, isTyping } = data;
      socket.to(`server_${data.serverId || 'unknown'}`).emit('userTyping', {
        userId: socket.userId,
        username: socket.user.username,
        channelId,
        isTyping
      });
    });

    // Handle message reactions
    socket.on('addReaction', async (data) => {
      try {
        const { messageId, emoji } = data;
        
        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Find or create reaction
        let reaction = message.reactions.find(r => r.emoji === emoji);
        
        if (reaction) {
          const userIndex = reaction.users.indexOf(socket.userId);
          if (userIndex > -1) {
            reaction.users.splice(userIndex, 1);
            if (reaction.users.length === 0) {
              message.reactions = message.reactions.filter(r => r.emoji !== emoji);
            }
          } else {
            reaction.users.push(socket.userId);
          }
        } else {
          message.reactions.push({
            emoji,
            users: [socket.userId]
          });
        }

        await message.save();

        // Broadcast reaction update
        io.to(`server_${message.server}`).emit('reactionUpdate', {
          messageId,
          reactions: message.reactions
        });

      } catch (error) {
        console.error('Add reaction error:', error);
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      // Remove from connected users but keep status for potential reconnect
      connectedUsers.delete(socket.userId);

      // Leave voice channel if connected
      if (socket.currentVoiceChannel) {
        // Leave voice channel  
        const channel = await Channel.findByIdAndUpdate(socket.currentVoiceChannel, {
          $pull: { connectedUsers: { user: socket.userId } }
        });

        if (channel) {
          socket.to(`voice:${socket.currentVoiceChannel}`).emit('userLeftVoice', {
            userId: socket.userId,
            username: socket.user.username
          });

          // Note: voiceChannelUpdate removed - using voiceChannelSync instead
        }
      }

      // Broadcast offline status but DON'T update database
      // Keep the user's status in DB as it was
      const userServers = await Server.find({
        'members.user': socket.userId
      });

      userServers.forEach(server => {
        socket.to(`server_${server._id}`).emit('userStatusUpdate', {
          userId: String(socket.userId), // Ensure it's a string
          status: 'offline',
          username: socket.user.username
        });
      });
    });
  });
};

module.exports = { handleConnection, connectedUsers };
