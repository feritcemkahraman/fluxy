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
    .populate('participants', 'username displayName avatar status discriminator')
    .populate('lastMessage')
    .sort({ lastActivity: -1 });

    const formattedConversations = conversations.map(conv => {
      const otherParticipant = conv.participants.find(p => p._id.toString() !== req.user.id);
      return {
        id: conv._id,
        type: 'dm',
        user: {
          id: otherParticipant?._id,
          username: otherParticipant?.username,
          displayName: otherParticipant?.displayName || otherParticipant?.username,
          avatar: otherParticipant?.avatar,
          status: otherParticipant?.status || 'offline'
        },
        lastMessage: conv.lastMessage ? {
          content: conv.lastMessage.content,
          timestamp: conv.lastMessage.createdAt,
          author: { username: conv.lastMessage.author?.username }
        } : null,
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
    }).populate('participants', 'username displayName avatar status discriminator');

    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        participants: [req.user.id, userId],
        type: 'direct'
      });
      await conversation.save();
      await conversation.populate('participants', 'username displayName avatar status discriminator');
    }

    const otherParticipant = conversation.participants.find(p => p._id.toString() !== req.user.id);

    const conversationData = {
      id: conversation._id,
      type: conversation.type,
      name: otherParticipant.displayName || otherParticipant.username,
      avatar: otherParticipant.avatar,
      participants: conversation.participants,
      lastActivity: conversation.lastActivity
    };

    // Emit socket event to both participants
    const io = req.app.get('io');
    if (io) {
      // Notify both users about the new conversation
      conversation.participants.forEach(participant => {
        io.to(`user_${participant._id}`).emit('newConversation', conversationData);
      });
      console.log(`💬 New conversation created between ${req.user.id} and ${userId}`);
    }

    res.json({ conversation: conversationData });

  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dm/conversations/:conversationId/messages  
// @desc    Get messages from conversation
// @access  Private
router.get('/conversations/:conversationId/messages', auth, async (req, res) => {
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
      .populate('author', 'username displayName avatar discriminator')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const formattedMessages = messages.reverse().map(msg => ({
      id: msg._id,
      conversationId: conversationId,
      author: {
        id: msg.author._id,
        username: msg.author.username,
        displayName: msg.author.displayName || msg.author.username,
        avatar: msg.author.avatar
      },
      content: msg.content,
      messageType: msg.messageType,
      metadata: msg.metadata,
      timestamp: msg.createdAt,
      reactions: msg.reactions || []
    }));

    res.json({ 
      messages: formattedMessages,
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
    await message.populate('author', 'username displayName avatar discriminator');

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
      
      // Note: Don't emit to sender - they have optimistic update
      
      console.log(`💬 DM sent from ${req.user.username} to user ${userId}`);
    }

    res.status(201).json({ message });

  } catch (error) {
    console.error('Send DM error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/dm/conversations/:conversationId/messages
// @desc    Send message to conversation
// @access  Private
router.post('/conversations/:conversationId/messages', auth, [
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

    const { conversationId } = req.params;
    const { content } = req.body;

    // Check if conversation exists and user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create message
    const message = new DirectMessage({
      conversation: conversationId,
      author: req.user.id,
      content
    });

    await message.save();
    await message.populate('author', 'username displayName avatar discriminator');

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    // Get other participant for WebSocket notification
    const otherParticipantId = conversation.participants.find(
      p => p.toString() !== req.user.id
    );

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const dmData = {
        id: message._id,
        conversationId: conversationId,
        author: {
          id: message.author._id,
          username: message.author.username,
          displayName: message.author.displayName || message.author.username,
          avatar: message.author.avatar
        },
        content: message.content,
        timestamp: message.createdAt,
        reactions: []
      };
      
      // Broadcast to conversation room (all participants)
      io.to(`dm_${conversationId}`).emit('newDirectMessage', dmData);
      
      // Also emit to recipient's user room for notifications when not in conversation
      if (otherParticipantId) {
        io.to(`user_${otherParticipantId}`).emit('newDirectMessage', dmData);
      }
      // Note: Don't emit to sender - they have optimistic update
    }

    res.status(201).json({ 
      message: {
        id: message._id,
        conversationId: conversationId,
        author: {
          id: message.author._id,
          username: message.author.username,
          displayName: message.author.displayName || message.author.username,
          avatar: message.author.avatar
        },
        content: message.content,
        timestamp: message.createdAt,
        reactions: []
      }
    });

  } catch (error) {
    console.error('Send message to conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/dm/conversations/:conversationId/read
// @desc    Mark conversation as read
// @access  Private
router.put('/conversations/:conversationId/read', auth, async (req, res) => {
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

// @route   POST /api/dm/conversations/:conversationId/messages/:messageId/reactions
// @desc    Add reaction to DM message
// @access  Private
router.post('/conversations/:conversationId/messages/:messageId/reactions', auth, [
  body('emoji').isLength({ min: 1, max: 10 }).withMessage('Emoji required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { conversationId, messageId } = req.params;
    const { emoji } = req.body;

    // Check conversation access
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find message
    const message = await DirectMessage.findById(messageId);
    if (!message || message.conversation.toString() !== conversationId) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Add/toggle reaction
    let reaction = message.reactions.find(r => r.emoji === emoji);
    
    if (reaction) {
      const userIndex = reaction.users.indexOf(req.user.id);
      if (userIndex > -1) {
        reaction.users.splice(userIndex, 1);
        if (reaction.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        reaction.users.push(req.user.id);
      }
    } else {
      message.reactions.push({
        emoji,
        users: [req.user.id]
      });
    }

    await message.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`dm_${conversationId}`).emit('dmReactionUpdate', {
        messageId,
        conversationId,
        reactions: message.reactions
      });
    }

    res.json({ reactions: message.reactions });

  } catch (error) {
    console.error('Add DM reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/dm/conversations/:conversationId/messages/:messageId/reactions/:emoji
// @desc    Remove reaction from DM message
// @access  Private
router.delete('/conversations/:conversationId/messages/:messageId/reactions/:emoji', auth, async (req, res) => {
  try {
    const { conversationId, messageId, emoji } = req.params;

    // Check conversation access
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find message
    const message = await DirectMessage.findById(messageId);
    if (!message || message.conversation.toString() !== conversationId) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Remove reaction
    const reaction = message.reactions.find(r => r.emoji === emoji);
    if (reaction) {
      const userIndex = reaction.users.indexOf(req.user.id);
      if (userIndex > -1) {
        reaction.users.splice(userIndex, 1);
        if (reaction.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      }
    }

    await message.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`dm_${conversationId}`).emit('dmReactionUpdate', {
        messageId,
        conversationId,
        reactions: message.reactions
      });
    }

    res.json({ reactions: message.reactions });

  } catch (error) {
    console.error('Remove DM reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
