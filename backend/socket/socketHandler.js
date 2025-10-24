const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Server = require('../models/Server');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const DirectMessage = require('../models/DirectMessage');
const VoiceChannelManager = require('../managers/VoiceChannelManager');
const cacheManager = require('../utils/cache');

// Store connected users
const connectedUsers = new Map();

// Helper: Parse mentions from message content (Discord-like)
const parseMentions = async (content, serverMembers) => {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  const matches = content.matchAll(mentionRegex);
  
  for (const match of matches) {
    const username = match[1];
    
    // Find user in server members
    const member = serverMembers.find(m => 
      m.user.username?.toLowerCase() === username.toLowerCase()
    );
    
    if (member) {
      mentions.push(member.user._id);
    }
  }
  
  return [...new Set(mentions)]; // Remove duplicates
};

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.log('❌ Socket auth failed: No token provided or invalid token format');
      return next(new Error('No token provided'));
    }

    // Validate JWT secret exists
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not configured in environment');
      return next(new Error('Server configuration error'));
    }

    const decoded = jwt.verify(token.trim(), process.env.JWT_SECRET);
    
    if (!decoded.userId) {
      console.log('❌ Socket auth failed: Token missing userId');
      return next(new Error('Invalid token payload'));
    }

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      console.log('❌ Socket auth failed: User not found for ID:', decoded.userId);
      return next(new Error('User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    
    console.log('✅ Socket authenticated for user:', user.username);
    next();
  } catch (error) {
    console.log('❌ Socket authentication failed:', error.message);

    // Enhanced error logging
    if (error.name === 'JsonWebTokenError') {
      console.log('❌ JWT Token Error - Invalid token format or signature');
      console.log('❌ This usually means token is malformed or using wrong secret');
    } else if (error.name === 'TokenExpiredError') {
      console.log('❌ JWT Token Error - Token expired at:', error.expiredAt);
      console.log('❌ Client needs to refresh token');
    } else if (error.name === 'NotBeforeError') {
      console.log('❌ JWT Token Error - Token not active until:', error.date);
    } else {
      console.log('❌ Unexpected auth error:', error);
    }

    next(new Error('Authentication failed'));
  }
};

