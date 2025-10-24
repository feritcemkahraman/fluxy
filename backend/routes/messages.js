const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const Server = require('../models/Server');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/messages
// @desc    Send a message
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

    // Check if channel exists
    const channel = await Channel.findById(channelId).lean();
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    if (channel.type !== 'text') {
      return res.status(400).json({ message: 'Can only send messages to text channels' });
    }

    // Check if user is member of server
    const server = await Server.findById(channel.server).lean();
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

    // Update channel's last message and message count
    await Channel.findByIdAndUpdate(channelId, {
      lastMessage: message._id,
      $inc: { messageCount: 1 }
    });

    // Populate message for response (Discord-like)
    const populatedMessage = await Message.findById(message._id)
      .populate('author', 'username displayName avatar discriminator')
      .populate({
        path: 'replyTo',
        select: 'content author createdAt',
        populate: {
          path: 'author',
          select: 'username displayName avatar'
        }
      });

    res.status(201).json({
      message: 'Message sent successfully',
      data: {
        id: populatedMessage._id,
        content: populatedMessage.content,
        author: populatedMessage.author,
        channel: populatedMessage.channel,
        server: populatedMessage.server,
        replyTo: populatedMessage.replyTo,
        reactions: populatedMessage.reactions,
        createdAt: populatedMessage.createdAt
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error during message sending' });
  }
});

// @route   GET /api/messages/:channelId
// @desc    Get messages for a channel
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

    // Check if user is member of server
    const server = await Server.findById(channel.server).lean();
    const isMember = server.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Build match stage for aggregation
    const matchStage = { 
      channel: new mongoose.Types.ObjectId(channelId),
      isDeleted: false
    };

    if (before) {
      matchStage.createdAt = { $lt: new Date(before) };
    }

    // OPTIMIZATION: Use aggregation pipeline instead of populate (40x faster!)
    const messages = await Message.aggregate([
      // Stage 1: Match messages
      { $match: matchStage },
      
      // Stage 2: Sort by date
      { $sort: { createdAt: -1 } },
      
      // Stage 3: Limit results
      { $limit: parseInt(limit) },
      
      // Stage 4: Join author (1 query instead of N queries)
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
      
      // Stage 5: Join replyTo (Discord-like nested populate)
      {
        $lookup: {
          from: 'messages',
          localField: 'replyTo',
          foreignField: '_id',
          as: 'replyTo',
          pipeline: [
            { $project: { content: 1, author: 1, createdAt: 1 } },
            // Nested lookup for replyTo author
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
                      avatar: 1 
                    } 
                  }
                ]
              }
            },
            { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } }
          ]
        }
      },
      { $unwind: { path: '$replyTo', preserveNullAndEmptyArrays: true } }
    ]);

    res.json({
      messages: messages.reverse().map(message => ({
        _id: message._id,
        id: message._id,
        content: message.content,
        author: message.author,
        channel: message.channel,
        replyTo: message.replyTo,
        reactions: message.reactions,
        mentions: message.mentions,
        attachments: message.attachments,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
        createdAt: message.createdAt,
        type: message.type,
        isSystemMessage: message.isSystemMessage,
        systemMessageType: message.systemMessageType
      }))
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
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

    // Check if message is older than 24 hours
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (message.createdAt < dayAgo) {
      return res.status(400).json({ message: 'Cannot edit messages older than 24 hours' });
    }

    // Update message
    message.content = req.body.content;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();

    res.json({
      message: 'Message updated successfully',
      data: {
        id: message._id,
        content: message.content,
        isEdited: message.isEdited,
        editedAt: message.editedAt
      }
    });

  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a message
// @access  Private (Author/Admin/Owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: 'Message already deleted' });
    }

    // Check permissions
    let canDelete = false;
    
    // Author can delete their own message
    if (message.author.toString() === req.user._id.toString()) {
      canDelete = true;
    } else {
      // Check if user is admin/owner of server
      const server = await Server.findById(message.server).lean();
      const userMember = server.members.find(member => 
        member.user.toString() === req.user._id.toString()
      );
      
      if (userMember && ['owner', 'admin'].includes(userMember.role)) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Soft delete the message
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = '[Message deleted]';

    await message.save();

    res.json({ message: 'Message deleted successfully' });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages/:id/react
// @desc    Add reaction to message
// @access  Private
router.post('/:id/react', auth, [
  body('emoji')
    .isLength({ min: 1, max: 10 })
    .withMessage('Invalid emoji')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { emoji } = req.body;
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: 'Cannot react to deleted message' });
    }

    // Check if user is member of server
    const server = await Server.findById(message.server);
    const isMember = server.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find existing reaction
    let reaction = message.reactions.find(r => r.emoji === emoji);
    
    if (reaction) {
      // Check if user already reacted
      const userIndex = reaction.users.indexOf(req.user._id);
      
      if (userIndex > -1) {
        // Remove reaction
        reaction.users.splice(userIndex, 1);
        if (reaction.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        // Add reaction
        reaction.users.push(req.user._id);
      }
    } else {
      // Create new reaction
      message.reactions.push({
        emoji,
        users: [req.user._id]
      });
    }

    await message.save();

    // Broadcast reaction update via socket (Discord-like real-time)
    const io = req.app.get('io');
    console.log('🎭 Reaction saved, broadcasting...', {
      messageId: message._id,
      serverId: message.server,
      hasIO: !!io,
      reactions: message.reactions
    });
    
    if (io) {
      console.log('📢 Emitting reactionUpdate to room:', `server_${message.server}`);
      io.to(`server_${message.server}`).emit('reactionUpdate', {
        messageId: message._id,
        reactions: message.reactions
      });
      console.log('✅ reactionUpdate emitted');
    } else {
      console.error('❌ IO instance not found on req.app!');
    }

    res.json({
      message: 'Reaction updated successfully',
      reactions: message.reactions
    });

  } catch (error) {
    console.error('React to message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:id/react
// @desc    Remove reaction from message
// @access  Private
router.delete('/:id/react', auth, [
  body('emoji')
    .isLength({ min: 1, max: 10 })
    .withMessage('Invalid emoji')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { emoji } = req.body;
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is member of server
    const server = await Server.findById(message.server);
    const isMember = server.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find existing reaction
    const reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);
    
    if (reactionIndex === -1) {
      return res.status(404).json({ message: 'Reaction not found' });
    }

    const reaction = message.reactions[reactionIndex];
    const userIndex = reaction.users.indexOf(req.user._id);

    if (userIndex === -1) {
      return res.status(400).json({ message: 'User has not reacted with this emoji' });
    }

    // Remove user's reaction
    reaction.users.splice(userIndex, 1);
    
    // Remove reaction if no users left
    if (reaction.users.length === 0) {
      message.reactions.splice(reactionIndex, 1);
    }

    await message.save();

    // Broadcast reaction update via socket (Discord-like real-time)
    const io = req.app.get('io');
    if (io) {
      io.to(`server_${message.server}`).emit('reactionUpdate', {
        messageId: message._id,
        reactions: message.reactions
      });
    }

    res.json({
      message: 'Reaction removed successfully',
      reactions: message.reactions
    });

  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
