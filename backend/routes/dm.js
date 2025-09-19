const express = require('express');
const { body, validationResult } = require('express-validator');
const Conversation = require('../models/Conversation');
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dm/conversations
// @desc    Get user's conversations
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id
    })
    .populate('participants', 'username avatar status discriminator')
    .populate('lastMessage')
    .sort({ lastActivity: -1 });

    const formattedConversations = conversations.map(conv => {
      const otherParticipant = conv.participants.find(p => p._id.toString() !== req.user.id);
      return {
        id: conv._id,
        type: conv.type,
        name: conv.type === 'direct' ? otherParticipant?.username : conv.name,
        avatar: conv.type === 'direct' ? otherParticipant?.avatar : conv.icon,
        participants: conv.participants,
        lastMessage: conv.lastMessage,
        lastActivity: conv.lastActivity,
        unreadCount: 0 // TODO: Calculate unread count
      };
    });

    res.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/dm/conversations
// @desc    Create or get conversation with user
// @access  Private
router.post('/conversations', auth, [
  body('userId').isMongoId().withMessage('Valid user ID required')
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

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot create conversation with yourself' });
    }

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [req.user.id, userId], $size: 2 }
    }).populate('participants', 'username avatar status discriminator');

    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        participants: [req.user.id, userId],
        type: 'direct'
      });
      await conversation.save();
      await conversation.populate('participants', 'username avatar status discriminator');
    }

    const otherParticipant = conversation.participants.find(p => p._id.toString() !== req.user.id);

    res.json({
      conversation: {
        id: conversation._id,
        type: conversation.type,
        name: otherParticipant.username,
        avatar: otherParticipant.avatar,
        participants: conversation.participants,
        lastActivity: conversation.lastActivity
      }
    });

  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dm/:conversationId/messages
// @desc    Get messages from conversation
// @access  Private
router.get('/:conversationId/messages', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Check if user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await DirectMessage.find({ conversation: conversationId })
      .populate('author', 'username avatar discriminator')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    res.json({ 
      messages: messages.reverse(),
      hasMore: messages.length === limit
    });

  } catch (error) {
    console.error('Get DM messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/dm/send
// @desc    Send direct message
// @access  Private
router.post('/send', auth, [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('content').isLength({ min: 1, max: 2000 }).withMessage('Message content required (1-2000 characters)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId, content } = req.body;

    // Get or create conversation
    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [req.user.id, userId], $size: 2 }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user.id, userId],
        type: 'direct'
      });
      await conversation.save();
    }

    // Create message
    const message = new DirectMessage({
      conversation: conversation._id,
      author: req.user.id,
      content
    });

    await message.save();
    await message.populate('author', 'username avatar discriminator');

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    // Emit socket event to notify the recipient about the new DM
    const io = req.app.get('io');
    if (io) {
      const dmData = {
        message: message,
        conversationId: conversation._id,
        from: req.user.id,
        to: userId
      };
      
      // Notify the recipient
      io.to(`user_${userId}`).emit('newDirectMessage', dmData);
      
      // Notify the sender for consistency (useful for multi-device scenarios)
      io.to(`user_${req.user.id}`).emit('dmSent', dmData);
      
      console.log(`💬 DM sent from ${req.user.username} to user ${userId}`);
    }

    res.status(201).json({ message });

  } catch (error) {
    console.error('Send DM error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/dm/:conversationId/read
// @desc    Mark conversation as read
// @access  Private
router.put('/:conversationId/read', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update read status
    const readStatusIndex = conversation.readStatus.findIndex(
      status => status.user.toString() === req.user.id
    );

    if (readStatusIndex > -1) {
      conversation.readStatus[readStatusIndex].lastReadAt = new Date();
    } else {
      conversation.readStatus.push({
        user: req.user.id,
        lastReadAt: new Date()
      });
    }

    await conversation.save();

    res.json({ message: 'Conversation marked as read' });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
