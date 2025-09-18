const mongoose = require('mongoose');

// In-memory store for WebSocket connections
const connections = new Map();
const channelSubs = new Map(); // channelId -> Set of connectionIds
const userSubs = new Map(); // userId -> connectionId

// Connection cleanup helper
const cleanupConnection = (connectionId) => {
  connections.delete(connectionId);
  
  // Remove from channel subscriptions
  for (const [channelId, connIds] of channelSubs.entries()) {
    connIds.delete(connectionId);
    if (connIds.size === 0) {
      channelSubs.delete(channelId);
    }
  }
  
  // Remove from user subscriptions
  for (const [userId, connId] of userSubs.entries()) {
    if (connId === connectionId) {
      userSubs.delete(userId);
    }
  }
};

// Broadcast to channel subscribers
const broadcastToChannel = (channelId, message) => {
  const subscribers = channelSubs.get(channelId);
  if (!subscribers) return;
  
  for (const connId of subscribers) {
    const connection = connections.get(connId);
    if (connection && connection.readyState === 1) { // OPEN
      try {
        connection.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending to connection:', error);
        cleanupConnection(connId);
      }
    }
  }
};

// Broadcast to specific user
const sendToUser = (userId, message) => {
  const connectionId = userSubs.get(userId);
  if (!connectionId) return;
  
  const connection = connections.get(connectionId);
  if (connection && connection.readyState === 1) {
    try {
      connection.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending to user:', error);
      cleanupConnection(connectionId);
    }
  }
};

