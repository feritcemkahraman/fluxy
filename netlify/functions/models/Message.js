const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
    trim: true
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
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String
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
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ server: 1, createdAt: -1 });
messageSchema.index({ author: 1, createdAt: -1 });

// Update reaction count when reactions change
messageSchema.pre('save', function(next) {
  this.reactions.forEach(reaction => {
    reaction.count = reaction.users.length;
  });
  next();
});

module.exports = mongoose.model('Message', messageSchema);
