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
    console.log('🔐 Socket authentication attempt...');
    console.log('🔍 Socket handshake headers:', Object.keys(socket.handshake.headers));
    console.log('🔍 Socket handshake auth:', socket.handshake.auth);

    const token = socket.handshake.auth.token;

    if (!token) {
      console.log('❌ No token provided in socket handshake');
      console.log('❌ Available auth keys:', Object.keys(socket.handshake.auth || {}));
      return next(new Error('No token provided'));
    }

    console.log('🔍 Token received (first 20 chars):', token.substring(0, 20) + '...');
    console.log('🔍 Verifying JWT token...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log('✅ JWT decoded successfully:', { userId: decoded.userId });
    console.log('👤 Looking up user:', decoded.userId);

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      console.log('❌ User not found in database:', decoded.userId);
      return next(new Error('User not found'));
    }

    console.log('✅ Socket authentication successful for user:', user.username);
    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    console.log('❌ Socket authentication failed:', error.message);
    console.log('❌ Error name:', error.name);
    console.log('❌ Error stack:', error.stack);

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
    console.log(`User ${socket.user.username} attempting to connect...`);
    
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

    console.log(`User ${socket.user.username} connected successfully`);
    console.log(`📊 User current status from DB: ${socket.user.status}`);
    console.log(`📊 Existing connection status: ${existingConnection?.status || 'none'}`);
    
    // Store connected user - keep existing status if already connected
    const currentStatus = existingConnection ? existingConnection.status : socket.user.status || 'online';
    console.log(`📊 Final status to use: ${currentStatus}`);
    
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
      status: currentStatus
    });

    // Update user status to online only if they were offline
    if (socket.user.status === 'offline') {
      console.log(`🔄 Updating user status from offline to online`);
      await User.findByIdAndUpdate(socket.userId, { 
        status: 'online',
        lastSeen: new Date()
      });
    } else {
      console.log(`✅ Keeping user status as: ${socket.user.status}`);
    }

    // Join user to their server rooms
    const userServers = await Server.find({
      'members.user': socket.userId
    });

    userServers.forEach(server => {
      socket.join(`server:${server._id}`);
      console.log(`User ${socket.user.username} joined server room: ${server._id}`);
    });

    // Broadcast user online status to all servers
    userServers.forEach(server => {
      socket.to(`server:${server._id}`).emit('userStatusUpdate', {
        userId: socket.userId,
        status: 'online',
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
          socket.join(`server:${serverId}`);
          console.log(`User ${socket.user.username} joined server: ${serverId}`);
        }
      } catch (error) {
        console.error('Join server error:', error);
      }
    });

    // Handle leaving a server
    socket.on('leaveServer', (serverId) => {
      socket.leave(`server:${serverId}`);
      console.log(`User ${socket.user.username} left server: ${serverId}`);
    });

    // Handle joining a voice channel
    socket.on('joinVoiceChannel', async (data) => {
      try {
        const { channelId } = data;
        const channel = await Channel.findById(channelId);
        
        if (channel && channel.type === 'voice') {
          // Leave previous voice channel if any
          if (socket.currentVoiceChannel) {
            socket.leave(`voice:${socket.currentVoiceChannel}`);
            socket.to(`voice:${socket.currentVoiceChannel}`).emit('userLeftVoice', {
              userId: socket.userId,
              username: socket.user.username
            });
          }

          // Join new voice channel
          socket.join(`voice:${channelId}`);
          socket.currentVoiceChannel = channelId;

          // Add user to channel's connected users
          await Channel.findByIdAndUpdate(channelId, {
            $addToSet: {
              connectedUsers: {
                user: socket.userId,
                joinedAt: new Date(),
                isMuted: false,
                isDeafened: false
              }
            }
          });

          // Notify others in voice channel
          socket.to(`voice:${channelId}`).emit('userJoinedVoice', {
            userId: socket.userId,
            username: socket.user.username,
            avatar: socket.user.avatar
          });

          // Notify server members
          socket.to(`server:${channel.server}`).emit('voiceChannelUpdate', {
            channelId,
            action: 'userJoined',
            userId: socket.userId
          });

          console.log(`User ${socket.user.username} joined voice channel: ${channelId}`);
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

          const channel = await Channel.findById(channelId);

          // Notify others in voice channel
          socket.to(`voice:${channelId}`).emit('userLeftVoice', {
            userId: socket.userId,
            username: socket.user.username
          });

          // Notify server members
          socket.to(`server:${channel.server}`).emit('voiceChannelUpdate', {
            channelId,
            action: 'userLeft',
            userId: socket.userId
          });

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
          .populate('author', 'username avatar discriminator')
          .populate('replyTo', 'content author');

        // Broadcast to all server members
        io.to(`server:${channel.server}`).emit('newMessage', {
          id: populatedMessage._id,
          content: populatedMessage.content,
          author: populatedMessage.author,
          channel: populatedMessage.channel,
          server: populatedMessage.server,
          replyTo: populatedMessage.replyTo,
          reactions: populatedMessage.reactions,
          createdAt: populatedMessage.createdAt
        });

        console.log(`Message sent by ${socket.user.username} in channel ${channelId}`);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle user status updates
    socket.on('updateUserStatus', async (data) => {
      try {
        const { status } = data;
        console.log('🔄 updateUserStatus received:', { userId: socket.userId, status });

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

        // Broadcast status update to all user's servers
        const userServers = await Server.find({
          'members.user': socket.userId
        });

        userServers.forEach(server => {
          socket.to(`server:${server._id}`).emit('userStatusUpdate', {
            userId: socket.userId,
            status,
            username: socket.user.username
          });
        });

        console.log(`✅ User ${socket.user.username} status updated to: ${status}`);

      } catch (error) {
        console.error('❌ Update user status error:', error);
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      const { channelId, isTyping } = data;
      socket.to(`server:${data.serverId || 'unknown'}`).emit('userTyping', {
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
        io.to(`server:${message.server}`).emit('reactionUpdate', {
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
      console.log(`User ${socket.user.username} disconnected`);
      console.log(`📊 Disconnect reason - keeping status: ${connectedUsers.get(socket.userId)?.status || 'unknown'}`);
      
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

          socket.to(`server:${channel.server}`).emit('voiceChannelUpdate', {
            channelId: socket.currentVoiceChannel,
            action: 'userLeft',
            userId: socket.userId
          });
        }
      }

      // Broadcast offline status but DON'T update database
      // Keep the user's status in DB as it was
      const userServers = await Server.find({
        'members.user': socket.userId
      });

      userServers.forEach(server => {
        socket.to(`server:${server._id}`).emit('userStatusUpdate', {
          userId: socket.userId,
          status: 'offline',
          username: socket.user.username
        });
      });
    });
  });
};

module.exports = { handleConnection, connectedUsers };
