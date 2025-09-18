const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Get user settings
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('settings');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return settings with defaults
    const settings = user.settings || {
      theme: 'dark',
      glassmorphism: true,
      notifications: {
        desktop: true,
        soundEffects: true,
        messageNotifications: true,
        callNotifications: true,
        friendRequestNotifications: true
      },
      voice: {
        inputVolume: 80,
        outputVolume: 75,
        inputSensitivity: 60,
        pushToTalk: false,
        pushToTalkKey: 'Space',
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
        inputDevice: 'default',
        outputDevice: 'default'
      },
      privacy: {
        allowDirectMessages: true,
        enableFriendRequests: true,
        showOnlineStatus: true,
        allowServerInvites: true,
        dataCollection: false
      },
      chat: {
        fontSize: 14,
        messageDisplayMode: 'cozy',
        showTimestamps: true,
        use24HourTime: false,
        enableEmojis: true,
        enableAnimatedEmojis: true,
        enableSpoilerTags: true
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
});

// Update user settings
router.put('/', auth, async (req, res) => {
  try {
    const updates = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { settings: updates },
      { new: true, runValidators: true }
    ).select('settings');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Settings updated successfully',
      settings: updatedUser.settings
    });
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

// Update specific setting category
router.put('/:category', auth, async (req, res) => {
  try {
    const { category } = req.params;
    const updates = req.body;

    const validCategories = ['theme', 'glassmorphism', 'notifications', 'voice', 'privacy', 'chat'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid settings category' });
    }

    // Build update query for nested object
    const updateQuery = {};
    if (category === 'theme' || category === 'glassmorphism') {
      updateQuery[`settings.${category}`] = updates[category];
    } else {
      // For nested objects, set each property individually
      Object.keys(updates).forEach(key => {
        updateQuery[`settings.${category}.${key}`] = updates[key];
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateQuery,
      { new: true, runValidators: true }
    ).select('settings');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: `${category} settings updated successfully`,
      settings: updatedUser.settings
    });
  } catch (error) {
    console.error('Update settings category error:', error);
    res.status(500).json({ error: 'Failed to update settings category' });
  }
});

// Reset settings to defaults
router.post('/reset', auth, async (req, res) => {
  try {
    const defaultSettings = {
      theme: 'dark',
      glassmorphism: true,
      notifications: {
        desktop: true,
        soundEffects: true,
        messageNotifications: true,
        callNotifications: true,
        friendRequestNotifications: true
      },
      voice: {
        inputVolume: 80,
        outputVolume: 75,
        inputSensitivity: 60,
        pushToTalk: false,
        pushToTalkKey: 'Space',
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
        inputDevice: 'default',
        outputDevice: 'default'
      },
      privacy: {
        allowDirectMessages: true,
        enableFriendRequests: true,
        showOnlineStatus: true,
        allowServerInvites: true,
        dataCollection: false
      },
      chat: {
        fontSize: 14,
        messageDisplayMode: 'cozy',
        showTimestamps: true,
        use24HourTime: false,
        enableEmojis: true,
        enableAnimatedEmojis: true,
        enableSpoilerTags: true
      }
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { settings: defaultSettings },
      { new: true }
    ).select('settings');

    res.json({
      message: 'Settings reset to defaults',
      settings: updatedUser.settings
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

module.exports = router;
