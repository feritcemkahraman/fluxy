// Messages Feature Types - Discord Style

/**
 * @typedef {Object} Message
 * @property {string} id - Message ID
 * @property {string} content - Message content
 * @property {User} author - Message author
 * @property {string} channelId - Channel ID
 * @property {string} serverId - Server ID (optional)
 * @property {string} type - Message type (text, image, file, etc.)
 * @property {Date} timestamp - Message timestamp
 * @property {Date} editedAt - Last edit timestamp (optional)
 * @property {Message} replyTo - Replied message (optional)
 * @property {Array<Reaction>} reactions - Message reactions
 * @property {Array<Attachment>} attachments - File attachments
 * @property {boolean} isOptimistic - Optimistic update flag
 * @property {string} status - Message status
 */

/**
 * @typedef {Object} DirectMessage
 * @property {string} id - DM ID
 * @property {string} content - Message content
 * @property {User} author - Message author
 * @property {string} conversationId - Conversation ID
 * @property {Date} timestamp - Message timestamp
 * @property {boolean} isOptimistic - Optimistic update flag
 * @property {string} status - Message status
 */

/**
 * @typedef {Object} Conversation
 * @property {string} id - Conversation ID
 * @property {Array<User>} participants - Conversation participants
 * @property {Message} lastMessage - Last message
 * @property {Date} lastActivity - Last activity timestamp
 * @property {boolean} isGroup - Group conversation flag
 * @property {string} name - Group name (optional)
 * @property {string} icon - Group icon (optional)
 */

/**
 * @typedef {Object} Reaction
 * @property {string} emoji - Reaction emoji
 * @property {Array<string>} users - User IDs who reacted
 * @property {number} count - Reaction count
 */

/**
 * @typedef {Object} Attachment
 * @property {string} id - Attachment ID
 * @property {string} name - File name
 * @property {string} url - File URL
 * @property {number} size - File size in bytes
 * @property {string} type - File MIME type
 * @property {number} width - Image width (optional)
 * @property {number} height - Image height (optional)
 */

/**
 * @typedef {Object} TypingUser
 * @property {string} userId - User ID
 * @property {string} username - Username
 * @property {Date} timestamp - Typing start timestamp
 */

/**
 * @typedef {Object} MessageState
 * @property {Array<Message>} messages - Messages array
 * @property {boolean} isLoading - Loading state
 * @property {boolean} hasMore - More messages available
 * @property {string|null} error - Error message
 * @property {Array<TypingUser>} typingUsers - Currently typing users
 */

/**
 * @typedef {Object} MessageInputState
 * @property {string} content - Input content
 * @property {Array<File>} attachments - Selected files
 * @property {Message|null} replyTo - Message being replied to
 * @property {boolean} isTyping - Typing indicator state
 * @property {boolean} isSending - Sending state
 */