// Connect to MongoDB if not connected
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('MongoDB connected for WebSocket');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    await connectDB();
    
    const { requestContext, body } = event;
    const { connectionId, eventType, routeKey } = requestContext;
    
    switch (eventType) {
      case 'CONNECT':
        return handleConnect(connectionId);
        
      case 'DISCONNECT':
        return handleDisconnect(connectionId);
        
      case 'MESSAGE':
        return handleMessage(connectionId, JSON.parse(body || '{}'));
        
      default:
        return { statusCode: 400, body: 'Unknown event type' };
    }
  } catch (error) {
    console.error('WebSocket handler error:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};

const handleConnect = (connectionId) => {
  console.log('WebSocket connected:', connectionId);
  connections.set(connectionId, { id: connectionId, connectedAt: Date.now() });
  
  return { statusCode: 200, body: 'Connected' };
};

const handleDisconnect = (connectionId) => {
  console.log('WebSocket disconnected:', connectionId);
  cleanupConnection(connectionId);
  
  return { statusCode: 200, body: 'Disconnected' };
};

const handleMessage = async (connectionId, message) => {
  const connection = connections.get(connectionId);
  if (!connection) {
    return { statusCode: 400, body: 'Connection not found' };
  }
  
  try {
    const { type, data } = message;
    
    switch (type) {
      case 'authenticate':
        return handleAuthenticate(connectionId, data);
        
      case 'joinChannel':
        return handleJoinChannel(connectionId, data);
        
      case 'leaveChannel':
        return handleLeaveChannel(connectionId, data);
        
      case 'sendMessage':
        return handleSendMessage(connectionId, data);
        
      case 'typing':
        return handleTyping(connectionId, data);
        
      case 'reaction':
        return handleReaction(connectionId, data);
        
      default:
        return { statusCode: 400, body: 'Unknown message type' };
    }
  } catch (error) {
    console.error('Message handling error:', error);
    return { statusCode: 500, body: 'Message handling failed' };
  }
};

const handleAuthenticate = async (connectionId, data) => {
  const { token } = data;
  
  if (!token) {
    return { statusCode: 401, body: 'Token required' };
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const User = require('./models/User');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return { statusCode: 401, body: 'Invalid token' };
    }
    
    // Store user info with connection
    const connection = connections.get(connectionId);
    connection.user = user;
    connection.authenticated = true;
    userSubs.set(user._id.toString(), connectionId);
    
    // Send authentication success
    const response = {
      type: 'authenticated',
      data: { user: user.toJSON() }
    };
    
    // Note: In a real WebSocket implementation, you'd send this back to the client
    console.log('User authenticated:', user.username);
    
    return { statusCode: 200, body: 'Authenticated' };
  } catch (error) {
    console.error('Authentication error:', error);
    return { statusCode: 401, body: 'Authentication failed' };
  }
};

const handleJoinChannel = (connectionId, data) => {
  const { channelId } = data;
  const connection = connections.get(connectionId);
  
  if (!connection || !connection.authenticated) {
    return { statusCode: 401, body: 'Not authenticated' };
  }
  
  // Add to channel subscription
  if (!channelSubs.has(channelId)) {
    channelSubs.set(channelId, new Set());
  }
  channelSubs.get(channelId).add(connectionId);
  
  // Store current channel in connection
  connection.currentChannel = channelId;
  
  console.log(`User ${connection.user.username} joined channel ${channelId}`);
  
  // Broadcast user joined to channel
  broadcastToChannel(channelId, {
    type: 'userJoinedChannel',
    data: {
      user: connection.user.toJSON(),
      channelId
    }
  });
  
  return { statusCode: 200, body: 'Joined channel' };
};

const handleLeaveChannel = (connectionId, data) => {
  const { channelId } = data;
  const connection = connections.get(connectionId);
  
  if (!connection || !connection.authenticated) {
    return { statusCode: 401, body: 'Not authenticated' };
  }
  
  // Remove from channel subscription
  const subscribers = channelSubs.get(channelId);
  if (subscribers) {
    subscribers.delete(connectionId);
    if (subscribers.size === 0) {
      channelSubs.delete(channelId);
    }
  }
  
  // Clear current channel
  connection.currentChannel = null;
  
  console.log(`User ${connection.user.username} left channel ${channelId}`);
  
  // Broadcast user left to channel
  broadcastToChannel(channelId, {
    type: 'userLeftChannel',
    data: {
      user: connection.user.toJSON(),
      channelId
    }
  });
  
  return { statusCode: 200, body: 'Left channel' };
};

const handleSendMessage = async (connectionId, data) => {
  const connection = connections.get(connectionId);
  
  if (!connection || !connection.authenticated) {
    return { statusCode: 401, body: 'Not authenticated' };
  }
  
  const { channelId, content, serverId } = data;
  
  try {
    const Message = require('./models/Message');
    
    // Save message to database
    const message = new Message({
      content,
      author: connection.user._id,
      channel: channelId,
      server: serverId
    });
    
    await message.save();
    await message.populate('author', 'username displayName avatar discriminator');
    
    // Broadcast new message to channel subscribers
    broadcastToChannel(channelId, {
      type: 'newMessage',
      data: message.toJSON()
    });
    
    console.log(`Message sent by ${connection.user.username} to channel ${channelId}`);
    
    return { statusCode: 200, body: 'Message sent' };
  } catch (error) {
    console.error('Send message error:', error);
    return { statusCode: 500, body: 'Failed to send message' };
  }
};

const handleTyping = (connectionId, data) => {
  const connection = connections.get(connectionId);
  
  if (!connection || !connection.authenticated) {
    return { statusCode: 401, body: 'Not authenticated' };
  }
  
  const { channelId, isTyping } = data;
  
  // Broadcast typing indicator to channel (except sender)
  const subscribers = channelSubs.get(channelId);
  if (subscribers) {
    for (const connId of subscribers) {
      if (connId !== connectionId) {
        const targetConnection = connections.get(connId);
        if (targetConnection && targetConnection.readyState === 1) {
          try {
            const message = {
              type: 'userTyping',
              data: {
                userId: connection.user._id,
                username: connection.user.username,
                channelId,
                isTyping
              }
            };
            // In real implementation, send to WebSocket
            console.log('Typing indicator sent');
          } catch (error) {
            console.error('Error sending typing indicator:', error);
          }
        }
      }
    }
  }
  
  return { statusCode: 200, body: 'Typing indicator sent' };
};

const handleReaction = async (connectionId, data) => {
  const connection = connections.get(connectionId);
  
  if (!connection || !connection.authenticated) {
    return { statusCode: 401, body: 'Not authenticated' };
  }
  
  const { messageId, emoji, channelId } = data;
  
  try {
    const Message = require('./models/Message');
    
    // Find message and update reactions
    const message = await Message.findById(messageId);
    if (!message) {
      return { statusCode: 404, body: 'Message not found' };
    }
    
    // Add or remove reaction logic here
    // (Implementation depends on your Message schema)
    
    // Broadcast reaction update to channel
    broadcastToChannel(channelId, {
      type: 'reactionUpdate',
      data: {
        messageId,
        reactions: message.reactions,
        channelId
      }
    });
    
    return { statusCode: 200, body: 'Reaction updated' };
  } catch (error) {
    console.error('Reaction error:', error);
    return { statusCode: 500, body: 'Failed to update reaction' };
  }
};