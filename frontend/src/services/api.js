/**
 * Fluxy API Service
 * Discord-like modern API layer using native Fetch API
 * 
 * Features:
 * - Native fetch (no axios dependency)
 * - Automatic token injection
 * - Clean error handling
 * - Electron and web compatible
 * 
 * @module api
 */

import { devLog } from '../utils/devLogger';

/**
 * Get API base URL based on environment
 * @returns {string} API base URL
 */
const getApiBaseUrl = () => {
  // Dev mode: Always use localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  
  // Electron production
  const isElectron = window.electronAPI || window.isElectron || window.location.protocol === 'file:';
  if (isElectron) {
    return 'https://api.fluxy.com.tr/api';
  }
  
  // Web production
  return process.env.REACT_APP_API_URL || 'https://api.fluxy.com.tr/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Simple fetch wrapper with automatic auth and error handling
 * @param {string} endpoint - API endpoint (e.g., '/auth/login')
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>} Response data
 * @throws {Error} On HTTP errors or network failures
 */
const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    // Handle 401 - token expired/invalid
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.hash = '#/';
      throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    
    return data;
  } catch (error) {
    devLog.error('API Error:', error);
    throw error;
  }
};

// Auth API (Discord-like)
export const authAPI = {
  register: async (userData) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  },
  
  login: async (credentials) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  },
  
  logout: async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userStatus');
    
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Ignore logout errors
    }
  },
  
  getMe: () => apiFetch('/auth/me'),
};

// Server API
export const serverAPI = {
  getServers: () => apiFetch('/servers'),
  discoverServers: () => apiFetch('/servers/discover'),
  createServer: (serverData) => apiFetch('/servers', {
    method: 'POST',
    body: JSON.stringify(serverData),
  }),
  getServer: (serverId) => apiFetch(`/servers/${serverId}`),
  updateServer: (serverId, serverData) => apiFetch(`/servers/${serverId}`, {
    method: 'PUT',
    body: JSON.stringify(serverData),
  }),
  deleteServer: (serverId) => apiFetch(`/servers/${serverId}`, { method: 'DELETE' }),
  joinServer: (serverId, inviteCode = null) => apiFetch(`/servers/${serverId}/join`, {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  }),
  joinServerByInvite: (inviteCode) => apiFetch('/servers/join-by-invite', {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  }),
  leaveServer: (serverId) => apiFetch(`/servers/${serverId}/leave`, { method: 'DELETE' }),
  getServerMembers: (serverId) => apiFetch(`/servers/${serverId}/members`),
  kickMember: (serverId, userId, reason) => apiFetch(`/servers/${serverId}/kick/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),
  banMember: (serverId, userId, banData) => apiFetch(`/servers/${serverId}/ban/${userId}`, {
    method: 'POST',
    body: JSON.stringify(banData),
  }),
  unbanMember: (serverId, userId) => apiFetch(`/servers/${serverId}/ban/${userId}`, { method: 'DELETE' }),
  getBannedUsers: (serverId) => apiFetch(`/servers/${serverId}/bans`),
  createInvite: (serverId) => apiFetch(`/servers/${serverId}/invite`, {
    method: 'POST',
    body: JSON.stringify({}),
  }),
};

// Channel API
export const channelAPI = {
  getChannels: (serverId) => apiFetch(`/channels/${serverId}`),
  createChannel: (channelData) => apiFetch('/channels', {
    method: 'POST',
    body: JSON.stringify(channelData),
  }),
  updateChannel: (channelId, channelData) => apiFetch(`/channels/${channelId}`, {
    method: 'PUT',
    body: JSON.stringify(channelData),
  }),
  deleteChannel: (channelId) => apiFetch(`/channels/${channelId}`, { method: 'DELETE' }),
  joinVoiceChannel: (channelId) => apiFetch(`/channels/${channelId}/join`, { method: 'POST' }),
  leaveVoiceChannel: (channelId) => apiFetch(`/channels/${channelId}/leave`, { method: 'DELETE' }),
};

// Message API
export const messageAPI = {
  getMessages: (channelId, page = 1, limit = 50) => 
    apiFetch(`/messages/${channelId}?page=${page}&limit=${limit}`),
  sendMessage: (channelId, content) => apiFetch('/messages', {
    method: 'POST',
    body: JSON.stringify({ content, channelId }),
  }),
  editMessage: (messageId, content) => apiFetch(`/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  }),
  deleteMessage: (messageId) => apiFetch(`/messages/${messageId}`, { method: 'DELETE' }),
  addReaction: (messageId, emoji) => apiFetch(`/messages/${messageId}/react`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  }),
  removeReaction: (messageId, emoji) => apiFetch(`/messages/${messageId}/react`, {
    method: 'DELETE',
    body: JSON.stringify({ emoji }),
  }),
};

