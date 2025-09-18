const mongoose = require('mongoose');

const serverTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    minlength: [1, 'Template name must be at least 1 character'],
    maxlength: [50, 'Template name cannot exceed 50 characters']
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
  category: {
    type: String,
    enum: [
      'gaming',
      'education',
      'community',
      'music',
      'art',
      'business',
      'technology',
      'anime',
      'other'
    ],
    default: 'other'
  },
  // Template structure
  template: {
    // Server settings
    server: {
      name: { type: String, required: true },
      description: { type: String, default: '' },
      icon: { type: String, default: '' },
      isPublic: { type: Boolean, default: true },
      inviteCode: { type: String, default: '' }
    },
    // Channels structure
    channels: [{
      name: { type: String, required: true },
      type: {
        type: String,
        enum: ['text', 'voice'],
        default: 'text'
      },
      description: { type: String, default: '' },
      position: { type: Number, default: 0 },
      permissions: {
        // Override permissions for this channel
        overrides: [{
          roleId: { type: String, required: true },
          allow: { type: Number, default: 0 },
          deny: { type: Number, default: 0 }
        }]
      }
    }],
    // Roles structure
    roles: [{
      name: { type: String, required: true },
      color: { type: String, default: '#99AAB5' },
      permissions: {
        administrator: { type: Boolean, default: false },
        manageServer: { type: Boolean, default: false },
        manageRoles: { type: Boolean, default: false },
        manageChannels: { type: Boolean, default: false },
        kickMembers: { type: Boolean, default: false },
        banMembers: { type: Boolean, default: false },
        createInstantInvite: { type: Boolean, default: true },
        changeNickname: { type: Boolean, default: true },
        manageNicknames: { type: Boolean, default: false },
        sendMessages: { type: Boolean, default: true },
        sendTTSMessages: { type: Boolean, default: false },
        manageMessages: { type: Boolean, default: false },
        embedLinks: { type: Boolean, default: true },
        attachFiles: { type: Boolean, default: true },
        readMessageHistory: { type: Boolean, default: true },
        mentionEveryone: { type: Boolean, default: false },
        useExternalEmojis: { type: Boolean, default: true },
        addReactions: { type: Boolean, default: true },
        connect: { type: Boolean, default: true },
        speak: { type: Boolean, default: true },
        muteMembers: { type: Boolean, default: false },
        deafenMembers: { type: Boolean, default: false },
        moveMembers: { type: Boolean, default: false },
        useVoiceActivation: { type: Boolean, default: true },
        prioritySpeaker: { type: Boolean, default: false }
      },
      position: { type: Number, default: 0 },
      hoist: { type: Boolean, default: false },
      mentionable: { type: Boolean, default: false }
    }],
    // Default messages for welcome channel
    welcomeMessages: [{
      content: { type: String, required: true },
      author: { type: String, default: 'Fluxy Bot' },
      delay: { type: Number, default: 0 } // Delay in seconds after server creation
    }]
  },
  // Template metadata
  isPublic: {
    type: Boolean,
    default: true
  },
  isOfficial: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true
});

// Indexes
serverTemplateSchema.index({ category: 1, isPublic: 1 });
serverTemplateSchema.index({ createdBy: 1 });
serverTemplateSchema.index({ isOfficial: 1 });
serverTemplateSchema.index({ usageCount: -1 });

// Static method to get popular templates
serverTemplateSchema.statics.getPopular = function(limit = 10) {
  return this.find({ isPublic: true })
    .sort({ usageCount: -1 })
    .limit(limit)
    .populate('createdBy', 'username avatar');
};

// Static method to get templates by category
serverTemplateSchema.statics.getByCategory = function(category, limit = 20) {
  return this.find({ category, isPublic: true })
    .sort({ usageCount: -1 })
    .limit(limit)
    .populate('createdBy', 'username avatar');
};

// Method to increment usage count
serverTemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

module.exports = mongoose.model('ServerTemplate', serverTemplateSchema);
