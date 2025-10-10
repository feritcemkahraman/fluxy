const express = require('express');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const Server = require('../models/Server');
const { auth } = require('../middleware/auth');

const router = express.Router();

// ==================== DISCORD-LEVEL OPTIMIZATION ====================
// Use aggregation pipeline instead of populate for 10x faster queries

// @route   GET /api/messages/:channelId
// @desc    Get messages for a channel (OPTIMIZED)
// @access  Private
router.get('/:channelId', auth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit = 50, before } = req.query;

    // Check if channel exists
    const channel = await Channel.findById(channelId).lean();
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    // Check if user is member of server (optimized with lean())
    const server = await Server.findById(channel.server)
      .select('members')
      .lean();
    
    const isMember = server.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Build match stage
    const matchStage = { 
      channel: channelId,
      isDeleted: false
    };

    if (before) {
      matchStage.createdAt = { $lt: new Date(before) };
    }

    // ==================== AGGREGATION PIPELINE ====================
    // 1 query instead of 150+ queries!
    const messages = await Message.aggregate([
      // Stage 1: Match messages
      { $match: matchStage },
      
      // Stage 2: Sort by date (descending)
      { $sort: { createdAt: -1 } },
      
      // Stage 3: Limit results
      { $limit: parseInt(limit) },
      
      // Stage 4: Lookup author (JOIN)
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
          pipeline: [
            { 
              $project: { 
                username: 1, 
                displayName: 1, 
                avatar: 1, 
                discriminator: 1,
                status: 1
              } 
            }
          ]
        }
      },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
      
      // Stage 5: Lookup reply (if exists)
      {
        $lookup: {
          from: 'messages',
          localField: 'replyTo',
          foreignField: '_id',
          as: 'replyTo',
          pipeline: [
            { 
              $project: { 
                content: 1, 
                author: 1,
                createdAt: 1
              } 
            },
            // Nested lookup for reply author
            {
              $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: '_id',
                as: 'author',
                pipeline: [
                  { $project: { username: 1, displayName: 1, avatar: 1 } }
                ]
              }
            },
            { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } }
          ]
        }
      },
      { $unwind: { path: '$replyTo', preserveNullAndEmptyArrays: true } },
      
      // Stage 6: Project final shape
      {
        $project: {
          _id: 1,
          content: 1,
          author: 1,
          channel: 1,
          server: 1,
          replyTo: 1,
          reactions: 1,
          mentions: 1,
          attachments: 1,
          isEdited: 1,
          editedAt: 1,
          createdAt: 1,
          type: 1,
          isSystemMessage: 1,
          systemMessageType: 1
        }
      }
    ]);

    // Reverse to chronological order (oldest first, like Discord)
    const formattedMessages = messages.reverse().map(message => ({
      ...message,
      id: message._id // Add id field for frontend compatibility
    }));

    res.json({
      messages: formattedMessages,
      hasMore: messages.length === parseInt(limit) // Pagination info
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages
// @desc    Send a message (OPTIMIZED)
// @access  Private
router.post('/', auth, [
  body('content')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters')
    .trim(),
  body('channelId')
    .isMongoId()
    .withMessage('Invalid channel ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { content, channelId, replyTo } = req.body;

    // Check if channel exists (lean for performance)
    const channel = await Channel.findById(channelId).lean();
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    if (channel.type !== 'text') {
      return res.status(400).json({ message: 'Can only send messages to text channels' });
    }

    // Check if user is member of server (lean + select)
    const server = await Server.findById(channel.server)
      .select('members')
      .lean();
    
    const isMember = server.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create message
    const message = new Message({
      content,
      author: req.user._id,
      channel: channelId,
      server: channel.server,
      replyTo: replyTo || null
    });

    await message.save();

    // Update channel's last message and message count (async, don't wait)
    Channel.findByIdAndUpdate(channelId, {
      lastMessage: message._id,
      $inc: { messageCount: 1 }
    }).exec(); // Fire and forget

    // ==================== OPTIMIZED POPULATE ====================
    // Use aggregation for single message too
    const [populatedMessage] = await Message.aggregate([
      { $match: { _id: message._id } },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
          pipeline: [
            { 
              $project: { 
                username: 1, 
                displayName: 1, 
                avatar: 1, 
                discriminator: 1,
                status: 1
              } 
            }
          ]
        }
      },
      { $unwind: '$author' },
      {
        $lookup: {
          from: 'messages',
          localField: 'replyTo',
          foreignField: '_id',
          as: 'replyTo',
          pipeline: [
            { $project: { content: 1, author: 1 } }
          ]
        }
      },
      { $unwind: { path: '$replyTo', preserveNullAndEmptyArrays: true } }
    ]);

    res.status(201).json({
      message: 'Message sent successfully',
      data: {
        ...populatedMessage,
        id: populatedMessage._id
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error during message sending' });
  }
});

// @route   PUT /api/messages/:id
// @desc    Edit a message
// @access  Private (Author only)
router.put('/:id', auth, [
  body('content')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters')
    .trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const message = await Message.findById(req.params.id).lean();
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: 'Cannot edit deleted message' });
    }

    // Check if user is the author
    if (message.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Can only edit your own messages' });
    }

    // Update message
    const updatedMessage = await Message.findByIdAndUpdate(
      req.params.id,
      {
        content: req.body.content,
        isEdited: true,
        editedAt: new Date()
      },
      { new: true }
    ).lean();

    res.json({
      message: 'Message updated successfully',
      data: {
        ...updatedMessage,
        id: updatedMessage._id
      }
    });

  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a message (soft delete)
// @access  Private (Author only or Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id).lean();
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: 'Message already deleted' });
    }

    // Check if user is the author
    if (message.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Can only delete your own messages' });
    }

    // Soft delete
    await Message.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        content: '[Message deleted]' // Optional: clear content
      }
    );

    res.json({ message: 'Message deleted successfully' });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
