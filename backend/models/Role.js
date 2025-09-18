const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    trim: true,
    minlength: [1, 'Role name must be at least 1 character'],
    maxlength: [50, 'Role name cannot exceed 50 characters']
  },
  color: {
    type: String,
    default: '#99AAB5',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format']
  },
  permissions: {
    // General permissions
    administrator: { type: Boolean, default: false },
    manageServer: { type: Boolean, default: false },
    manageRoles: { type: Boolean, default: false },
    manageChannels: { type: Boolean, default: false },
    kickMembers: { type: Boolean, default: false },
    banMembers: { type: Boolean, default: false },
    createInstantInvite: { type: Boolean, default: true },
    changeNickname: { type: Boolean, default: true },
    manageNicknames: { type: Boolean, default: false },
    
    // Text channel permissions
    sendMessages: { type: Boolean, default: true },
    sendTTSMessages: { type: Boolean, default: false },
    manageMessages: { type: Boolean, default: false },
    embedLinks: { type: Boolean, default: true },
    attachFiles: { type: Boolean, default: true },
    readMessageHistory: { type: Boolean, default: true },
    mentionEveryone: { type: Boolean, default: false },
    useExternalEmojis: { type: Boolean, default: true },
    addReactions: { type: Boolean, default: true },
    
    // Voice channel permissions
    connect: { type: Boolean, default: true },
    speak: { type: Boolean, default: true },
    muteMembers: { type: Boolean, default: false },
    deafenMembers: { type: Boolean, default: false },
    moveMembers: { type: Boolean, default: false },
    useVoiceActivation: { type: Boolean, default: true },
    prioritySpeaker: { type: Boolean, default: false }
  },
  position: {
    type: Number,
    default: 0
  },
  hoist: {
    type: Boolean,
    default: false
  },
  mentionable: {
    type: Boolean,
    default: false
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
roleSchema.index({ server: 1, position: 1 });
roleSchema.index({ server: 1, isDefault: 1 });

// Static method to create default @everyone role
roleSchema.statics.createDefaultRole = function(serverId) {
  return this.create({
    name: '@everyone',
    color: '#99AAB5',
    permissions: {
      administrator: false,
      manageServer: false,
      manageRoles: false,
      manageChannels: false,
      kickMembers: false,
      banMembers: false,
      createInstantInvite: true,
      changeNickname: true,
      manageNicknames: false,
      sendMessages: true,
      sendTTSMessages: false,
      manageMessages: false,
      embedLinks: true,
      attachFiles: true,
      readMessageHistory: true,
      mentionEveryone: false,
      useExternalEmojis: true,
      addReactions: true,
      connect: true,
      speak: true,
      muteMembers: false,
      deafenMembers: false,
      moveMembers: false,
      useVoiceActivation: true,
      prioritySpeaker: false
    },
    position: 0,
    server: serverId,
    isDefault: true,
    hoist: false,
    mentionable: false
  });
};

// Method to check if role has permission
roleSchema.methods.hasPermission = function(permission) {
  if (this.permissions.administrator) return true;
  return this.permissions[permission] || false;
};

module.exports = mongoose.model('Role', roleSchema);
