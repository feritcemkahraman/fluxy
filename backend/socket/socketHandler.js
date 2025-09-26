const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Server = require('../models/Server');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const VoiceChannelManager = require('../managers/VoiceChannelManager');
const cacheManager = require('../utils/cache');

// Store connected users
const connectedUsers = new Map();

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
        } else {
        }
      } catch (error) {
        console.error('Join server error:', error);
      }
    });

    // Handle leaving a server
    socket.on('leaveServer', (serverId) => {
      socket.leave(`server_${serverId}`);
    });

    // Handle joining a voice channel - SIMPLE
    socket.on('join-voice-channel', async (data) => {
      try {
        const { channelId } = data;
        console.log(`🎤 User ${socket.user?.username} joining voice channel: ${channelId}`);
        
        const result = VoiceChannelManager.joinChannel(channelId, socket.userId);
        
        // Join socket room
        socket.join(`voice:${channelId}`);
        
        // Notify others in the channel
        socket.to(`voice:${channelId}`).emit('voiceChannelUpdate', {
          channelId,
          users: result.users,
          action: 'join',
          userId: socket.userId
        });
        
        // Send success response
        socket.emit('voiceChannelUpdate', {
          channelId,
          users: result.users,
          action: 'join',
          userId: socket.userId
        });
        
      } catch (error) {
        console.error('Voice join error:', error);
        socket.emit('error', { message: 'Failed to join voice channel' });
      }
    });

    // Handle leaving a voice channel - SIMPLE
    socket.on('leave-voice-channel', async (data) => {
      try {
        const { channelId } = data;
        console.log(`🚪 User ${socket.user?.username} leaving voice channel: ${channelId}`);
        
        const result = VoiceChannelManager.leaveChannel(channelId, socket.userId);
        
        // Leave socket room
        socket.leave(`voice:${channelId}`);
        
        // Notify others in the channel
        socket.to(`voice:${channelId}`).emit('voiceChannelUpdate', {
          channelId,
          users: result.users,
          action: 'leave',
          userId: socket.userId
        });
        
        // Send success response
        socket.emit('voiceChannelUpdate', {
          channelId,
          users: result.users,
          action: 'leave',
          userId: socket.userId
        });
        
      } catch (error) {
        console.error('Voice leave error:', error);
      }
    });

    // Message handling

    // Screen sharing signaling
    socket.on('screen-signal', (data) => {
      const { signal, targetUserId, channelId, fromUserId } = data;
      
      // Forward signal to target user
      const targetConnection = connectedUsers.get(targetUserId);
      if (targetConnection) {
        const targetSocket = io.sockets.sockets.get(targetConnection.socketId);
        if (targetSocket) {
          targetSocket.emit('screen-signal', {
            signal,
            userId: fromUserId,
            channelId
          });
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

    // Handle disconnect - SIMPLE
    socket.on('disconnect', async () => {
      // Remove from connected users
      connectedUsers.delete(socket.userId);

      // Clean up voice channels
      const allChannels = VoiceChannelManager.getAllChannels();
      for (const [channelId, users] of Object.entries(allChannels)) {
        if (users.includes(socket.userId)) {
          const result = VoiceChannelManager.leaveChannel(channelId, socket.userId);
          
          // Notify others in the channel
          socket.to(`voice:${channelId}`).emit('voiceChannelUpdate', {
            channelId,
            users: result.users,
            action: 'leave',
            userId: socket.userId
          });
        }
      }

      // Broadcast offline status
      try {
        const userServers = await Server.find({
          'members.user': socket.userId
        });

        userServers.forEach(server => {
          socket.to(`server_${server._id}`).emit('userStatusUpdate', {
            userId: String(socket.userId),
            status: 'offline',
            username: socket.user.username
          });
        });
      } catch (error) {
        console.error('❌ Disconnect cleanup error:', error);
      }
    });
  });
};

module.exports = { handleConnection, connectedUsers };
