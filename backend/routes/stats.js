const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Server = require('../models/Server');
const Message = require('../models/Message');

// Simple admin auth middleware
const checkAdminToken = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  const adminToken = process.env.ADMIN_TOKEN || 'change_this_in_production';
  
  if (!token || token !== adminToken) {
    return res.status(403).json({ success: false, message: 'Invalid admin token' });
  }
  next();
};

// Get real-time platform statistics (Admin token required)
router.get('/platform', checkAdminToken, async (req, res) => {
  try {
    // Get total users
    const totalUsers = await User.countDocuments();
    
    // Get active users (logged in within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeUsers = await User.countDocuments({
      lastSeen: { $gte: fiveMinutesAgo }
    });
    
    // Get online users (socket connections - will be updated by socket manager)
    const onlineUsers = global.onlineUsersCount || 0;
    
    // Get total servers
    const totalServers = await Server.countDocuments();
    
    // Get active servers (with activity in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activeServers = await Server.countDocuments({
      lastActivity: { $gte: oneHourAgo }
    });
    
    // Get total messages today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const messagesToday = await Message.countDocuments({
      createdAt: { $gte: startOfDay }
    });
    
    // Get total messages
    const totalMessages = await Message.countDocuments();
    
    // Get users registered today
    const usersToday = await User.countDocuments({
      createdAt: { $gte: startOfDay }
    });
    
    // Get servers created today
    const serversToday = await Server.countDocuments({
      createdAt: { $gte: startOfDay }
    });
    
    // Get voice channel stats (from socket manager)
    const voiceChannelUsers = global.voiceChannelUsersCount || 0;
    const activeVoiceCalls = global.activeVoiceCallsCount || 0;

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          online: onlineUsers,
          active: activeUsers,
          today: usersToday
        },
        servers: {
          total: totalServers,
          active: activeServers,
          today: serversToday
        },
        messages: {
          total: totalMessages,
          today: messagesToday
        },
        voice: {
          usersInVoice: voiceChannelUsers,
          activeCalls: activeVoiceCalls
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get detailed user statistics
router.get('/users', checkAdminToken, async (req, res) => {
  try {
    const users = await User.find()
      .select('username tag avatar status lastSeen createdAt')
      .sort({ lastSeen: -1 })
      .limit(100);

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get server statistics
router.get('/servers', checkAdminToken, async (req, res) => {
  try {
    const servers = await Server.find()
      .select('name icon memberCount createdAt lastActivity')
      .populate('owner', 'username tag')
      .sort({ memberCount: -1 })
      .limit(50);

    res.json({
      success: true,
      servers
    });
  } catch (error) {
    console.error('Server stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get growth statistics (last 30 days)
router.get('/growth', checkAdminToken, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Daily user registrations
    const userGrowth = await User.aggregate([
      {
        $match: { createdAt: { $gte: thirtyDaysAgo } }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Daily server creations
    const serverGrowth = await Server.aggregate([
      {
        $match: { createdAt: { $gte: thirtyDaysAgo } }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Daily messages
    const messageGrowth = await Message.aggregate([
      {
        $match: { createdAt: { $gte: thirtyDaysAgo } }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      growth: {
        users: userGrowth,
        servers: serverGrowth,
        messages: messageGrowth
      }
    });
  } catch (error) {
    console.error('Growth stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
