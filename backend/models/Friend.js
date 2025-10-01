const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'blocked'],
    default: 'pending'
  },
  message: {
    type: String,
    maxlength: 200,
    default: ''
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate requests
friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

// Index for efficient queries
friendRequestSchema.index({ to: 1, status: 1 });
friendRequestSchema.index({ from: 1, status: 1 });

// Static methods
friendRequestSchema.statics.sendRequest = async function(fromUserId, toUserId, message = '') {
  // Check if users exist
  const User = mongoose.model('User');
  const [fromUser, toUser] = await Promise.all([
    User.findById(fromUserId),
    User.findById(toUserId)
  ]);

  if (!fromUser || !toUser) {
    throw new Error('User not found');
  }

  if (fromUserId === toUserId) {
    throw new Error('Cannot send friend request to yourself');
  }

  // Check if request already exists
  const existingRequest = await this.findOne({
    $or: [
      { from: fromUserId, to: toUserId },
      { from: toUserId, to: fromUserId }
    ]
  });

  if (existingRequest) {
    if (existingRequest.status === 'accepted') {
      throw new Error('Already friends');
    } else if (existingRequest.status === 'pending') {
      throw new Error('Friend request already sent');
    } else if (existingRequest.status === 'blocked') {
      throw new Error('Cannot send friend request');
    }
  }

  // Create new friend request
  const friendRequest = new this({
    from: fromUserId,
    to: toUserId,
    message: message.trim(),
    status: 'pending'
  });

  await friendRequest.save();
  return friendRequest;
};

friendRequestSchema.statics.acceptRequest = async function(requestId, userId) {
  const request = await this.findById(requestId);
  
  if (!request) {
    throw new Error('Friend request not found');
  }

  if (request.to.toString() !== userId) {
    throw new Error('Unauthorized to accept this request');
  }

  if (request.status !== 'pending') {
    throw new Error('Request is not pending');
  }

  request.status = 'accepted';
  await request.save();

  return request;
};

friendRequestSchema.statics.declineRequest = async function(requestId, userId) {
  const request = await this.findById(requestId);
  
  if (!request) {
    throw new Error('Friend request not found');
  }

  if (request.to.toString() !== userId) {
    throw new Error('Unauthorized to decline this request');
  }

  if (request.status !== 'pending') {
    throw new Error('Request is not pending');
  }

  request.status = 'declined';
  await request.save();

  return request;
};

friendRequestSchema.statics.getFriends = async function(userId) {
  const friends = await this.find({
    $or: [
      { from: userId, status: 'accepted' },
      { to: userId, status: 'accepted' }
    ]
  })
  .populate('from', 'username avatar discriminator status lastSeen displayName')
  .populate('to', 'username avatar discriminator status lastSeen displayName')
  .sort({ updatedAt: -1 });

  // Map to get the friend user (not the current user)
  return friends.map(friendship => {
    const friend = friendship.from._id.toString() === userId 
      ? friendship.to 
      : friendship.from;
    
    return {
      id: friend._id,
      username: friend.username,
      displayName: friend.displayName,
      avatar: friend.avatar,
      discriminator: friend.discriminator,
      status: friend.status,
      lastSeen: friend.lastSeen,
      friendshipId: friendship._id,
      friendsSince: friendship.updatedAt
    };
  });
};

friendRequestSchema.statics.getPendingRequests = async function(userId) {
  const requests = await this.find({
    to: userId,
    status: 'pending'
  })
  .populate('from', 'username avatar discriminator status lastSeen displayName')
  .sort({ createdAt: -1 });

  return requests.map(request => ({
    id: request._id,
    from: {
      id: request.from._id,
      username: request.from.username,
      displayName: request.from.displayName,
      avatar: request.from.avatar,
      discriminator: request.from.discriminator,
      status: request.from.status,
      lastSeen: request.from.lastSeen
    },
    message: request.message,
    createdAt: request.createdAt
  }));
};

friendRequestSchema.statics.getSentRequests = async function(userId) {
  const requests = await this.find({
    from: userId,
    status: 'pending'
  })
  .populate('to', 'username avatar discriminator status lastSeen displayName')
  .sort({ createdAt: -1 });

  return requests.map(request => ({
    id: request._id,
    to: {
      id: request.to._id,
      username: request.to.username,
      displayName: request.to.displayName,
      avatar: request.to.avatar,
      discriminator: request.to.discriminator,
      status: request.to.status,
      lastSeen: request.to.lastSeen
    },
    message: request.message,
    createdAt: request.createdAt
  }));
};

friendRequestSchema.statics.removeFriend = async function(userId, friendId) {
  const friendship = await this.findOne({
    $or: [
      { from: userId, to: friendId, status: 'accepted' },
      { from: friendId, to: userId, status: 'accepted' }
    ]
  });

  if (!friendship) {
    throw new Error('Friendship not found');
  }

  await friendship.deleteOne();
  return true;
};

friendRequestSchema.statics.blockUser = async function(userId, targetUserId) {
  // Remove existing friendship or request
  await this.deleteMany({
    $or: [
      { from: userId, to: targetUserId },
      { from: targetUserId, to: userId }
    ]
  });

  // Create block entry
  const blockEntry = new this({
    from: userId,
    to: targetUserId,
    status: 'blocked'
  });

  await blockEntry.save();
  return blockEntry;
};

friendRequestSchema.statics.unblockUser = async function(userId, targetUserId) {
  const blockEntry = await this.findOne({
    from: userId,
    to: targetUserId,
    status: 'blocked'
  });

  if (!blockEntry) {
    throw new Error('User is not blocked');
  }

  await blockEntry.deleteOne();
  return true;
};

friendRequestSchema.statics.getBlockedUsers = async function(userId) {
  const blocked = await this.find({
    from: userId,
    status: 'blocked'
  })
  .populate('to', 'username avatar discriminator displayName')
  .sort({ createdAt: -1 });

  return blocked.map(block => ({
    id: block.to._id,
    username: block.to.username,
    displayName: block.to.displayName,
    avatar: block.to.avatar,
    discriminator: block.to.discriminator,
    blockedAt: block.createdAt
  }));
};

// Instance methods
friendRequestSchema.methods.toJSON = function() {
  const request = this.toObject();
  return {
    id: request._id,
    from: request.from,
    to: request.to,
    status: request.status,
    message: request.message,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt
  };
};

module.exports = mongoose.model('Friend', friendRequestSchema);
