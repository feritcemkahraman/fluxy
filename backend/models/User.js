const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  avatar: {
    type: String,
    default: null // No default avatar - use initials instead
  },
  displayName: {
    type: String,
    maxlength: [32, 'Display name cannot exceed 32 characters'],
    default: function() {
      return this.username;
    }
  },
  status: {
    type: String,
    enum: ['online', 'idle', 'dnd', 'offline'],
    default: 'offline'
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  pronouns: {
    type: String,
    maxlength: [50, 'Pronouns cannot exceed 50 characters'],
    default: ''
  },
  banner: {
    type: String,
    default: ''
  },
  badges: [{
    type: {
      type: String,
      enum: ['staff', 'partner', 'hypesquad', 'bug_hunter', 'early_supporter', 'verified_bot', 'verified_developer', 'moderator', 'nitro'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      required: true
    },
    color: {
      type: String,
      default: '#5865F2'
    },
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  connections: [{
    type: {
      type: String,
      enum: ['spotify', 'youtube', 'twitch', 'steam', 'github', 'twitter', 'instagram'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    verified: {
      type: Boolean,
      default: false
    },
    public: {
      type: Boolean,
      default: true
    }
  }],
  discriminator: {
    type: String,
    default: function() {
      return Math.floor(1000 + Math.random() * 9000).toString();
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  servers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server'
  }],
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // User Settings
  settings: {
    theme: {
      type: String,
      enum: ['dark', 'light', 'purple', 'blue'],
      default: 'dark'
    },
    glassmorphism: {
      type: Boolean,
      default: true
    },
    notifications: {
      desktop: { type: Boolean, default: true },
      soundEffects: { type: Boolean, default: true },
      messageNotifications: { type: Boolean, default: true },
      callNotifications: { type: Boolean, default: true },
      friendRequestNotifications: { type: Boolean, default: true }
    },
    voice: {
      inputVolume: { type: Number, default: 80, min: 0, max: 100 },
      outputVolume: { type: Number, default: 75, min: 0, max: 100 },
      inputSensitivity: { type: Number, default: 60, min: 0, max: 100 },
      pushToTalk: { type: Boolean, default: false },
      pushToTalkKey: { type: String, default: 'Space' },
      autoGainControl: { type: Boolean, default: true },
      echoCancellation: { type: Boolean, default: true },
      noiseSuppression: { type: Boolean, default: true },
      inputDevice: { type: String, default: 'default' },
      outputDevice: { type: String, default: 'default' }
    },
    privacy: {
      allowDirectMessages: { type: Boolean, default: true },
      enableFriendRequests: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true },
      allowServerInvites: { type: Boolean, default: true },
      dataCollection: { type: Boolean, default: false }
    },
    chat: {
      fontSize: { type: Number, default: 14, min: 10, max: 20 },
      messageDisplayMode: { type: String, enum: ['cozy', 'compact'], default: 'cozy' },
      showTimestamps: { type: Boolean, default: true },
      use24HourTime: { type: Boolean, default: false },
      enableEmojis: { type: Boolean, default: true },
      enableAnimatedEmojis: { type: Boolean, default: true },
      enableSpoilerTags: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Create full username with discriminator
userSchema.virtual('fullUsername').get(function() {
  return `${this.username}#${this.discriminator}`;
});

module.exports = mongoose.model('User', userSchema);
