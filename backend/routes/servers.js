const express = require('express');
const { body, validationResult } = require('express-validator');
const Server = require('../models/Server');
const Channel = require('../models/Channel');
const User = require('../models/User');
const Role = require('../models/Role');
const { auth } = require('../middleware/auth');
const { requirePermission, requireOwner, requireMember, PERMISSIONS } = require('../middleware/permissions');

const router = express.Router();

// @route   POST /api/servers
// @desc    Create a new server
// @access  Private
router.post('/', auth, [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Server name must be between 1 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, icon, isPublic } = req.body;

    // Create server
    const server = new Server({
      name,
      description: description || '',
      icon: icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop',
      owner: req.user._id,
      isPublic: isPublic || false,
      members: [{
        user: req.user._id,
        roles: [],
        joinedAt: new Date()
      }]
    });

    await server.save();

    // Create default @everyone role
    const everyoneRole = await Role.createDefaultRole(server._id);
    server.roles.push(everyoneRole._id);
    await server.save();

    // Create default channels
    const generalChannel = new Channel({
      name: 'general',
      type: 'text',
      server: server._id,
      createdBy: req.user._id,
      position: 0
    });

    const voiceChannel = new Channel({
      name: 'general',
      type: 'voice',
      server: server._id,
      createdBy: req.user._id,
      position: 1
    });

    await Promise.all([generalChannel.save(), voiceChannel.save()]);

    // Add channels to server
    server.channels = [generalChannel._id, voiceChannel._id];
    await server.save();

    // Add server to user's servers list
    await User.findByIdAndUpdate(req.user._id, {
      $push: { servers: server._id }
    });

    // Populate server data for response
    const populatedServer = await Server.findById(server._id)
      .populate('members.user', 'username avatar discriminator status')
      .populate('channels');

    // Emit server creation event to the user
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.user._id}`).emit('serverCreated', {
        server: populatedServer
      });
    }

    res.status(201).json({
      message: 'Server created successfully',
      server: populatedServer
    });

  } catch (error) {
    console.error('Create server error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      message: 'Server error during server creation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/servers
// @desc    Get user's servers
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const servers = await Server.find({
      'members.user': req.user._id
    })
    .populate('members.user', 'username avatar discriminator status')
    .populate('channels')
    .sort({ createdAt: -1 });

    res.json({
      servers: servers.map(server => ({
        id: server._id,
        name: server.name,
        description: server.description,
        icon: server.icon,
        owner: server.owner,
        memberCount: server.memberCount,
        onlineCount: server.members.filter(member => 
          member.user.status === 'online'
        ).length,
        channels: server.channels,
        inviteCode: server.inviteCode,
        isPublic: server.isPublic,
        createdAt: server.createdAt
      }))
    });

  } catch (error) {
    console.error('Get servers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/servers/discover
// @desc    Get all public servers by member count for discovery
// @access  Public (auth optional for member check)
router.get('/discover', async (req, res) => {
  try {
    // Try to get user from token if provided
    let currentUserId = null;
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.userId;
      } catch (err) {
        // Invalid token, continue without user
      }
    }

    const servers = await Server.find({
      isPublic: true  // Only show public servers
    })
    .populate('owner', 'username avatar discriminator')
    .populate('members.user', '_id status')  // Include status field
    .sort({ memberCount: -1 })  // Sort by member count descending
    .select('name description icon memberCount createdAt tags isPublic inviteCode members');

    const discoveryServers = servers.map(server => {
      // Count online members (members with user status 'online' or 'idle')
      const onlineCount = server.members.filter(member => 
        member.user && (member.user.status === 'online' || member.user.status === 'idle')
      ).length;

      return {
        id: server._id,
        name: server.name,
        description: server.description || 'Açıklama yok',
        icon: server.icon,
        memberCount: server.memberCount || 0,
        onlineCount: onlineCount,
        owner: server.owner,
        tags: server.tags || [],
        inviteCode: server.inviteCode,
        createdAt: server.createdAt,
        isMember: currentUserId ? server.members.some(member => 
          member.user._id.toString() === currentUserId.toString()
        ) : false
      };
    });

    res.json({
      servers: discoveryServers,
      total: discoveryServers.length
    });

  } catch (error) {
    console.error('Discover servers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/servers/:id
// @desc    Get server by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id)
      .populate('members.user', 'username avatar discriminator status customStatus')
      .populate('channels');

    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    // Check if user is a member
    const isMember = server.members.some(member => 
      member.user._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      server: {
        id: server._id,
        name: server.name,
        description: server.description,
        icon: server.icon,
        owner: server.owner,
        members: server.members,
        channels: server.channels,
        memberCount: server.memberCount,
        onlineCount: server.members.filter(member => 
          member.user.status === 'online'
        ).length,
        inviteCode: server.inviteCode,
        isPublic: server.isPublic,
        createdAt: server.createdAt
      }
    });

  } catch (error) {
    console.error('Get server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/servers/:id
// @desc    Update server
// @access  Private (Server Owner or Manage Server permission)
router.put('/:id', auth, requirePermission(PERMISSIONS.MANAGE_SERVER), [
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Server name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const server = await Server.findById(req.params.id);
    
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    // Update server
    const { name, description, icon } = req.body;
    if (name) server.name = name;
    if (description !== undefined) server.description = description;
    if (icon) server.icon = icon;

    await server.save();

    // Broadcast server update to all members
    req.io.to(`server_${server._id}`).emit('serverUpdate', {
      serverId: server._id,
      name: server.name,
      description: server.description,
      icon: server.icon
    });

    res.json({
      message: 'Server updated successfully',
      server: {
        id: server._id,
        name: server.name,
        description: server.description,
        icon: server.icon
      }
    });

  } catch (error) {
    console.error('Update server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/servers/:id/join
// @desc    Join server (with or without invite code)
// @access  Private
router.post('/:id/join', auth, [
  body('inviteCode')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 6, max: 6 })
    .withMessage('Invalid invite code')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { inviteCode } = req.body;
    let server;
    
    if (inviteCode) {
      // Join with invite code
      server = await Server.findOne({ 
        _id: req.params.id,
        inviteCode: inviteCode.toUpperCase()
      });
      
      if (!server) {
        return res.status(404).json({ message: 'Invalid invite code' });
      }
    } else {
      // Join public server without invite code
      server = await Server.findById(req.params.id);
      
      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }
      
      // Check if server is public
      if (!server.isPublic) {
        return res.status(403).json({ message: 'This server requires an invite code' });
      }
    }

    // Check if user is already a member
    const populatedServer = await Server.findById(server._id).populate('members.user', '_id');
    const isMember = populatedServer.members.some(member => 
      member.user._id.toString() === req.user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this server' });
    }

    // Get default @everyone role
    const defaultRole = await Role.findOne({ server: server._id, isDefault: true });
    
    // Add user to server
    server.members.push({
      user: req.user._id,
      roles: defaultRole ? [defaultRole._id] : [],
      joinedAt: new Date()
    });

    await server.save();

    // Add server to user's servers list
    await User.findByIdAndUpdate(req.user._id, {
      $push: { servers: server._id }
    });

    // Populate server data for socket event
    const populatedServerForEvent = await Server.findById(server._id)
      .populate('members.user', 'username avatar discriminator status')
      .populate('channels');

    // Emit server joined event to the user for real-time UI update
    const io = req.app.get('io');
    
    if (io) {
      // FIRST: Find user's socket and join them to the new server room
      const { connectedUsers } = require('../socket/socketHandler');
      const userConnection = connectedUsers.get(req.user._id.toString());
      if (userConnection) {
        const userSocket = io.sockets.sockets.get(userConnection.socketId);
        if (userSocket) {
          userSocket.join(`server_${server._id}`);
          console.log(`✅ User ${req.user.username} joined server room: server_${server._id}`);
        }
      }
    }
    
    // THEN: Create and broadcast welcome message
    const firstTextChannel = populatedServerForEvent.channels.find(ch => ch.type === 'text');
    console.log('🔍 First text channel found:', firstTextChannel?._id);
    
    if (firstTextChannel && io) {
      const Message = require('../models/Message');
      const welcomeMessage = new Message({
        content: `🎉 **${req.user.username}** sunucuya katıldı! Hoş geldin!`,
        author: req.user._id,
        channel: firstTextChannel._id,
        server: server._id,
        type: 'system', isSystemMessage: true, systemMessageType: 'member_join'
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

      console.log('📡 Broadcasting welcome message to server room:', `server_${server._id}`);
      
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
        type: populatedMessage.type, isSystemMessage: populatedMessage.isSystemMessage, systemMessageType: populatedMessage.systemMessageType,
        createdAt: populatedMessage.createdAt
      };
      
      // Broadcast welcome message to all server members (system messages go to server room only)
      io.to(`server_${server._id}`).emit('newMessage', messageData);
    }
    
    if (io) {

      // Emit serverJoined event to the user
      io.to(`user_${req.user._id}`).emit('serverJoined', {
        server: populatedServerForEvent
      });

      // If joined via invite, broadcast to server members about new member
      if (inviteCode) {
        io.to(`server_${server._id}`).emit('memberJoinedViaInvite', {
          serverId: server._id,
          newMember: {
            _id: req.user._id,
            username: req.user.username,
            avatar: req.user.avatar,
            discriminator: req.user.discriminator
          },
          inviteCode: inviteCode,
          joinedAt: new Date()
        });
      }

      // Broadcast new member joined to all server members
      io.to(`server_${server._id}`).emit('newMemberJoined', {
        serverId: server._id,
        member: {
          user: {
            _id: req.user._id,
            username: req.user.username,
            avatar: req.user.avatar,
            status: req.user.status
          },
          roles: defaultRole ? [defaultRole._id] : [],
          joinedAt: new Date()
        }
      });
    }

    res.json({
      message: 'Successfully joined server',
      server: {
        id: server._id,
        name: server.name,
        icon: server.icon
      }
    });

  } catch (error) {
    console.error('Join server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/servers/join-by-invite
// @desc    Join server using only invite code
// @access  Private
router.post('/join-by-invite', auth, [
  body('inviteCode')
    .isLength({ min: 6, max: 8 })
    .withMessage('Invalid invite code format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { inviteCode } = req.body;
    
    // Find server by invite code
    const server = await Server.findOne({ 
      inviteCode: inviteCode.toUpperCase()
    }).populate('roles');
    
    if (!server) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    // Check if user is already a member
    const existingMember = server.members.find(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (existingMember) {
      return res.status(400).json({ message: 'You are already a member of this server' });
    }

    // Get default role
    const defaultRole = server.roles.find(role => role.name === '@everyone');

    // Add user to server
    server.members.push({
      user: req.user._id,
      roles: defaultRole ? [defaultRole._id] : [],
      joinedAt: new Date()
    });

    await server.save();

    // Populate server data for socket event
    const populatedServerForEvent = await Server.findById(server._id)
      .populate('members.user', 'username avatar discriminator status')
      .populate('channels');

    // Broadcast new member joined to all server members
    const io = req.io || req.app.get('io');
    
    if (io) {
      // FIRST: Find user's socket and join them to the new server room
      const { connectedUsers } = require('../socket/socketHandler');
      const userConnection = connectedUsers.get(req.user._id.toString());
      if (userConnection) {
        const userSocket = io.sockets.sockets.get(userConnection.socketId);
        if (userSocket) {
          userSocket.join(`server_${server._id}`);
          console.log(`✅ User ${req.user.username} joined server room: server_${server._id}`);
        }
      }
    }
    
    // THEN: Create and broadcast welcome message
    const firstTextChannel = populatedServerForEvent.channels.find(ch => ch.type === 'text');
    console.log('🔍 First text channel found:', firstTextChannel?._id);
    
    if (firstTextChannel && io) {
      const Message = require('../models/Message');
      const Channel = require('../models/Channel');
      const welcomeMessage = new Message({
        content: `🎉 **${req.user.username}** sunucuya katıldı! Hoş geldin!`,
        author: req.user._id,
        channel: firstTextChannel._id,
        server: server._id,
        type: 'system', isSystemMessage: true, systemMessageType: 'member_join'
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

      console.log('📡 Broadcasting welcome message to server room:', `server_${server._id}`);
      
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
        type: populatedMessage.type, isSystemMessage: populatedMessage.isSystemMessage, systemMessageType: populatedMessage.systemMessageType,
        createdAt: populatedMessage.createdAt
      };
      
      // Broadcast welcome message to all server members (system messages go to server room only)
      io.to(`server_${server._id}`).emit('newMessage', messageData);
    }
    
    if (io) {
      // Emit serverJoined event to the user for real-time UI update
      io.to(`user_${req.user._id}`).emit('serverJoined', {
        server: populatedServerForEvent
      });

      io.to(`server_${server._id}`).emit('newMemberJoined', {
        serverId: server._id,
        member: {
          user: {
            _id: req.user._id,
            username: req.user.username,
            avatar: req.user.avatar,
            status: req.user.status
          },
          roles: defaultRole ? [defaultRole._id] : [],
          joinedAt: new Date()
        }
      });

      // Also emit memberJoinedViaInvite for invite tracking
      io.to(`server_${server._id}`).emit('memberJoinedViaInvite', {
        serverId: server._id,
        inviteCode: inviteCode,
        member: {
          _id: req.user._id,
          username: req.user.username,
          avatar: req.user.avatar,
          discriminator: req.user.discriminator
        },
        inviteCode: inviteCode,
        joinedAt: new Date()
      });
    }

    // Send welcome message to the first channel
    try {
      const Channel = require('../models/Channel');
      const Message = require('../models/Message');
      
      // Find the first text channel in the server (usually general or similar)
      const firstChannel = await Channel.findOne({ 
        server: server._id, 
        type: 'text' 
      }).sort({ createdAt: 1 });
      
      if (firstChannel) {
        // Create welcome message
        const welcomeMessage = new Message({
          content: `🎉 **${req.user.displayName || req.user.username}** sunucuya katıldı! Hoş geldin! 🎉`,
          author: null, // System message
          channel: firstChannel._id,
          server: server._id,
          isSystemMessage: true,
          systemMessageType: 'member_join',
          createdAt: new Date()
        });

        await welcomeMessage.save();

        // Broadcast welcome message to all channel members
        if (io) {
          io.to(`channel_${firstChannel._id}`).emit('newMessage', {
            ...welcomeMessage.toObject(),
            author: {
              _id: null,
              username: 'Sistem',
              avatar: null,
              displayName: 'Sistem'
            }
          });
        }
      }
    } catch (error) {
      console.error('Welcome message error:', error);
      // Don't fail the join process if welcome message fails
    }

    res.json({
      message: 'Successfully joined server',
      server: {
        id: server._id,
        name: server.name,
        icon: server.icon,
        description: server.description
      }
    });

  } catch (error) {
    console.error('Join by invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/servers/:id/leave
// @desc    Leave server
// @access  Private
router.delete('/:id/leave', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    // Check if user is owner
    if (server.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        message: 'Server owner cannot leave. Transfer ownership or delete server.' 
      });
    }

    // Remove user from server members
    server.members = server.members.filter(member => 
      member.user.toString() !== req.user._id.toString()
    );

    await server.save();

    // Remove server from user's servers list
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { servers: server._id }
    });

    // Emit socket event to notify server members about user leaving
    const io = req.io || req.app.get('io');
    if (io) {
      // Notify all server members that this user left
      io.to(`server_${server._id}`).emit('memberLeft', {
        serverId: server._id,
        userId: req.user._id,
        username: req.user.username
      });

      // Find user's socket and remove them from server room
      const { connectedUsers } = require('../socket/socketHandler');
      const userConnection = connectedUsers.get(req.user._id.toString());
      if (userConnection) {
        const userSocket = io.sockets.sockets.get(userConnection.socketId);
        if (userSocket) {
          userSocket.leave(`server_${server._id}`);
          console.log(`✅ User ${req.user.username} left server room: server_${server._id}`);
        }
      }
    }

    res.json({ message: 'Successfully left server' });

  } catch (error) {
    console.error('Leave server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/servers/:id/invite
// @desc    Create server invite
// @access  Private
router.post('/:id/invite', auth, requireMember, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    // Generate random invite code if not exists
    if (!server.inviteCode) {
      server.inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      await server.save();

      // Broadcast invite creation to all server members
      try {
        const io = req.io || req.app.get('io');
        if (io) {
          io.to(`server_${server._id}`).emit('inviteCreated', {
            serverId: server._id,
            inviteCode: server.inviteCode,
            createdBy: req.user._id,
            createdByUsername: req.user.username,
            serverName: server.name
          });
        }
      } catch (ioError) {
        console.error('IO broadcast error:', ioError);
        // Don't fail the request if broadcast fails
      }
    }

    res.json({ 
      inviteCode: server.inviteCode,
      expiresAt: null // Permanent invite for now
    });

  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/servers/:id
// @desc    Delete server
// @access  Private (Owner only)
router.delete('/:id', auth, requireOwner, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    // Delete all channels in the server
    await Channel.deleteMany({ server: server._id });

    // Remove server from all users' servers lists
    await User.updateMany(
      { servers: server._id },
      { $pull: { servers: server._id } }
    );

    // Delete the server
    await Server.findByIdAndDelete(req.params.id);

    res.json({ message: 'Server deleted successfully' });

  } catch (error) {
    console.error('Delete server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/servers/:id/members
// @desc    Get server members
// @access  Private (Server Members only)
router.get('/:id/members', auth, requireMember, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id)
      .populate('members.user', 'username displayName avatar status discriminator')
      .populate('owner', 'username displayName avatar status discriminator');

    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    // Format members data
    const members = server.members.map(member => ({
      id: member.user._id,
      username: member.user.username,
      displayName: member.user.displayName,
      avatar: member.user.avatar,
      status: member.user.status || 'offline',
      role: member.user._id.toString() === server.owner.toString() ? 'Yönetici' : 'Üye',
      roleColor: member.user._id.toString() === server.owner.toString() ? '#f04747' : '#99AAB5',
      joinedAt: member.joinedAt
    }));

    // Add owner to members if not already included
    const ownerInMembers = members.find(m => m.id.toString() === server.owner._id.toString());
    if (!ownerInMembers) {
      members.unshift({
        id: server.owner._id,
        username: server.owner.username,
        displayName: server.owner.displayName,
        avatar: server.owner.avatar,
        status: server.owner.status || 'offline',
        role: 'Yönetici',
        roleColor: '#F04747',
        joinedAt: server.createdAt
      });
    }

    res.json({ 
      members,
      totalMembers: members.length,
      onlineMembers: members.filter(m => m.status !== 'offline').length
    });

  } catch (error) {
    console.error('Get server members error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/servers/:id/kick/:userId
// @desc    Kick a member from server
// @access  Private (Server Owner or Kick Members permission)
router.post('/:id/kick/:userId', auth, requirePermission(PERMISSIONS.KICK_MEMBERS), async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    const { reason } = req.body;

    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    const userId = req.params.userId;

    // Check if user is trying to kick themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot kick yourself' });
    }

    // Check if user is owner (owner cannot be kicked)
    if (server.owner.toString() === userId) {
      return res.status(400).json({ message: 'Cannot kick server owner' });
    }

    // Check if target user is a member
    const memberIndex = server.members.findIndex(member =>
      member.user.toString() === userId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: 'User is not a member of this server' });
    }

    // Remove user from server members
    const kickedMember = server.members[memberIndex];
    server.members.splice(memberIndex, 1);
    await server.save();

    // Remove server from user's servers list
    await User.findByIdAndUpdate(userId, {
      $pull: { servers: server._id }
    });

    // Get kicked user details for broadcast
    const kickedUser = await User.findById(userId).select('username displayName avatar');

    // Broadcast member kick to all server members
    req.io.to(`server_${server._id}`).emit('memberKicked', {
      serverId: server._id,
      userId,
      kickedBy: req.user._id,
      kickedByUsername: req.user.username,
      kickedUser: {
        _id: userId,
        username: kickedUser?.username,
        displayName: kickedUser?.displayName,
        avatar: kickedUser?.avatar
      },
      reason: reason || 'No reason provided'
    });

    // Notify the kicked user
    req.io.to(`user_${userId}`).emit('kicked', {
      serverId: server._id,
      serverName: server.name,
      kickedBy: req.user.username,
      reason: reason || 'No reason provided'
    });

    res.json({ 
      message: 'Member kicked successfully',
      reason: reason || 'No reason provided'
    });

  } catch (error) {
    console.error('Kick member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/servers/:id/ban/:userId
// @desc    Ban a member from server
// @access  Private (Server Owner or Ban Members permission)
router.post('/:id/ban/:userId', auth, requirePermission(PERMISSIONS.BAN_MEMBERS), async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);

    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    const userId = req.params.userId;
    const { reason, deleteMessageDays } = req.body;

    // Check if user is trying to ban themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot ban yourself' });
    }

    // Check if user is owner (owner cannot be banned)
    if (server.owner.toString() === userId) {
      return res.status(400).json({ message: 'Cannot ban server owner' });
    }

    // Check if target user is already banned
    const existingBan = server.bannedUsers?.find(ban =>
      ban.user.toString() === userId
    );

    if (existingBan) {
      return res.status(400).json({ message: 'User is already banned from this server' });
    }

    // Check if target user is a member
    const memberIndex = server.members.findIndex(member =>
      member.user.toString() === userId
    );

    // Add to banned users
    if (!server.bannedUsers) server.bannedUsers = [];
    server.bannedUsers.push({
      user: userId,
      reason: reason || 'No reason provided',
      bannedBy: req.user._id,
      bannedAt: new Date()
    });

    // Remove from members if they are currently a member
    if (memberIndex !== -1) {
      server.members.splice(memberIndex, 1);

      // Remove server from user's servers list
      await User.findByIdAndUpdate(userId, {
        $pull: { servers: server._id }
      });
    }

    // Delete messages if specified
    if (deleteMessageDays && deleteMessageDays > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - deleteMessageDays);

      const channels = await Channel.find({ server: server._id });
      for (const channel of channels) {
        await Message.deleteMany({
          channel: channel._id,
          author: userId,
          createdAt: { $gte: cutoffDate }
        });
      }
    }

    await server.save();

    // Get banned user details for broadcast
    const bannedUser = await User.findById(userId).select('username displayName avatar');

    // Broadcast member ban to all server members
    req.io.to(`server_${server._id}`).emit('memberBanned', {
      serverId: server._id,
      userId,
      bannedBy: req.user._id,
      bannedByUsername: req.user.username,
      bannedUser: {
        _id: userId,
        username: bannedUser?.username,
        displayName: bannedUser?.displayName,
        avatar: bannedUser?.avatar
      },
      reason: reason || 'No reason provided',
      deleteMessageDays: deleteMessageDays || 0
    });

    // Notify the banned user
    req.io.to(`user_${userId}`).emit('banned', {
      serverId: server._id,
      serverName: server.name,
      bannedBy: req.user.username,
      reason: reason || 'No reason provided'
    });

    res.json({ message: 'Member banned successfully' });

  } catch (error) {
    console.error('Ban member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/servers/:id/ban/:userId
// @desc    Unban a member from server
// @access  Private (Server Owner or Ban Members permission)
router.delete('/:id/ban/:userId', auth, requirePermission(PERMISSIONS.BAN_MEMBERS), async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);

    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    const userId = req.params.userId;

    // Remove from banned users
    if (server.bannedUsers) {
      server.bannedUsers = server.bannedUsers.filter(ban =>
        ban.user.toString() !== userId
      );
      await server.save();
    }

    res.json({ message: 'Member unbanned successfully' });

  } catch (error) {
    console.error('Unban member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/servers/:id/bans
// @desc    Get banned users for server
// @access  Private (Server Owner or Ban Members permission)
router.get('/:id/bans', auth, requirePermission(PERMISSIONS.BAN_MEMBERS), async (req, res) => {
  try {
    const server = await Server.findById(req.params.id)
      .populate('bannedUsers.user', 'username avatar discriminator')
      .populate('bannedUsers.bannedBy', 'username avatar discriminator');

    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    res.json({
      bannedUsers: server.bannedUsers || []
    });

  } catch (error) {
    console.error('Get bans error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/servers/:id
// @desc    Delete a server (owner only)
// @access  Private
router.delete('/:id', auth, requireOwner, async (req, res) => {
  try {
    const serverId = req.params.id;

    // Delete all channels associated with the server
    await Channel.deleteMany({ server: serverId });

    // Delete all roles associated with the server
    await Role.deleteMany({ server: serverId });

    // Remove server from all users' servers list
    await User.updateMany(
      { servers: serverId },
      { $pull: { servers: serverId } }
    );

    // Delete the server
    await Server.findByIdAndDelete(serverId);

    res.json({ message: 'Server deleted successfully' });

  } catch (error) {
    console.error('Delete server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
