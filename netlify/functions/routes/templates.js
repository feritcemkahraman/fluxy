const express = require('express');
const { body, validationResult } = require('express-validator');
const ServerTemplate = require('../models/ServerTemplate');
const Server = require('../models/Server');
const Channel = require('../models/Channel');
const Role = require('../models/Role');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');

const router = express.Router();

// @route   GET /api/templates
// @desc    Get all public server templates
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { category, limit = 20, skip = 0 } = req.query;

    let query = { isPublic: true };
    if (category && category !== 'all') {
      query.category = category;
    }

    const templates = await ServerTemplate.find(query)
      .sort({ usageCount: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('createdBy', 'username avatar discriminator');

    const total = await ServerTemplate.countDocuments(query);

    res.json({
      templates,
      total,
      hasMore: skip + templates.length < total
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/templates/categories
// @desc    Get available template categories
// @access  Public
router.get('/categories', (req, res) => {
  const categories = [
    { value: 'gaming', label: 'Gaming', icon: '🎮' },
    { value: 'education', label: 'Education', icon: '📚' },
    { value: 'community', label: 'Community', icon: '👥' },
    { value: 'music', label: 'Music', icon: '🎵' },
    { value: 'art', label: 'Art & Design', icon: '🎨' },
    { value: 'business', label: 'Business', icon: '💼' },
    { value: 'technology', label: 'Technology', icon: '💻' },
    { value: 'anime', label: 'Anime', icon: '🎌' },
    { value: 'other', label: 'Other', icon: '📂' }
  ];

  res.json({ categories });
});

// @route   GET /api/templates/popular
// @desc    Get popular templates
// @access  Private
router.get('/popular', auth, async (req, res) => {
  try {
    const templates = await ServerTemplate.getPopular(12);
    res.json({ templates });
  } catch (error) {
    console.error('Get popular templates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/templates
// @desc    Create a new server template
// @access  Private
router.post('/', auth, [
  body('name')
    .isLength({ min: 1, max: 50 })
    .withMessage('Template name must be between 1 and 50 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('category')
    .optional()
    .isIn(['gaming', 'education', 'community', 'music', 'art', 'business', 'technology', 'anime', 'other'])
    .withMessage('Invalid category'),
  body('template')
    .isObject()
    .withMessage('Template structure is required'),
  body('template.server')
    .isObject()
    .withMessage('Server template is required'),
  body('template.server.name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Server name must be between 1 and 100 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, category, icon, template, tags } = req.body;

    const newTemplate = new ServerTemplate({
      name,
      description: description || '',
      category: category || 'other',
      icon: icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop',
      template,
      createdBy: req.user._id,
      tags: tags || [],
      isPublic: true
    });

    await newTemplate.save();

    const populatedTemplate = await ServerTemplate.findById(newTemplate._id)
      .populate('createdBy', 'username avatar discriminator');

    res.status(201).json({
      message: 'Template created successfully',
      template: populatedTemplate
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/templates/:id/use
// @desc    Create server from template
// @access  Private
router.post('/:id/use', auth, async (req, res) => {
  try {
    console.log('=== Use Template Request ===');
    console.log('Template ID:', req.params.id);
    console.log('User ID:', req.user._id);
    console.log('Request body:', req.body);

    const template = await ServerTemplate.findById(req.params.id);
    console.log('Template found:', !!template);

    if (!template) {
      console.log('Template not found');
      return res.status(404).json({ message: 'Template not found' });
    }

    if (!template.isPublic) {
      console.log('Template is not public');
      return res.status(403).json({ message: 'Template is not available' });
    }

    const { name, description, icon } = req.body;
    console.log('Creating server with:', { name, description, icon });

    // Create server from template
    const serverData = {
      name: name || template.template.server.name,
      description: description || template.template.server.description,
      icon: icon || template.template.server.icon,
      owner: req.user._id,
      members: [{
        user: req.user._id,
        roles: [],
        joinedAt: new Date()
      }],
      isPublic: template.template.server.isPublic,
      inviteCode: template.template.server.inviteCode || generateInviteCode()
    };

    console.log('Server data:', serverData);
    const server = new Server(serverData);
    await server.save();
    console.log('Server created successfully');

    // Create roles from template
    const roleIds = [];
    console.log('Creating roles:', template.template.roles?.length || 0);
    console.log('Template roles data:', JSON.stringify(template.template.roles, null, 2));
    for (const roleData of template.template.roles) {
      console.log('Processing roleData:', JSON.stringify(roleData, null, 2));
      console.log('Creating role:', roleData.name);
      
      const roleToCreate = {
        name: roleData.name,
        color: roleData.color || '#99AAB5',
        permissions: roleData.permissions || {},
        server: server._id
      };
      console.log('Role object to create:', JSON.stringify(roleToCreate, null, 2));
      
      const role = new Role(roleToCreate);
      await role.save();
      roleIds.push(role._id);
    }
    console.log('Roles created:', roleIds.length);

    // Create channels from template
    const channelIds = [];
    console.log('Creating channels:', template.template.channels?.length || 0);
    console.log('Template channels data:', JSON.stringify(template.template.channels, null, 2));
    for (const channelData of template.template.channels) {
      console.log('Processing channelData:', JSON.stringify(channelData, null, 2));
      console.log('Creating channel:', channelData.name);
      
      const channelToCreate = {
        name: channelData.name,
        type: channelData.type || 'text',
        description: channelData.description || '',
        server: server._id,
        createdBy: req.user._id
      };
      console.log('Channel object to create:', JSON.stringify(channelToCreate, null, 2));
      
      const channel = new Channel(channelToCreate);
      await channel.save();
      channelIds.push(channel._id);
    }
    console.log('Channels created:', channelIds.length);

    // Update server with roles and channels
    server.roles = roleIds;
    server.channels = channelIds;
    await server.save();
    console.log('Server updated with roles and channels');

    // Add server to user's servers list
    await User.findByIdAndUpdate(req.user._id, {
      $push: { servers: server._id }
    });
    console.log('Server added to user servers');

    // Increment template usage count
    await template.incrementUsage();
    console.log('Template usage incremented');

    // Populate server data for response
    const populatedServer = await Server.findById(server._id)
      .populate('members.user', 'username avatar discriminator status')
      .populate('channels')
      .populate('roles');

    console.log('Server populated successfully');
    res.status(201).json({
      message: 'Server created from template successfully',
      server: populatedServer
    });
  } catch (error) {
    console.error('=== Use Template Error ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/templates/:id
// @desc    Delete server template
// @access  Private (Template creator or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await ServerTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Check if user is creator or admin
    if (template.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Only creator can delete template.' });
    }

    await ServerTemplate.findByIdAndDelete(req.params.id);

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to generate invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = router;
