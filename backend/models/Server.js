const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Server name is required'],
    trim: true,
    minlength: [1, 'Server name must be at least 1 character'],
    maxlength: [100, 'Server name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  icon: {
    type: String,
    default: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    roles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    }],
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  channels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
  }],
  inviteCode: {
    type: String,
    unique: true,
    default: function() {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  memberCount: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// OPTIMIZED INDEXES (Discord-level performance)
serverSchema.index({ 'members.user': 1 }); // Critical for permission checks
serverSchema.index({ ownerId: 1 }); // For owner queries
serverSchema.index({ createdAt: -1 }); // For server listing

// Update member count when members array changes
serverSchema.pre('save', function(next) {
  this.memberCount = this.members.length;
  next();
});

// Virtual for online member count (will be calculated in real-time)
serverSchema.virtual('onlineCount').get(function() {
  // This will be populated by the application logic
  return 0;
});

module.exports = mongoose.model('Server', serverSchema);
