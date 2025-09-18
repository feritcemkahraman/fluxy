const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Appearance settings
  theme: {
    type: String,
    enum: ['dark', 'light', 'purple', 'blue'],
    default: 'dark'
  },
  glassmorphism: {
    type: Boolean,
    default: true
  },
  // Notification settings
  notifications: {
    desktop: { type: Boolean, default: true },
    soundEffects: { type: Boolean, default: true },
    messageNotifications: { type: Boolean, default: true },
    callNotifications: { type: Boolean, default: true },
    friendRequestNotifications: { type: Boolean, default: true }
  },
  // Voice & Video settings
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
  // Privacy settings
  privacy: {
    allowDirectMessages: { type: Boolean, default: true },
    enableFriendRequests: { type: Boolean, default: true },
    showOnlineStatus: { type: Boolean, default: true },
    allowServerInvites: { type: Boolean, default: true },
    dataCollection: { type: Boolean, default: false }
  },
  // Chat settings
  chat: {
    fontSize: { type: Number, default: 14, min: 10, max: 24 },
    messageDisplayMode: { 
      type: String, 
      enum: ['cozy', 'compact'], 
      default: 'cozy' 
    },
    showTimestamps: { type: Boolean, default: true },
    use24HourTime: { type: Boolean, default: false },
    enableEmojis: { type: Boolean, default: true },
    enableAnimatedEmojis: { type: Boolean, default: true },
    enableSpoilerTags: { type: Boolean, default: true }
  },
  // Language and region
  locale: {
    language: { type: String, default: 'en-US' },
    timezone: { type: String, default: 'UTC' },
    dateFormat: { 
      type: String, 
      enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'], 
      default: 'MM/DD/YYYY' 
    }
  },
  // Accessibility
  accessibility: {
    reducedMotion: { type: Boolean, default: false },
    highContrast: { type: Boolean, default: false },
    screenReaderSupport: { type: Boolean, default: false },
    keyboardNavigation: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Static method to create default settings for a user
userSettingsSchema.statics.createDefaultSettings = function(userId) {
  return this.create({
    user: userId,
    theme: 'dark',
    glassmorphism: true,
    notifications: {
      desktop: true,
      soundEffects: true,
      messageNotifications: true,
      callNotifications: true,
      friendRequestNotifications: true
    },
    voice: {
      inputVolume: 80,
      outputVolume: 75,
      inputSensitivity: 60,
      pushToTalk: false,
      pushToTalkKey: 'Space',
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
      inputDevice: 'default',
      outputDevice: 'default'
    },
    privacy: {
      allowDirectMessages: true,
      enableFriendRequests: true,
      showOnlineStatus: true,
      allowServerInvites: true,
      dataCollection: false
    },
    chat: {
      fontSize: 14,
      messageDisplayMode: 'cozy',
      showTimestamps: true,
      use24HourTime: false,
      enableEmojis: true,
      enableAnimatedEmojis: true,
      enableSpoilerTags: true
    },
    locale: {
      language: 'en-US',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY'
    },
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      screenReaderSupport: false,
      keyboardNavigation: false
    }
  });
};

// Method to get settings with defaults
userSettingsSchema.methods.getSettingsWithDefaults = function() {
  const defaultSettings = {
    theme: 'dark',
    glassmorphism: true,
    notifications: {
      desktop: true,
      soundEffects: true,
      messageNotifications: true,
      callNotifications: true,
      friendRequestNotifications: true
    },
    voice: {
      inputVolume: 80,
      outputVolume: 75,
      inputSensitivity: 60,
      pushToTalk: false,
      pushToTalkKey: 'Space',
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
      inputDevice: 'default',
      outputDevice: 'default'
    },
    privacy: {
      allowDirectMessages: true,
      enableFriendRequests: true,
      showOnlineStatus: true,
      allowServerInvites: true,
      dataCollection: false
    },
    chat: {
      fontSize: 14,
      messageDisplayMode: 'cozy',
      showTimestamps: true,
      use24HourTime: false,
      enableEmojis: true,
      enableAnimatedEmojis: true,
      enableSpoilerTags: true
    },
    locale: {
      language: 'en-US',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY'
    },
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      screenReaderSupport: false,
      keyboardNavigation: false
    }
  };

  // Merge with defaults for any missing fields
  const settings = this.toObject();
  return {
    ...defaultSettings,
    ...settings,
    notifications: { ...defaultSettings.notifications, ...settings.notifications },
    voice: { ...defaultSettings.voice, ...settings.voice },
    privacy: { ...defaultSettings.privacy, ...settings.privacy },
    chat: { ...defaultSettings.chat, ...settings.chat },
    locale: { ...defaultSettings.locale, ...settings.locale },
    accessibility: { ...defaultSettings.accessibility, ...settings.accessibility }
  };
};

module.exports = mongoose.model('UserSettings', userSettingsSchema);
