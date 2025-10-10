const express = require('express');
const { body, validationResult } = require('express-validator');
const Channel = require('../models/Channel');
const Server = require('../models/Server');
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/channels
// @desc    Create a new channel
// @access  Private (Admin/Owner only)
router.post('/', auth, [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Channel name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\u00C0-\u017F_-]+$/)
    .withMessage('Channel name can only contain letters, numbers, spaces, Turkish characters, hyphens, and underscores'),
  body('type')
    .isIn(['text', 'voice'])
    .withMessage('Channel type must be text or voice'),
  body('serverId')
    .isMongoId()
    .withMessage('Invalid server ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, type, description, serverId } = req.body;

    // Check if server exists and user has permission
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    const userMember = server.members.find(member => 
      member.user.toString() === req.user._id.toString()
    );

    // Check if user is member of server
    if (!userMember) {
      return res.status(403).json({ message: 'Access denied. You must be a member of this server.' });
    }

    // Get next position
    const channelCount = await Channel.countDocuments({ server: serverId });

    // Create channel
    const channel = new Channel({
      name,
      type,
      description: description || '',
      server: serverId,
      position: channelCount,
      createdBy: req.user._id
    });

    await channel.save();

    // Add channel to server
    await Server.findByIdAndUpdate(serverId, {
      $push: { channels: channel._id }
    });

    // Emit socket event to notify all server members about new channel
    const io = req.app.get('io');
    if (io) {
      const channelData = {
        id: channel._id,
        name: channel.name,
        type: channel.type,
        description: channel.description,
        position: channel.position,
        server: channel.server
      };
      
      io.to(`server:${serverId}`).emit('channelCreated', channelData);
      console.log(`📢 Channel created broadcast to server:${serverId}`, channelData);
    }

    res.status(201).json({
      message: 'Channel created successfully',
      channel: {
        id: channel._id,
        name: channel.name,
        type: channel.type,
        description: channel.description,
        position: channel.position,
        server: channel.server
      }
    });

  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ message: 'Server error during channel creation' });
  }
});

// @route   GET /api/channels/:serverId
// @desc    Get channels for a server
// @access  Private
router.get('/:serverId', auth, async (req, res) => {
  try {
    const { serverId } = req.params;

    // Check if user is member of server
    const server = await Server.findById(serverId).lean();
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    const isMember = server.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const channels = await Channel.find({ server: serverId })
      .sort({ position: 1 })
      .populate('lastMessage', 'content author createdAt')
      .populate('connectedUsers.user', 'username avatar status');

    res.json({
      channels: channels.map(channel => ({
        id: channel._id,
        name: channel.name,
        type: channel.type,
        description: channel.description,
        position: channel.position,
        userLimit: channel.userLimit,
        connectedUsers: channel.connectedUsers,
        lastMessage: channel.lastMessage,
        messageCount: channel.messageCount,
        createdAt: channel.createdAt
      }))
    });

  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/channels/:id
// @desc    Update channel
// @access  Private (Admin/Owner only)
router.put('/:id', auth, [
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Channel name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\u00C0-\u017F_-]+$/)
    .withMessage('Channel name can only contain letters, numbers, spaces, Turkish characters, hyphens, and underscores'),
  body('description')
    .optional()
    .isLength({ max: 1024 })
    .withMessage('Description cannot exceed 1024 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    // Check permissions
    const server = await Server.findById(channel.server).lean();
    const userMember = server.members.find(member => 
      member.user.toString() === req.user._id.toString()
    );

    // Check if user is member of server
    if (!userMember) {
      return res.status(403).json({ message: 'Access denied. You must be a member of this server.' });
    }

    // Update channel
    const { name, description, userLimit } = req.body;
    if (name) channel.name = name;
    if (description !== undefined) channel.description = description;
    if (userLimit !== undefined) channel.userLimit = userLimit;

    await channel.save();

    res.json({
      message: 'Channel updated successfully',
      channel: {
        id: channel._id,
        name: channel.name,
        description: channel.description,
        userLimit: channel.userLimit
      }
    });

  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/channels/:id/join
// @desc    Join voice channel
// @access  Private
router.post('/:id/join', auth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id).lean();
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    if (channel.type !== 'voice') {
      return res.status(400).json({ message: 'Only voice channels can be joined' });
    }

    // Check if user is member of server
    const server = await Server.findById(channel.server).lean();
    const isMember = server.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. You must be a member of this server.' });
    }

    // Check user limit
    if (channel.userLimit > 0 && channel.connectedUsers.length >= channel.userLimit) {
      return res.status(400).json({ message: 'Voice channel is full' });
    }

    // Check if user is already connected
    const isConnected = channel.connectedUsers.some(user => 
      user.user.toString() === req.user._id.toString()
    );

    if (isConnected) {
      return res.status(400).json({ message: 'Already connected to this channel' });
    }

    // Add user to voice channel
    channel.connectedUsers.push({
      user: req.user._id,
      joinedAt: new Date(),
      isMuted: false,
      isDeafened: false
    });

    await channel.save();

    res.json({
      message: 'Successfully joined voice channel',
      channel: {
        id: channel._id,
        name: channel.name,
        connectedUsers: channel.connectedUsers.length
      }
    });

  } catch (error) {
    console.error('Join voice channel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/channels/:id/leave
// @desc    Leave voice channel
// @access  Private
router.delete('/:id/leave', auth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    if (channel.type !== 'voice') {
      return res.status(400).json({ message: 'Can only leave voice channels' });
    }

    // Remove user from voice channel
    channel.connectedUsers = channel.connectedUsers.filter(user => 
      user.user.toString() !== req.user._id.toString()
    );

    await channel.save();

    res.json({ message: 'Successfully left voice channel' });

  } catch (error) {
    console.error('Leave voice channel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/channels/:id
// @desc    Delete channel
// @access  Private (Admin/Owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    // Check permissions - Allow server owner, channel creator, or admins
    const server = await Server.findById(channel.server);
    const userMember = server.members.find(member => 
      member.user.toString() === req.user._id.toString()
    );

    const isServerOwner = server.owner.toString() === req.user._id.toString();
    const isChannelCreator = channel.createdBy && channel.createdBy.toString() === req.user._id.toString();
    const isAdmin = userMember && (userMember.role === 'admin' || userMember.role === 'Admin');

    if (!isServerOwner && !isChannelCreator && !isAdmin) {
      console.log('Access denied details:', {
        isServerOwner,
        isChannelCreator,
        isAdmin,
        serverOwner: server.owner.toString(),
        userId: req.user._id.toString(),
        channelCreator: channel.createdBy?.toString(),
        userRole: userMember?.role
      });
      return res.status(403).json({ message: 'Access denied. Server owner, channel creator, or admin only.' });
    }

    // Don't allow deleting if it's the only channel
    const channelCount = await Channel.countDocuments({ server: channel.server });
    if (channelCount <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last channel' });
    }

    // Delete all messages in the channel
    await Message.deleteMany({ channel: channel._id });

    // Remove channel from server
    await Server.findByIdAndUpdate(channel.server, {
      $pull: { channels: channel._id }
    });

    // Delete the channel
    await Channel.findByIdAndDelete(req.params.id);

    // Emit socket event to notify all server members about channel deletion
    const io = req.app.get('io');
    if (io) {
      io.to(`server:${channel.server}`).emit('channelDeleted', {
        channelId: req.params.id,
        serverId: channel.server
      });
      console.log(`📢 Channel deleted broadcast to server:${channel.server}`, { channelId: req.params.id });
    }

    res.json({ message: 'Channel deleted successfully' });

  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
