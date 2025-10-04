/**
 * Message Normalizer Service - Discord Style
 * Centralizes all message normalization logic
 */

/**
 * Normalize author from various formats
 * @param {Object} message - Raw message from backend
 * @param {Array} serverMembers - Current server members
 * @returns {Object} Normalized author object
 */
export const normalizeAuthor = (message, serverMembers = []) => {
  if (!message) return null;

  // Case 1: Author is already a populated object - USE IT DIRECTLY!
  if (message.author && typeof message.author === 'object' && message.author.username) {
    return {
      _id: message.author._id || message.author.id,
      id: message.author._id || message.author.id,
      username: message.author.username,
      displayName: message.author.displayName || message.author.username,
      avatar: message.author.avatar,
      discriminator: message.author.discriminator,
      status: message.author.status
    };
  }

  // Case 2: Author is just an ID string - resolve from server members
  const authorId = message.author || message.authorId;
  
  if (authorId && serverMembers.length > 0) {
    const member = serverMembers.find(m => {
      const memberId = m.user?._id || m.user?.id || m._id || m.id;
      return memberId?.toString() === authorId?.toString();
    });

    if (member?.user) {
      return {
        _id: member.user._id || member.user.id,
        id: member.user._id || member.user.id,
        username: member.user.username,
        displayName: member.user.displayName || member.user.username,
        avatar: member.user.avatar,
        discriminator: member.user.discriminator,
        status: member.user.status
      };
    }
  }

  // Case 3: Fallback - return minimal author object
  return {
    _id: authorId,
    id: authorId,
    username: 'Unknown User',
    displayName: 'Unknown User',
    avatar: null,
    discriminator: null,
    status: 'offline'
  };
};

/**
 * Normalize a single message
 * @param {Object} rawMessage - Raw message from backend or socket
 * @param {Array} serverMembers - Current server members
 * @returns {Object} Normalized message
 */
export const normalizeMessage = (rawMessage, serverMembers = []) => {
  if (!rawMessage) return null;

  const normalizedAuthor = normalizeAuthor(rawMessage, serverMembers);
  const messageId = rawMessage._id || rawMessage.id;
  const channelId = rawMessage.channel?._id || rawMessage.channel || rawMessage.channelId;
  const serverId = rawMessage.server?._id || rawMessage.server || rawMessage.serverId;

  return {
    _id: messageId,
    id: messageId,
    content: rawMessage.content,
    author: normalizedAuthor,
    channel: channelId,
    channelId: channelId,
    server: serverId,
    serverId: serverId,
    type: rawMessage.type || 'text',
    isSystemMessage: rawMessage.isSystemMessage || rawMessage.type === 'system',
    systemMessageType: rawMessage.systemMessageType,
    timestamp: rawMessage.timestamp || rawMessage.createdAt || new Date().toISOString(),
    createdAt: rawMessage.createdAt || rawMessage.timestamp || new Date().toISOString(),
    updatedAt: rawMessage.updatedAt,
    reactions: rawMessage.reactions || [],
    attachments: rawMessage.attachments || [],
    mentions: rawMessage.mentions || [],
    replyTo: rawMessage.replyTo,
    isEdited: rawMessage.isEdited || false,
    isDeleted: rawMessage.isDeleted || false,
    isOptimistic: rawMessage.isOptimistic || false,
    status: rawMessage.status || 'sent'
  };
};

/**
 * Normalize an array of messages
 * @param {Array} messages - Array of raw messages
 * @param {Array} serverMembers - Current server members
 * @returns {Array} Array of normalized messages
 */
export const normalizeMessages = (messages, serverMembers = []) => {
  if (!Array.isArray(messages)) return [];
  return messages.map(msg => normalizeMessage(msg, serverMembers)).filter(Boolean);
};

/**
 * Check if two messages are duplicates
 * @param {Object} msg1 - First message
 * @param {Object} msg2 - Second message
 * @returns {Boolean} True if messages are duplicates
 */
export const isDuplicateMessage = (msg1, msg2) => {
  if (!msg1 || !msg2) return false;
  
  const id1 = msg1._id || msg1.id;
  const id2 = msg2._id || msg2.id;
  
  // Same ID = duplicate
  if (id1 && id2 && id1 === id2) return true;
  
  // Same content + author + recent timestamp = likely duplicate (optimistic vs real)
  if (msg1.content === msg2.content && 
      msg1.author?.id === msg2.author?.id &&
      msg1.timestamp && msg2.timestamp) {
    const timeDiff = Math.abs(new Date(msg1.timestamp) - new Date(msg2.timestamp));
    return timeDiff < 5000; // 5 seconds threshold
  }
  
  return false;
};

/**
 * Merge new messages with existing messages, removing duplicates
 * @param {Array} existingMessages - Current messages
 * @param {Array} newMessages - New messages to add
 * @returns {Array} Merged messages without duplicates
 */
export const mergeMessages = (existingMessages, newMessages) => {
  if (!Array.isArray(existingMessages)) existingMessages = [];
  if (!Array.isArray(newMessages)) newMessages = [];
  
  const merged = [...existingMessages];
  
  for (const newMsg of newMessages) {
    const isDuplicate = merged.some(existingMsg => 
      isDuplicateMessage(existingMsg, newMsg)
    );
    
    if (!isDuplicate) {
      merged.push(newMsg);
    }
  }
  
  // Sort by timestamp (oldest first)
  return merged.sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
};

/**
 * Create an optimistic message for instant UI feedback
 * @param {Object} params - Message parameters
 * @returns {Object} Optimistic message
 */
export const createOptimisticMessage = ({ content, author, channelId, serverId }) => {
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    _id: tempId,
    id: tempId,
    content,
    author: {
      _id: author._id || author.id,
      id: author._id || author.id,
      username: author.username,
      displayName: author.displayName || author.username,
      avatar: author.avatar,
      discriminator: author.discriminator,
      status: author.status
    },
    channel: channelId,
    channelId: channelId,
    server: serverId,
    serverId: serverId,
    type: 'text',
    isSystemMessage: false,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    reactions: [],
    attachments: [],
    mentions: [],
    isOptimistic: true,
    status: 'sending'
  };
};

export default {
  normalizeAuthor,
  normalizeMessage,
  normalizeMessages,
  isDuplicateMessage,
  mergeMessages,
  createOptimisticMessage
};
