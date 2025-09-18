const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Channel name is required'],
    trim: true,
    minlength: [1, 'Channel name must be at least 1 character'],
    maxlength: [100, 'Channel name cannot exceed 100 characters']
  },
  type: {
    type: String,
    enum: ['text', 'voice'],
    required: true,
    default: 'text'
  },
  description: {
    type: String,
    maxlength: [1024, 'Description cannot exceed 1024 characters'],
    default: ''
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  allowedRoles: [{
    type: String,
    enum: ['owner', 'admin', 'moderator', 'member']
  }],
  // For voice channels
  userLimit: {
    type: Number,
    default: 0, // 0 means no limit
    min: 0,
    max: 99
  },
  connectedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isMuted: {
      type: Boolean,
      default: false
    },
    isDeafened: {
      type: Boolean,
      default: false
    }
  }],
  // For text channels
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  messageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
channelSchema.index({ server: 1, position: 1 });
channelSchema.index({ server: 1, type: 1 });

module.exports = mongoose.model('Channel', channelSchema);
