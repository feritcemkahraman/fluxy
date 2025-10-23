import { MESSAGE_ERRORS } from '../constants';

/**
 * Message Service - Discord Style
 * Centralized service for all message-related API calls
 */
class MessageService {
  constructor() {
    // Use environment variable or production fallback
    const apiUrl = process.env.REACT_APP_API_URL || 
      (window.location.hostname.includes('localhost') 
        ? 'http://localhost:5000' 
        : 'https://api.fluxy.com.tr');
    this.baseURL = apiUrl + '/api';
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('token');

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error(`❌ API Error [${endpoint}]:`, error);
      return { 
        success: false, 
        error: this.mapErrorMessage(error.message) 
      };
    }
  }

  /**
   * Map server errors to user-friendly messages
   */
  mapErrorMessage(errorMessage) {
    if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
      return MESSAGE_ERRORS.NETWORK_ERROR;
    }
    if (errorMessage.includes('413') || errorMessage.includes('too large')) {
      return MESSAGE_ERRORS.FILE_TOO_LARGE;
    }
    if (errorMessage.includes('415') || errorMessage.includes('unsupported')) {
      return MESSAGE_ERRORS.UNSUPPORTED_FILE;
    }
    return MESSAGE_ERRORS.SEND_FAILED;
  }

  /**
   * Get channel messages
   */
  async getChannelMessages(channelId, options = {}) {
    const { limit = 50, offset = 0, before = null } = options;
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...(before && { before })
    });

    return await this.makeRequest(`/channels/${channelId}/messages?${params}`);
  }

  /**
   * Send message to channel
   */
  async sendMessage(channelId, messageData) {
    const { content, type = 'text', replyTo, attachments = [] } = messageData;

    // Handle file attachments
    if (attachments.length > 0) {
      return await this.sendMessageWithFiles(channelId, {
        content,
        type,
        replyTo,
        attachments
      });
    }

    return await this.makeRequest(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        type,
        replyTo
      })
    });
  }

  /**
   * Send message with file attachments
   */
  async sendMessageWithFiles(channelId, messageData) {
    const { content, type, replyTo, attachments } = messageData;
    const formData = new FormData();

    formData.append('content', content || '');
    formData.append('type', type);
    if (replyTo) {
      formData.append('replyTo', replyTo);
    }

    // Add files
    attachments.forEach((file, index) => {
      formData.append(`files`, file);
    });

    const token = localStorage.getItem('token');
    const url = `${this.baseURL}/channels/${channelId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Send message with files error:', error);
      return { 
        success: false, 
        error: this.mapErrorMessage(error.message) 
      };
    }
  }

  /**
   * Edit message
   */
  async editMessage(messageId, content) {
    return await this.makeRequest(`/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content })
    });
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId) {
    return await this.makeRequest(`/messages/${messageId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Add reaction to message
   */
  async addReaction(messageId, emoji) {
    return await this.makeRequest(`/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji })
    });
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId, emoji) {
    return await this.makeRequest(`/messages/${messageId}/reactions/${emoji}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get direct messages for conversation
   */
  async getDirectMessages(conversationId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    return await this.makeRequest(`/dm/conversations/${conversationId}/messages?${params}`);
  }

  /**
   * Send direct message
   */
  async sendDirectMessage(messageData) {
    const { content, recipientId, conversationId, attachments = [] } = messageData;

    // Handle file attachments
    if (attachments.length > 0) {
      return await this.sendDirectMessageWithFiles(messageData);
    }

    return await this.makeRequest('/dm/send', {
      method: 'POST',
      body: JSON.stringify({
        content,
        userId: recipientId  // Backend expects 'userId', not 'recipientId'
      })
    });
  }

  /**
   * Send direct message with files
   */
  async sendDirectMessageWithFiles(messageData) {
    const { content, recipientId, conversationId, attachments } = messageData;
    const formData = new FormData();

    formData.append('content', content || '');
    formData.append('userId', recipientId);  // Backend expects 'userId'

    // Add files
    attachments.forEach((file) => {
      formData.append('files', file);
    });

    const token = localStorage.getItem('token');
    const url = `${this.baseURL}/dm/send`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Send DM with files error:', error);
      return { 
        success: false, 
        error: this.mapErrorMessage(error.message) 
      };
    }
  }

  /**
   * Get conversations list
   */
  async getConversations() {
    return await this.makeRequest('/dm/conversations');
  }

  /**
   * Create or get conversation with user
   */
  async getOrCreateConversation(recipientId) {
    return await this.makeRequest('/dm/conversations', {
      method: 'POST',
      body: JSON.stringify({ recipientId })
    });
  }

  /**
   * Search messages
   */
  async searchMessages(query, options = {}) {
    const { channelId, serverId, limit = 25 } = options;
    
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      ...(channelId && { channelId }),
      ...(serverId && { serverId })
    });

    return await this.makeRequest(`/messages/search?${params}`);
  }
}

// Export singleton instance
export const messageService = new MessageService();
