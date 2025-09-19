const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Server = require('../models/Server');
const { auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get user profile by ID
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('-password -email')
      .populate('servers', 'name icon')
      .lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if custom status has expired
    if (user.customStatus?.expiresAt && new Date() > user.customStatus.expiresAt) {
      await User.findByIdAndUpdate(userId, {
        'customStatus.text': '',
        'customStatus.emoji': '',
        'customStatus.expiresAt': null
      });
      user.customStatus = { text: '', emoji: '', expiresAt: null };
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.put('/', auth, [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('displayName')
    .optional()
    .isLength({ max: 32 })
    .withMessage('Display name cannot exceed 32 characters'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('pronouns')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Pronouns cannot exceed 50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, displayName, bio, pronouns, banner, avatar } = req.body;
    const userId = req.user._id;

    // Check if username is taken (if updating username)
    if (username) {
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (pronouns !== undefined) updateData.pronouns = pronouns;
    if (banner !== undefined) updateData.banner = banner;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -email');

    // Emit socket event to notify all servers where this user is a member
    const io = req.app.get('io');
    if (io) {
      try {
        // Find all servers where this user is a member
        const userServers = await Server.find({
          'members.user': userId
        });

        // Broadcast profile update to all user's servers
        const profileUpdate = {
          userId: userId,
          username: updatedUser.username,
          displayName: updatedUser.displayName,
          avatar: updatedUser.avatar,
          bio: updatedUser.bio,
          pronouns: updatedUser.pronouns,
          banner: updatedUser.banner
        };

        userServers.forEach(server => {
          io.to(`server:${server._id}`).emit('userProfileUpdate', profileUpdate);
        });

        console.log(`🔄 Profile update broadcasted to ${userServers.length} servers for user ${updatedUser.username}`);
      } catch (socketError) {
        console.error('❌ Profile update socket broadcast error:', socketError);
        // Don't fail the API call if socket broadcast fails
      }
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username is already taken' });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update user status
router.put('/status', auth, async (req, res) => {
  try {
    console.log('🚀 Profile route HIT! Method:', req.method, 'Path:', req.path);
    console.log('🔄 Profile API: Received request body:', req.body);
    console.log('🔄 Profile API: Headers:', req.headers);
    
    const { status } = req.body;
    const userId = req.user._id;

    console.log('🔄 Profile API: Updating status for user:', userId, 'to:', status);

    // Simple validation without express-validator
    const validStatuses = ['online', 'idle', 'dnd', 'invisible'];
    if (!status || !validStatuses.includes(status)) {
      console.error('❌ Profile API: Invalid status:', status);
      return res.status(400).json({ 
        error: 'Invalid status value',
        validStatuses: validStatuses
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        status,
        lastSeen: new Date()
      },
      { new: true }
    ).select('-password -email');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ Profile API: Status updated successfully to:', updatedUser.status);

    // Emit socket event to notify all clients about status change
    const io = req.app.get('io');
    if (io) {
      try {
        // Find all servers where this user is a member
        const userServers = await Server.find({
          'members.user': userId
        });

        // Broadcast status update to all user's servers
        userServers.forEach(server => {
          console.log(`🔄 Broadcasting status update for user ${updatedUser.username} (${userId}) to server: ${server.name} (${server._id})`);
          console.log(`🔄 Status broadcast data:`, { userId: String(userId), status: updatedUser.status, username: updatedUser.username });
          io.to(`server_${server._id}`).emit('userStatusUpdate', {
            userId: String(userId), // Ensure it's a string
            status: updatedUser.status,
            username: updatedUser.username
          });
        });

        console.log(`🔄 Profile API: Status update broadcasted to ${userServers.length} servers for user ${updatedUser.username}`);
      } catch (socketError) {
        console.error('❌ Profile API: Socket broadcast error:', socketError);
        // Don't fail the API call if socket broadcast fails
      }
    }

    res.json({
      message: 'Status updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Profile API: Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Update user activity/presence
router.put('/activity', auth, async (req, res) => {
  try {
    const { type, name, details, state, timestamps } = req.body;
    const userId = req.user._id;

    const validActivityTypes = ['playing', 'streaming', 'listening', 'watching', 'custom'];
    if (type && !validActivityTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid activity type',
        validTypes: validActivityTypes
      });
    }

    const activityData = {
      type: type || null,
      name: name || null,
      details: details || null,
      state: state || null,
      timestamps: timestamps || null,
      updatedAt: new Date()
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        activity: activityData,
        lastSeen: new Date()
      },
      { new: true }
    ).select('-password -email');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Broadcast activity update to all user's servers
    const io = req.app.get('io');
    if (io) {
      try {
        const userServers = await Server.find({
          'members.user': userId
        });

        userServers.forEach(server => {
          io.to(`server_${server._id}`).emit('userActivityUpdate', {
            userId: userId,
            username: updatedUser.username,
            activity: activityData
          });
        });

        console.log(`🎮 Activity update broadcasted to ${userServers.length} servers for user ${updatedUser.username}`);
      } catch (socketError) {
        console.error('❌ Activity broadcast error:', socketError);
      }
    }

    res.json({
      message: 'Activity updated successfully',
      activity: activityData
    });
  } catch (error) {
    console.error('❌ Update activity error:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// Clear user activity
router.delete('/activity', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        activity: null,
        lastSeen: new Date()
      },
      { new: true }
    ).select('-password -email');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Broadcast activity clear to all user's servers
    const io = req.app.get('io');
    if (io) {
      try {
        const userServers = await Server.find({
          'members.user': userId
        });

        userServers.forEach(server => {
          io.to(`server_${server._id}`).emit('userActivityUpdate', {
            userId: userId,
            username: updatedUser.username,
            activity: null
          });
        });

        console.log(`🎮 Activity cleared for user ${updatedUser.username}`);
      } catch (socketError) {
        console.error('❌ Activity clear broadcast error:', socketError);
      }
    }

    res.json({
      message: 'Activity cleared successfully'
    });
  } catch (error) {
    console.error('❌ Clear activity error:', error);
    res.status(500).json({ error: 'Failed to clear activity' });
  }
});

// Add user badge
router.post('/badges', auth, [
  body('type')
    .isIn(['staff', 'partner', 'hypesquad', 'bug_hunter', 'early_supporter', 'verified_bot', 'verified_developer', 'moderator', 'nitro'])
    .withMessage('Invalid badge type'),
  body('name')
    .isLength({ min: 1, max: 50 })
    .withMessage('Badge name must be between 1 and 50 characters'),
  body('description')
    .isLength({ min: 1, max: 200 })
    .withMessage('Badge description must be between 1 and 200 characters'),
  body('icon')
    .isURL()
    .withMessage('Badge icon must be a valid URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { type, name, description, icon, color } = req.body;
    const userId = req.user._id;

    // Check if user already has this badge type
    const user = await User.findById(userId);
    const existingBadge = user.badges.find(badge => badge.type === type);
    
    if (existingBadge) {
      return res.status(400).json({ error: 'User already has this badge type' });
    }

    const newBadge = {
      type,
      name,
      description,
      icon,
      color: color || '#5865F2',
      earnedAt: new Date()
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { badges: newBadge } },
      { new: true }
    ).select('-password -email');

    res.json({
      message: 'Badge added successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Add badge error:', error);
    res.status(500).json({ error: 'Failed to add badge' });
  }
});

// Remove user badge
router.delete('/badges/:badgeId', auth, async (req, res) => {
  try {
    const { badgeId } = req.params;
    const userId = req.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { badges: { _id: badgeId } } },
      { new: true }
    ).select('-password -email');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Badge removed successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Remove badge error:', error);
    res.status(500).json({ error: 'Failed to remove badge' });
  }
});

// Add social connection
router.post('/connections', auth, [
  body('type')
    .isIn(['spotify', 'youtube', 'twitch', 'steam', 'github', 'twitter', 'instagram'])
    .withMessage('Invalid connection type'),
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Connection name must be between 1 and 100 characters'),
  body('url')
    .isURL()
    .withMessage('Connection URL must be valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { type, name, url, public: isPublic } = req.body;
    const userId = req.user._id;

    // Check if user already has this connection type
    const user = await User.findById(userId);
    const existingConnection = user.connections.find(conn => conn.type === type);
    
    if (existingConnection) {
      return res.status(400).json({ error: 'User already has this connection type' });
    }

    const newConnection = {
      type,
      name,
      url,
      verified: false,
      public: isPublic !== false
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { connections: newConnection } },
      { new: true }
    ).select('-password -email');

    res.json({
      message: 'Connection added successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Add connection error:', error);
    res.status(500).json({ error: 'Failed to add connection' });
  }
});

// Remove social connection
router.delete('/connections/:connectionId', auth, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { connections: { _id: connectionId } } },
      { new: true }
    ).select('-password -email');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Connection removed successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Remove connection error:', error);
    res.status(500).json({ error: 'Failed to remove connection' });
  }
});

module.exports = router;