// Role API
export const roleAPI = {
  getRoles: (serverId) => apiFetch(`/roles/server/${serverId}`),
  createRole: (serverId, roleData) => apiFetch(`/roles/server/${serverId}`, {
    method: 'POST',
    body: JSON.stringify(roleData),
  }),
  updateRole: (roleId, roleData) => apiFetch(`/roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(roleData),
  }),
  deleteRole: (roleId) => apiFetch(`/roles/${roleId}`, { method: 'DELETE' }),
  assignRole: (roleId, userId, serverId) => apiFetch(`/roles/${roleId}/assign/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ serverId }),
  }),
  removeRole: (roleId, userId, serverId) => apiFetch(`/roles/${roleId}/remove/${userId}?serverId=${serverId}`, {
    method: 'DELETE',
  }),
  reorderRoles: (serverId, roleOrder) => apiFetch(`/roles/server/${serverId}/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ roleOrder }),
  }),
};

// Profile API
export const profileAPI = {
  getProfile: (userId) => apiFetch(`/profile/${userId}`),
  updateProfile: (profileData) => apiFetch('/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  }),
  updateStatus: (statusData) => apiFetch('/profile/status', {
    method: 'PUT',
    body: JSON.stringify(statusData),
  }),
  updateCustomStatus: (customStatusData) => apiFetch('/profile/custom-status', {
    method: 'PUT',
    body: JSON.stringify(customStatusData),
  }),
};

// Upload API
export const uploadAPI = {
  uploadFiles: async (files) => {
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/upload/files`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      devLog.error('File upload error:', error);
      throw error;
    }
  },
  
  uploadAvatar: async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/upload/avatar`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Avatar upload failed: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      devLog.error('Avatar upload error:', error);
      throw error;
    }
  },
  
  uploadServerIcon: async (file) => {
    try {
      const formData = new FormData();
      formData.append('icon', file);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/upload/server-icon`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Server icon upload failed: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      devLog.error('Server icon upload error:', error);
      throw error;
    }
  },
};

// DM API
export const dmAPI = {
  getConversations: () => apiFetch('/dm/conversations'),
  getMessages: (conversationId, page = 1, limit = 50) => 
    apiFetch(`/dm/conversations/${conversationId}/messages?page=${page}&limit=${limit}`),
  sendMessage: (conversationId, content) => apiFetch(`/dm/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  }),
  createConversation: (recipientId) => apiFetch('/dm/conversations', {
    method: 'POST',
    body: JSON.stringify({ userId: recipientId }),
  }),
  markAsRead: (conversationId) => apiFetch(`/dm/conversations/${conversationId}/read`, {
    method: 'PUT',
    body: JSON.stringify({}),
  }),
  deleteMessage: (conversationId, messageId) => apiFetch(`/dm/conversations/${conversationId}/messages/${messageId}`, {
    method: 'DELETE',
  }),
};

// Templates API
export const templatesAPI = {
  getTemplates: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/templates?${query}`);
  },
  getCategories: () => apiFetch('/templates/categories'),
  useTemplate: (templateId, serverData) => apiFetch(`/templates/${templateId}/use`, {
    method: 'POST',
    body: JSON.stringify(serverData),
  }),
};

// User Settings API
export const userSettingsAPI = {
  getSettings: () => apiFetch('/user-settings'),
  updateSettings: (settings) => apiFetch('/user-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),
  updateCategory: (category, settings) => apiFetch(`/user-settings/${category}`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),
  resetSettings: () => apiFetch('/user-settings/reset', { method: 'POST' }),
};

// Friends API
export const friendsAPI = {
  getFriends: async () => {
    const data = await apiFetch('/friends');
    return data.friends;
  },
  
  getPendingRequests: async () => {
    const data = await apiFetch('/friends/requests');
    return data.requests;
  },
  
  getSentRequests: async () => {
    const data = await apiFetch('/friends/requests/sent');
    return data.requests;
  },
  
  getBlockedUsers: async () => {
    const data = await apiFetch('/friends/blocked');
    return data.blocked;
  },
  
  sendFriendRequest: async (username, discriminator = null, message = '') => {
    const requestData = { username, message };
    if (discriminator) {
      requestData.discriminator = discriminator;
    }
    return apiFetch('/friends/request', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  },
  
  acceptFriendRequest: (requestId) => apiFetch(`/friends/request/${requestId}/accept`, {
    method: 'POST',
    body: JSON.stringify({}),
  }),
  
  declineFriendRequest: (requestId) => apiFetch(`/friends/request/${requestId}/decline`, {
    method: 'POST',
    body: JSON.stringify({}),
  }),
  
  removeFriend: (friendId) => apiFetch(`/friends/${friendId}`, {
    method: 'DELETE',
  }),
  
  blockUser: (userId) => apiFetch('/friends/block', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  }),
  
  unblockUser: (userId) => apiFetch(`/friends/block/${userId}`, {
    method: 'DELETE',
  }),
  
  searchUsers: async (query) => {
    const data = await apiFetch(`/friends/search?q=${encodeURIComponent(query)}`);
    return data.users;
  },
};

export default apiFetch;
