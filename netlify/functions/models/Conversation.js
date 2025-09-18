const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  type: {
    type: String,
    enum: ['direct', 'group'],
    default: 'direct'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DirectMessage'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  // For group conversations
  name: {
    type: String,
    maxlength: 100
  },
  icon: {
    type: String
  },
  // Read status for each participant
  readStatus: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for faster queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
