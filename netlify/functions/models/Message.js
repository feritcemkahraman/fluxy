const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: function() {
      return this.type !== 'dm';
    }
  },
  type: {
    type: String,
    enum: ['text', 'file', 'image', 'dm'],
    default: 'text'
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimetype: String
  }],
  reactions: [{
    emoji: {
      type: String,
      required: true
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    count: {
      type: Number,
      default: 0
    }
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ server: 1, createdAt: -1 });
messageSchema.index({ author: 1, createdAt: -1 });

// Populate author info by default
messageSchema.pre(/^find/, function(next) {
  this.populate('author', 'username displayName avatar discriminator');
  next();
});

module.exports = mongoose.model('Message', messageSchema);