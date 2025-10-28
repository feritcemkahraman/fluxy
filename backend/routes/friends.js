const express = require('express');
const router = express.Router();
const Friend = require('../models/Friend');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');

// Get all friends
router.get('/', auth, async (req, res) => {
  try {
    const friends = await Friend.getFriends(req.user._id.toString());
    res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pending friend requests (received)
router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await Friend.getPendingRequests(req.user._id.toString());
    res.json({ requests });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get sent friend requests
router.get('/requests/sent', auth, async (req, res) => {
  try {
    const requests = await Friend.getSentRequests(req.user._id.toString());
    res.json({ requests });
  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get blocked users
router.get('/blocked', auth, async (req, res) => {
  try {
    const blocked = await Friend.getBlockedUsers(req.user._id.toString());
    res.json({ blocked });
  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send friend request
router.post('/request', [
  auth,
  body('username').trim().isLength({ min: 1 }).withMessage('Username is required'),
  body('discriminator').optional().isLength({ min: 4, max: 4 }).withMessage('Discriminator must be 4 digits'),
  body('message').optional().isLength({ max: 200 }).withMessage('Message cannot exceed 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, discriminator, message = '' } = req.body;

    // Find target user
    const query = { username };
    if (discriminator) {
      query.discriminator = discriminator;
    }

    const targetUser = await User.findOne(query);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send friend request
    const friendRequest = await Friend.sendRequest(
      req.user._id.toString(),
      targetUser._id.toString(),
      message
    );

    const populatedRequest = await Friend.findById(friendRequest._id)
      .populate('from', 'username displayName avatar discriminator status')
      .populate('to', 'username displayName avatar discriminator status');

    // Emit socket event to notify the target user about the friend request
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${targetUser._id}`).emit('friendRequestReceived', {
        request: populatedRequest
      });
      console.log(`📬 Friend request notification sent to user: ${targetUser.username}`);
      
      // Also notify the sender that request was sent successfully
      io.to(`user_${req.user._id}`).emit('friendRequestSent', {
        request: populatedRequest
      });
    }

    res.status(201).json({ 
      message: 'Friend request sent',
      request: populatedRequest
    });

  } catch (error) {
    console.error('Send friend request error:', error);
    
    if (error.message.includes('already')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept friend request
router.post('/request/:requestId/accept', auth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await Friend.acceptRequest(requestId, req.user._id.toString());
    
    const populatedRequest = await Friend.findById(request._id)
      .populate('from', 'username displayName avatar discriminator status')
      .populate('to', 'username displayName avatar discriminator status');

    // Emit socket events to both users about the friendship being established
    const io = req.app.get('io');
    if (io) {
      const friendshipData = {
        request: populatedRequest,
        friend: populatedRequest.from // For the accepter, the friend is the sender
      };
      
      // Notify the original sender that their request was accepted
      io.to(`user_${populatedRequest.from._id}`).emit('friendRequestAccepted', {
        ...friendshipData,
        friend: populatedRequest.to // For the sender, the friend is the accepter
      });
      
      // Notify the accepter that they now have a new friend
      io.to(`user_${populatedRequest.to._id}`).emit('friendAdded', friendshipData);
      
      console.log(`🤝 Friendship established between ${populatedRequest.from.username} and ${populatedRequest.to.username}`);
    }

    res.json({ 
      message: 'Friend request accepted',
      request: populatedRequest
    });

  } catch (error) {
    console.error('Accept friend request error:', error);
    
    if (error.message.includes('not found') || error.message.includes('Unauthorized')) {
      return res.status(404).json({ message: error.message });
    }
    
    if (error.message.includes('not pending')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Decline friend request
router.post('/request/:requestId/decline', auth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await Friend.declineRequest(requestId, req.user._id.toString());
    
    res.json({ 
      message: 'Friend request declined',
      request
    });

  } catch (error) {
    console.error('Decline friend request error:', error);
    
    if (error.message.includes('not found') || error.message.includes('Unauthorized')) {
      return res.status(404).json({ message: error.message });
    }
    
    if (error.message.includes('not pending')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove friend
router.delete('/:friendId', auth, async (req, res) => {
  try {
    const { friendId } = req.params;

    await Friend.removeFriend(req.user._id.toString(), friendId);
    
    // Emit socket events to both users about the friendship being removed
    const io = req.app.get('io');
    if (io) {
      const friendshipData = {
        removedBy: req.user._id,
        friendId: friendId
      };
      
      // Notify both users that the friendship has been removed
      io.to(`user_${req.user._id}`).emit('friendRemoved', friendshipData);
      io.to(`user_${friendId}`).emit('friendRemoved', friendshipData);
      
      console.log(`💔 Friendship removed between ${req.user._id} and ${friendId}`);
    }
    
    res.json({ message: 'Friend removed successfully' });

  } catch (error) {
    console.error('Remove friend error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Block user
router.post('/block', [
  auth,
  body('userId').isMongoId().withMessage('Valid user ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId } = req.body;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    await Friend.blockUser(req.user._id.toString(), userId);
    
    res.json({ message: 'User blocked successfully' });

  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unblock user
router.delete('/block/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    await Friend.unblockUser(req.user._id.toString(), userId);
    
    res.json({ message: 'User unblocked successfully' });

  } catch (error) {
    console.error('Unblock user error:', error);
    
    if (error.message.includes('not blocked')) {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Search users (for adding friends)
router.get('/search', [
  auth,
  query('q').optional().trim().isLength({ min: 1 }).withMessage('Search query required')
], async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 1) {
      return res.status(400).json({ message: 'Search query required' });
    }

    // Search users by username or displayName (case insensitive)
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } }
      ],
      _id: { $ne: req.user._id } // Exclude current user
    })
    .select('username displayName avatar discriminator status')
    .limit(20);

    // Get current user's friends and requests to filter results
    const [friends, sentRequests, receivedRequests, blocked] = await Promise.all([
      Friend.getFriends(req.user._id.toString()),
      Friend.getSentRequests(req.user._id.toString()),
      Friend.getPendingRequests(req.user._id.toString()),
      Friend.getBlockedUsers(req.user._id.toString())
    ]);

    const friendIds = new Set(friends.map(f => f.id.toString()));
    const sentRequestIds = new Set(sentRequests.map(r => r.to.id.toString()));
    const receivedRequestIds = new Set(receivedRequests.map(r => r.from.id.toString()));
    const blockedIds = new Set(blocked.map(b => b.id.toString()));

    // Add relationship status to each user
    const usersWithStatus = users.map(user => {
      let relationshipStatus = 'none';
      
      if (blockedIds.has(user._id.toString())) {
        relationshipStatus = 'blocked';
      } else if (friendIds.has(user._id.toString())) {
        relationshipStatus = 'friend';
      } else if (sentRequestIds.has(user._id.toString())) {
        relationshipStatus = 'request_sent';
      } else if (receivedRequestIds.has(user._id.toString())) {
        relationshipStatus = 'request_received';
      }

      return {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        discriminator: user.discriminator,
        status: user.status,
        relationshipStatus
      };
    });

    res.json({ users: usersWithStatus });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