const handleConnection = (io) => {
  console.log('🔌 Socket.IO handler initialized');
  
  io.use(socketAuth);

  io.on('connection', async (socket) => {
    console.log('🔗 New socket connection attempt:', socket.id);
    console.log('👤 User authenticated:', socket.user?.username);

    // Emit authentication success to frontend with connection data
    socket.emit('authenticated', {
      connectionId: socket.id,
      user: {
        id: socket.user._id,
        username: socket.user.username,
        status: socket.user.status
      }
    });
    
    console.log('✅ Socket connection established for user:', socket.user.username);
    
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

    // Handle joining a text channel
    socket.on('joinChannel', (channelId) => {
      socket.join(`channel_${channelId}`);
      console.log(`📝 User ${socket.user?.username} joined text channel room: channel_${channelId}`);
    });

    // Handle leaving a text channel
    socket.on('leaveChannel', (channelId) => {
      socket.leave(`channel_${channelId}`);
      console.log(`📝 User ${socket.user?.username} left text channel room: channel_${channelId}`);
    });

    // Handle joining a voice channel - DISCORD-LIKE REAL-TIME
    socket.on('join-voice-channel', async (data) => {
      try {
        const { channelId } = data;
        console.log(`🎤 User ${socket.user?.username} joining voice channel: ${channelId}`);
        
        // Get channel to find server
        const channel = await Channel.findById(channelId);
        if (!channel) {
          socket.emit('error', { message: 'Channel not found' });
          return;
        }
        
        const result = VoiceChannelManager.joinChannel(channelId, socket.userId);
        
        // Join socket room
        socket.join(`voice:${channelId}`);
        
        // Get user details for all users in channel
        const usersWithDetails = await Promise.all(
          result.users.map(async (userId) => {
            const user = await User.findById(userId).select('username displayName avatar status');
            return {
              id: userId,
              _id: userId,
              username: user?.username || 'Unknown User',
              displayName: user?.displayName || user?.username || 'Unknown User',
              avatar: user?.avatar,
              status: user?.status || 'offline',
              isMuted: false,
              isDeafened: false,
              isSpeaking: false,
              isCurrentUser: userId === socket.userId
            };
          })
        );
        
        const updatePayload = {
          channelId,
          users: usersWithDetails,
          action: 'join',
          userId: socket.userId,
          joinedUser: {
            id: socket.userId,
            username: socket.user.username,
            displayName: socket.user.displayName || socket.user.username,
            avatar: socket.user.avatar
          }
        };
        
        // CRITICAL: Broadcast to ENTIRE SERVER (not just voice room)
        // This ensures ALL users in sidebar see the update
        io.to(`server_${channel.server}`).emit('voiceChannelUpdate', updatePayload);
        
        // Also send to voice room for redundancy
        socket.to(`voice:${channelId}`).emit('voiceChannelUpdate', updatePayload);
        
        // Send success response to joiner
        socket.emit('voiceChannelUpdate', updatePayload);
        
        console.log(`✅ User ${socket.user?.username} joined voice channel: ${channelId}`);
        
      } catch (error) {
        console.error('Voice join error:', error);
        socket.emit('error', { message: 'Failed to join voice channel' });
      }
    });

    // Handle leaving a voice channel - DISCORD-LIKE REAL-TIME
    socket.on('leave-voice-channel', async (data) => {
      try {
        const { channelId } = data;
        console.log(`🚪 User ${socket.user?.username} leaving voice channel: ${channelId}`);
        
        // Get channel to find server
        const channel = await Channel.findById(channelId);
        if (!channel) {
          socket.emit('error', { message: 'Channel not found' });
          return;
        }
        
        const result = VoiceChannelManager.leaveChannel(channelId, socket.userId);
        
        // Leave socket room
        socket.leave(`voice:${channelId}`);
        
        // Get user details for remaining users in channel
        const usersWithDetails = await Promise.all(
          result.users.map(async (userId) => {
            const user = await User.findById(userId).select('username displayName avatar status');
            return {
              id: userId,
              _id: userId,
              username: user?.username || 'Unknown User',
              displayName: user?.displayName || user?.username || 'Unknown User',
              avatar: user?.avatar,
              status: user?.status || 'offline',
              isMuted: false,
              isDeafened: false,
              isSpeaking: false,
              isCurrentUser: userId === socket.userId
            };
          })
        );
        
        const updatePayload = {
          channelId,
          users: usersWithDetails,
          action: 'leave',
          userId: socket.userId,
          leftUser: {
            id: socket.userId,
            username: socket.user.username,
            displayName: socket.user.displayName || socket.user.username
          }
        };
        
        // CRITICAL: Broadcast to ENTIRE SERVER (not just voice room)
        // This ensures ALL users in sidebar see the update
        io.to(`server_${channel.server}`).emit('voiceChannelUpdate', updatePayload);
        
        // Also send to voice room for redundancy
        socket.to(`voice:${channelId}`).emit('voiceChannelUpdate', updatePayload);
        
        // Send success response to leaver
        socket.emit('voiceChannelUpdate', updatePayload);
        
        console.log(`✅ User ${socket.user?.username} left voice channel: ${channelId}`);
        
      } catch (error) {
        console.error('Voice leave error:', error);
      }
    });

    // Handle user server status update (custom status message)
    socket.on('userStatusUpdate', async (data) => {
      try {
        const { userId, serverId, status } = data;
        console.log(`💬 User ${userId} updated server status in ${serverId}: "${status}"`);
        
        // Broadcast to all users in this server (use server_ prefix to match join room)
        io.to(`server_${serverId}`).emit('userStatusUpdate', {
          userId,
          serverId,
          status
        });
        
        console.log(`✅ Server status broadcast to server_${serverId}`);
      } catch (error) {
        console.error('User status update error:', error);
      }
    });

    // Handle voice mute/deafen status updates - REAL-TIME
    socket.on('voice-mute-status', async (data) => {
      try {
        const { channelId, isMuted } = data;
        console.log(`🔇 User ${socket.user?.username} mute status: ${isMuted} in channel: ${channelId}`);
        
        // Get channel to find server
        const channel = await Channel.findById(channelId);
        if (!channel) return;
        
        // Broadcast to entire server
        const updatePayload = {
          channelId,
          userId: socket.userId,
          isMuted,
          user: {
            id: socket.userId,
            username: socket.user.username,
            displayName: socket.user.displayName || socket.user.username
          }
        };
        
        io.to(`server_${channel.server}`).emit('voice-user-muted', updatePayload);
        socket.to(`voice:${channelId}`).emit('voice-user-muted', updatePayload);
        
        console.log(`✅ Mute status broadcast to server_${channel.server}`);
      } catch (error) {
        console.error('Voice mute status error:', error);
      }
    });

    socket.on('voice-deafen-status', async (data) => {
      try {
        const { channelId, isDeafened } = data;
        console.log(`🔇 User ${socket.user?.username} deafen status: ${isDeafened} in channel: ${channelId}`);
        
        // Get channel to find server
        const channel = await Channel.findById(channelId);
        if (!channel) return;
        
        // Broadcast to entire server
        const updatePayload = {
          channelId,
          userId: socket.userId,
          isDeafened,
          user: {
            id: socket.userId,
            username: socket.user.username,
            displayName: socket.user.displayName || socket.user.username
          }
        };
        
        io.to(`server_${channel.server}`).emit('voice-user-deafened', updatePayload);
        socket.to(`voice:${channelId}`).emit('voice-user-deafened', updatePayload);
        
        console.log(`✅ Deafen status broadcast to server_${channel.server}`);
      } catch (error) {
        console.error('Voice deafen status error:', error);
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

        const server = await Server.findById(channel.server).populate('members.user', 'username displayName');
        const isMember = server.members.some(member => 
          member.user._id.toString() === socket.userId
        );

        if (!isMember) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Parse mentions from content (Discord-like @username)
        const mentions = await parseMentions(content, server.members);

        // Create message
        const message = new Message({
          content,
          author: socket.userId,
          channel: channelId,
          server: channel.server,
          replyTo: replyTo || null,
          mentions: mentions
        });

        await message.save();

        // Update channel's last message
        await Channel.findByIdAndUpdate(channelId, {
          lastMessage: message._id,
          $inc: { messageCount: 1 }
        });

        // Populate message for broadcast (Discord-like)
        const populatedMessage = await Message.findById(message._id)
          .populate('author', 'username displayName avatar discriminator status')
          .populate('mentions', 'username displayName')
          .populate({
            path: 'replyTo',
            select: 'content author createdAt',
            populate: {
              path: 'author',
              select: 'username displayName avatar'
            }
          });
        
        const broadcastData = {
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
          mentions: populatedMessage.mentions,
          reactions: populatedMessage.reactions,
          createdAt: populatedMessage.createdAt
        };
        
        // Broadcast to all server members
        io.to(`server_${channel.server}`).emit('newMessage', broadcastData);
        
        // Send mention notifications (Discord-like)
        if (mentions.length > 0) {
          mentions.forEach(mentionedUserId => {
            io.to(`user_${mentionedUserId}`).emit('mention', {
              messageId: message._id,
              channelId: channel._id,
              serverId: channel.server,
              channelName: channel.name,
              author: {
                username: populatedMessage.author.username,
                displayName: populatedMessage.author.displayName,
                avatar: populatedMessage.author.avatar
              },
              content: content.substring(0, 100) // Preview
            });
          });
        }

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
        console.log('🎭 Socket addReaction:', { messageId, emoji, userId: socket.userId });
        
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
        console.log('📢 Broadcasting reactionUpdate to server:', message.server);
        io.to(`server_${message.server}`).emit('reactionUpdate', {
          messageId,
          reactions: message.reactions
        });

      } catch (error) {
        console.error('❌ Add reaction error:', error);
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    // Handle DM typing indicator
    socket.on('dmTyping', ({ conversationId, isTyping }) => {
      try {
        // Broadcast typing status to other participants in the conversation
        socket.to(`dm_${conversationId}`).emit('dmTyping', {
          conversationId,
          userId: socket.userId,
          username: socket.user.username,
          isTyping
        });
      } catch (error) {
        console.error('DM typing error:', error);
      }
    });

    // Join DM conversation room
    socket.on('joinDMConversation', ({ conversationId }) => {
      try {
        socket.join(`dm_${conversationId}`);
        console.log(`User ${socket.user.username} joined DM conversation ${conversationId}`);
      } catch (error) {
        console.error('Join DM conversation error:', error);
      }
    });

    // Leave DM conversation room
    socket.on('leaveDMConversation', ({ conversationId }) => {
      try {
        socket.leave(`dm_${conversationId}`);
        console.log(`User ${socket.user.username} left DM conversation ${conversationId}`);
      } catch (error) {
        console.error('Leave DM conversation error:', error);
      }
    });

    // Handle screen sharing start
    socket.on('start-screen-share', async (data) => {
      try {
        const { channelId, userId } = data;
        console.log(`🖥️ User ${socket.user?.username} starting screen share in channel: ${channelId}`);
        
        // Join screen share room
        socket.join(`screen:${channelId}`);
        
        // Notify others in the voice channel
        socket.to(`voice:${channelId}`).emit('screen-share-started', {
          channelId,
          userId: socket.userId,
          user: {
            id: socket.userId,
            username: socket.user.username,
            displayName: socket.user.displayName || socket.user.username,
            avatar: socket.user.avatar
          }
        });
        
        console.log(`✅ Screen share started for user ${socket.user?.username}`);
      } catch (error) {
        console.error('Screen share start error:', error);
        socket.emit('error', { message: 'Failed to start screen sharing' });
      }
    });

    // Handle screen sharing stop
    socket.on('stop-screen-share', async (data) => {
      try {
        const { channelId, userId } = data;
        console.log(`🖥️ User ${socket.user?.username} stopping screen share in channel: ${channelId}`);
        
        // Leave screen share room
        socket.leave(`screen:${channelId}`);
        
        // Notify others in the voice channel
        socket.to(`voice:${channelId}`).emit('screen-share-stopped', {
          channelId,
          userId: socket.userId,
          user: {
            id: socket.userId,
            username: socket.user.username,
            displayName: socket.user.displayName || socket.user.username
          }
        });
        
        console.log(`✅ Screen share stopped for user ${socket.user?.username}`);
      } catch (error) {
        console.error('Stop screen share error:', error);
      }
    });

    // ==================== VOICE CALL EVENTS ====================
    
    // Initiate voice call
    socket.on('voiceCall:initiate', async ({ targetUserId, callType = 'voice' }) => {
      try {
        console.log(`📞 Voice call initiated by ${socket.userId} to ${targetUserId}`);
        
        // Notify target user about incoming call
        io.to(`user_${targetUserId}`).emit('voiceCall:incoming', {
          callerId: socket.userId,
          callerUsername: socket.user.username,
          callerDisplayName: socket.user.displayName,
          callType,
          timestamp: new Date()
        });
        
        // Confirm to caller that call is ringing
        socket.emit('voiceCall:ringing', {
          targetUserId,
          callType
        });
      } catch (error) {
        console.error('Voice call initiate error:', error);
        socket.emit('voiceCall:error', { message: 'Failed to initiate call' });
      }
    });

    // Accept voice call
    socket.on('voiceCall:accept', async ({ callerId }) => {
      try {
        console.log(`✅ Call accepted by ${socket.userId} from ${callerId}`);
        
        // Notify caller that call was accepted
        io.to(`user_${callerId}`).emit('voiceCall:accepted', {
          userId: socket.userId,
          username: socket.user.username,
          displayName: socket.user.displayName
        });
      } catch (error) {
        console.error('Voice call accept error:', error);
        socket.emit('voiceCall:error', { message: 'Failed to accept call' });
      }
    });

    // Reject voice call
    socket.on('voiceCall:reject', async ({ callerId }) => {
      try {
        console.log(`❌ Call rejected by ${socket.userId} from ${callerId}`);
        
        // Find or create conversation
        const Conversation = require('../models/Conversation');
        let conversation = await Conversation.findOne({
          participants: { $all: [callerId, socket.userId] }
        });

        if (!conversation) {
          conversation = await Conversation.create({
            participants: [callerId, socket.userId],
            lastMessage: null
          });
        }

        // Save rejected call as a system message
        const User = require('../models/User');
        const rejecter = await User.findById(socket.userId);
        
        const callMessage = new DirectMessage({
          conversation: conversation._id,
          author: callerId,
          content: `📞 ${rejecter.displayName || rejecter.username} aramayı reddetti`,
          messageType: 'call',
          metadata: {
            callDuration: 0,
            callType: 'voice',
            isAnswered: false,
            isRejected: true
          }
        });
        await callMessage.save();

        // Populate author
        await callMessage.populate('author', 'username displayName avatar');

        // Format message for frontend (DM format)
        const formattedMessage = {
          conversationId: callMessage.conversation.toString(),
          message: {
            id: callMessage._id.toString(),
            _id: callMessage._id.toString(),
            author: callMessage.author,
            content: callMessage.content,
            messageType: callMessage.messageType,
            metadata: callMessage.metadata,
            timestamp: callMessage.createdAt,
            createdAt: callMessage.createdAt
          },
          from: callerId,
          to: socket.userId
        };

        // Emit to conversation room only (both users are in the room)
        io.to(`dm_${conversation._id}`).emit('newDirectMessage', formattedMessage);
        
        // Notify caller that call was rejected
        io.to(`user_${callerId}`).emit('voiceCall:rejected', {
          userId: socket.userId,
          username: rejecter.displayName || rejecter.username
        });
      } catch (error) {
        console.error('Voice call reject error:', error);
      }
    });

    // End voice call
    socket.on('voiceCall:end', async ({ targetUserId, callDuration }) => {
      try {
        console.log(`📴 Call ended by ${socket.userId} with ${targetUserId}, duration: ${callDuration}`);
        
        // Save call history as a system message (only if call was actually connected)
        // Don't save if duration is 0 (rejected/missed calls are handled separately)
        if (callDuration !== undefined && callDuration > 0) {
          const Conversation = require('../models/Conversation');
          let conversation = await Conversation.findOne({
            participants: { $all: [socket.userId, targetUserId] }
          });

          if (!conversation) {
            conversation = await Conversation.create({
              participants: [socket.userId, targetUserId],
              lastMessage: null
            });
          }

          // Determine if call was answered based on duration
          const isAnswered = callDuration > 0;
          const content = isAnswered 
            ? `📞 Sesli arama - ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')} dakika`
            : `📞 Cevapsız arama`;

          const callMessage = new DirectMessage({
            conversation: conversation._id,
            author: socket.userId,
            content,
            messageType: 'call',
            metadata: {
              callDuration,
              callType: 'voice',
              isAnswered,
              isMissed: !isAnswered
            }
          });
          await callMessage.save();

          // Populate author
          await callMessage.populate('author', 'username displayName avatar');

          // Format message for frontend (DM format)
          const formattedMessage = {
            conversationId: callMessage.conversation.toString(),
            message: {
              id: callMessage._id.toString(),
              _id: callMessage._id.toString(),
              author: callMessage.author,
              content: callMessage.content,
              messageType: callMessage.messageType,
              metadata: callMessage.metadata,
              timestamp: callMessage.createdAt,
              createdAt: callMessage.createdAt
            },
            from: socket.userId,
            to: targetUserId
          };

          // Emit to conversation room
          io.to(`dm_${conversation._id}`).emit('newDirectMessage', formattedMessage);
        }
        
        // Notify other user that call ended
        io.to(`user_${targetUserId}`).emit('voiceCall:ended', {
          userId: socket.userId,
          username: socket.user.username
        });
      } catch (error) {
        console.error('Voice call end error:', error);
      }
    });

    // WebRTC signaling - offer
    socket.on('voiceCall:offer', async ({ targetUserId, offer }) => {
      try {
        console.log(`🔄 WebRTC offer from ${socket.userId} to ${targetUserId}`);
        
        io.to(`user_${targetUserId}`).emit('voiceCall:offer', {
          callerId: socket.userId,
          offer
        });
      } catch (error) {
        console.error('WebRTC offer error:', error);
      }
    });

    // WebRTC signaling - answer
    socket.on('voiceCall:answer', async ({ targetUserId, answer }) => {
      try {
        console.log(`🔄 WebRTC answer from ${socket.userId} to ${targetUserId}`);
        
        io.to(`user_${targetUserId}`).emit('voiceCall:answer', {
          userId: socket.userId,
          answer
        });
      } catch (error) {
        console.error('WebRTC answer error:', error);
      }
    });

    // WebRTC signaling - ICE candidate
    socket.on('voiceCall:iceCandidate', async ({ targetUserId, candidate }) => {
      try {
        io.to(`user_${targetUserId}`).emit('voiceCall:iceCandidate', {
          userId: socket.userId,
          candidate
        });
      } catch (error) {
        console.error('ICE candidate error:', error);
      }
    });

    // Voice activity - speaking status
    socket.on('voiceCall:speaking', async ({ targetUserId, isSpeaking }) => {
      try {
        io.to(`user_${targetUserId}`).emit('voiceCall:remoteSpeaking', {
          userId: socket.userId,
          isSpeaking
        });
      } catch (error) {
        console.error('Voice activity error:', error);
      }
    });

    // Mute status
    socket.on('voiceCall:muteStatus', async ({ targetUserId, isMuted }) => {
      try {
        io.to(`user_${targetUserId}`).emit('voiceCall:remoteMuteStatus', {
          userId: socket.userId,
          isMuted
        });
      } catch (error) {
        console.error('Mute status error:', error);
      }
    });

    // Screen share started in DM call
    socket.on('voiceCall:screenShareStarted', async ({ targetUserId }) => {
      try {
        console.log(`🖥️ Screen share started by ${socket.userId} in DM call with ${targetUserId}`);
        io.to(`user_${targetUserId}`).emit('voiceCall:screenShareStarted', {
          userId: socket.userId,
          username: socket.user.username
        });
      } catch (error) {
        console.error('Screen share started error:', error);
      }
    });

    // Screen share stopped in DM call
    socket.on('voiceCall:screenShareStopped', async ({ targetUserId }) => {
      try {
        console.log(`🖥️ Screen share stopped by ${socket.userId} in DM call with ${targetUserId}`);
        io.to(`user_${targetUserId}`).emit('voiceCall:screenShareStopped', {
          userId: socket.userId,
          username: socket.user.username
        });
      } catch (error) {
        console.error('Screen share stopped error:', error);
      }
    });

    // Renegotiation needed (for screen share track changes)
    socket.on('voiceCall:renegotiate', async ({ targetUserId }) => {
      try {
        console.log(`🔄 Renegotiation requested by ${socket.userId} with ${targetUserId}`);
        io.to(`user_${targetUserId}`).emit('voiceCall:renegotiationNeeded', {
          userId: socket.userId
        });
      } catch (error) {
        console.error('Renegotiation error:', error);
      }
    });

    // ==================== END VOICE CALL EVENTS ====================

    // ==================== VOICE CHANNEL WEBRTC SIGNALING ====================
    
    // WebRTC Offer (Voice Channel Group Call)
    socket.on('voice:offer', async ({ channelId, targetUserId, offer }) => {
      try {
        console.log(`📡 WebRTC offer from ${socket.userId} to ${targetUserId} in channel ${channelId}`);
        
        // Relay offer to target user
        io.to(`user_${targetUserId}`).emit('voice:offer', {
          channelId,
          fromUserId: socket.userId,
          fromUsername: socket.user.username,
          fromDisplayName: socket.user.displayName || socket.user.username,
          offer
        });
      } catch (error) {
        console.error('Voice offer relay error:', error);
      }
    });

    // WebRTC Answer (Voice Channel Group Call)
    socket.on('voice:answer', async ({ channelId, targetUserId, answer }) => {
      try {
        console.log(`📡 WebRTC answer from ${socket.userId} to ${targetUserId} in channel ${channelId}`);
        
        // Relay answer to target user
        io.to(`user_${targetUserId}`).emit('voice:answer', {
          channelId,
          fromUserId: socket.userId,
          fromUsername: socket.user.username,
          fromDisplayName: socket.user.displayName || socket.user.username,
          answer
        });
      } catch (error) {
        console.error('Voice answer relay error:', error);
      }
    });

    // WebRTC ICE Candidate (Voice Channel Group Call)
    socket.on('voice:ice-candidate', async ({ channelId, targetUserId, candidate }) => {
      try {
        console.log(`🧊 ICE candidate from ${socket.userId} to ${targetUserId} in channel ${channelId}`);
        
        // Relay ICE candidate to target user
        io.to(`user_${targetUserId}`).emit('voice:ice-candidate', {
          channelId,
          fromUserId: socket.userId,
          candidate
        });
      } catch (error) {
        console.error('ICE candidate relay error:', error);
      }
    });

    // Voice speaking status (for visual indicator)
    socket.on('voice:speaking', async ({ channelId, isSpeaking }) => {
      try {
        // Broadcast speaking status to all users in voice channel
        socket.to(`voice:${channelId}`).emit('voice:speaking', {
          userId: socket.userId,
          username: socket.user.username,
          isSpeaking
        });
      } catch (error) {
        console.error('Speaking status error:', error);
      }
    });

    // ==================== END VOICE CHANNEL WEBRTC SIGNALING ====================

    // Handle disconnect
    socket.on('disconnect', async () => {
      // Remove from connected users
      connectedUsers.delete(socket.userId);

      // Clean up voice channels on disconnect
      const allChannels = VoiceChannelManager.getAllChannels();
      for (const [channelId, users] of Object.entries(allChannels)) {
        if (users.includes(socket.userId)) {
          const result = VoiceChannelManager.leaveChannel(channelId, socket.userId);
          
          // Get channel to find server for broadcast
          try {
            const channel = await Channel.findById(channelId);
            if (channel) {
              const updatePayload = {
                channelId,
                users: result.users,
                action: 'leave',
                userId: socket.userId,
                leftUser: {
                  id: socket.userId,
                  username: socket.user?.username || 'Unknown User'
                }
              };
              
              // Broadcast to entire server
              io.to(`server_${channel.server}`).emit('voiceChannelUpdate', updatePayload);
              socket.to(`voice:${channelId}`).emit('voiceChannelUpdate', updatePayload);
            }
          } catch (error) {
            console.error('Error broadcasting disconnect voice update:', error);
          }
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
