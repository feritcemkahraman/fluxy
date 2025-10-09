import axios from 'axios';
import { handleAPIError, retryRequest } from '../utils/errorHandling';
import { devLog } from '../utils/devLogger';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api';

// Create axios instance with enhanced configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
  },
  withCredentials: true,
});

// Request interceptor to add auth token and request tracking
api.interceptors.request.use(
  async (config) => {
    // Try to get token from localStorage first (for compatibility)
    let token = localStorage.getItem('token');
    
    // If not in localStorage, try Electron storage
    if (!token && window.electronAPI) {
      try {
        token = await window.electronAPI.storage.get('token');
      } catch (error) {
        console.warn('Failed to get token from Electron storage:', error);
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('⚠️ No authentication token found for API request:', config.url);
    }
    
    // Add request timestamp for performance monitoring
    config.metadata = { startTime: Date.now() };
    
    return config;
  },
  (error) => {
    return Promise.reject(handleAPIError(error));
  }
);

// Response interceptor with enhanced error handling
api.interceptors.response.use(
  (response) => {
    // Log response time for performance monitoring
    if (response.config.metadata) {
      const duration = Date.now() - response.config.metadata.startTime;
      if (duration > 15000) { // Log very slow requests (15s+)
        console.warn(`Slow API request: ${response.config.method?.toUpperCase()} ${response.config.url} took ${duration}ms`);
      }
    }
    
    return response;
  },
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userStatus');
      
      // For production Electron builds, use hash navigation
      // Only redirect if not already on login page
      if (window.location.pathname !== '/' && window.location.hash !== '#/') {
        // Use hash router for Electron compatibility
        if (window.location.protocol === 'file:') {
          window.location.hash = '#/';
        } else {
          window.location.href = '/';
        }
      }
    }
    
    return Promise.reject(handleAPIError(error));
  }
);

// Enhanced API methods with retry and error handling
const apiCall = async (method, url, data = null, retries = 3) => {
  
  // Don't retry POST requests to avoid duplicate creations
  const shouldRetry = method !== 'POST';
  const actualRetries = shouldRetry ? retries : 0;
  
  return retryRequest(async () => {
    switch (method) {
      case 'GET':
        return api.get(url);
      case 'POST':
        return api.post(url, data);
      case 'PUT':
        return api.put(url, data);
      case 'DELETE':
        return api.delete(url);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }, actualRetries);
};

// Enhanced Auth API with error handling and retry
export const authAPI = {
  register: async (userData) => {
    try {
      const response = await apiCall('POST', '/auth/register', userData);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  login: async (credentials) => {
    try {
      const response = await apiCall('POST', '/auth/login', credentials);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  logout: async () => {
    // Always clear local storage first
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userStatus');

    // Try to notify server, but don't retry if it fails
    try {
      // Direct API call without retry for logout
      await api.post('/auth/logout');
      if (process.env.NODE_ENV === 'development') {
        console.log('Server logout successful');
      }
    } catch (error) {
      // Silently handle logout errors - token might be expired
      // Local logout is more important than server notification
      if (process.env.NODE_ENV === 'development' && !error.message.includes('401')) {
        console.warn('Server logout failed, but local logout completed:', error.message);
      }
    }
  },
  getMe: () => apiCall('GET', '/auth/me'),
  updateStatus: (statusData) => apiCall('PUT', '/profile/status', statusData),
};

// Enhanced Server API with retry
export const serverAPI = {
  getServers: () => apiCall('GET', '/servers'),
  discoverServers: () => apiCall('GET', '/servers/discover'),
  createServer: (serverData) => apiCall('POST', '/servers', serverData),
  getServer: (serverId) => apiCall('GET', `/servers/${serverId}`),
  updateServer: (serverId, serverData) => apiCall('PUT', `/servers/${serverId}`, serverData),
  deleteServer: (serverId) => apiCall('DELETE', `/servers/${serverId}`),
  joinServer: (serverId, inviteCode = null) => apiCall('POST', `/servers/${serverId}/join`, { inviteCode }),
  joinServerByInvite: (inviteCode) => apiCall('POST', `/servers/join-by-invite`, { inviteCode }),
  leaveServer: (serverId) => apiCall('DELETE', `/servers/${serverId}/leave`),
  getServerMembers: (serverId) => apiCall('GET', `/servers/${serverId}/members`),
  kickMember: (serverId, userId, reason) => apiCall('POST', `/servers/${serverId}/kick/${userId}`, { reason }),
  banMember: (serverId, userId, banData) => apiCall('POST', `/servers/${serverId}/ban/${userId}`, banData),
  unbanMember: (serverId, userId) => apiCall('DELETE', `/servers/${serverId}/ban/${userId}`),
  getBannedUsers: (serverId) => apiCall('GET', `/servers/${serverId}/bans`),
  createInvite: (serverId) => apiCall('POST', `/servers/${serverId}/invite`, {}),
};

// Enhanced Channel API with retry
export const channelAPI = {
  getChannels: (serverId) => apiCall('GET', `/channels/${serverId}`),
  getChannelDetails: (channelId) => apiCall('GET', `/channels/${channelId}/details`), // This may not exist yet
  getChannelsWithUsers: (serverId) => apiCall('GET', `/channels/${serverId}`), // This includes connectedUsers
  createChannel: (channelData) => apiCall('POST', '/channels', channelData),
  updateChannel: (channelId, channelData) => apiCall('PUT', `/channels/${channelId}`, channelData),
  deleteChannel: (channelId) => apiCall('DELETE', `/channels/${channelId}`),
  joinVoiceChannel: (channelId) => apiCall('POST', `/channels/${channelId}/join`),
  leaveVoiceChannel: (channelId) => apiCall('DELETE', `/channels/${channelId}/leave`),
};

// Enhanced Message API with retry
export const messageAPI = {
  getMessages: (channelId, page = 1, limit = 50) => 
    apiCall('GET', `/messages/${channelId}?page=${page}&limit=${limit}`),
  sendMessage: (channelId, content) => 
    apiCall('POST', '/messages', { content, channelId }),
  editMessage: (messageId, content) => 
    apiCall('PUT', `/messages/${messageId}`, { content }),
  deleteMessage: (messageId) => 
    apiCall('DELETE', `/messages/${messageId}`),
  addReaction: (messageId, emoji) => 
    apiCall('POST', `/messages/${messageId}/react`, { emoji }),
  removeReaction: (messageId, emoji) => 
    apiCall('DELETE', `/messages/${messageId}/react`, { emoji })
};


// Enhanced Role API with retry
export const roleAPI = {
  getRoles: (serverId) => apiCall('GET', `/roles/server/${serverId}`),
  createRole: (serverId, roleData) => apiCall('POST', `/roles/server/${serverId}`, roleData),
  updateRole: (roleId, roleData) => apiCall('PUT', `/roles/${roleId}`, roleData),
  deleteRole: (roleId) => apiCall('DELETE', `/roles/${roleId}`),
  assignRole: (roleId, userId, serverId) => apiCall('POST', `/roles/${roleId}/assign/${userId}`, { serverId }),
  removeRole: (roleId, userId, serverId) => apiCall('DELETE', `/roles/${roleId}/remove/${userId}?serverId=${serverId}`),
  reorderRoles: (serverId, roleOrder) => apiCall('PUT', `/roles/server/${serverId}/reorder`, { roleOrder })
};

// Enhanced User Settings API with retry
export const userSettingsAPI = {
  getSettings: () => apiCall('GET', '/user-settings'),
  updateSettings: (settings) => apiCall('PUT', '/user-settings', settings),
  updateCategory: (category, settings) => apiCall('PUT', `/user-settings/${category}`, settings),
  resetSettings: () => apiCall('POST', '/user-settings/reset'),
  exportSettings: () => apiCall('GET', '/user-settings/export'),
  importSettings: (settings) => apiCall('POST', '/user-settings/import', { settings })
};

// Enhanced Profile API with retry
export const profileAPI = {
  getProfile: (userId) => apiCall('GET', `/profile/${userId}`),
  updateProfile: (profileData) => apiCall('PUT', '/profile', profileData),
  updateStatus: (statusData) => apiCall('PUT', '/profile/status', statusData),
  addBadge: (badgeData) => apiCall('POST', '/profile/badges', badgeData),
  removeBadge: (badgeId) => apiCall('DELETE', `/profile/badges/${badgeId}`),
  addConnection: (connectionData) => apiCall('POST', '/profile/connections', connectionData),
  removeConnection: (connectionId) => apiCall('DELETE', `/profile/connections/${connectionId}`),
  clearCustomStatus: () => apiCall('DELETE', '/profile/status/custom')
};

// Enhanced Upload API with retry and better error handling
export const uploadAPI = {
  uploadFiles: async (files) => {
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      const response = await retryRequest(async () => {
        return api.post('/upload/files', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000, // 60 second timeout for file uploads
        });
      });
      
      return response.data;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  },
  uploadAvatar: async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await retryRequest(async () => {
        return api.post('/upload/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000,
        });
      });
      
      return response.data;
    } catch (error) {
      console.error('Avatar upload error:', error);
      throw error;
    }
  },
  uploadServerIcon: async (file) => {
    try {
      const formData = new FormData();
      formData.append('icon', file);
      
      const response = await retryRequest(async () => {
        return api.post('/upload/server-icon', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000,
        });
      });
      
      return response.data;
    } catch (error) {
      console.error('Server icon upload error:', error);
      throw error;
    }
  }
};

// Direct Messages API
export const dmAPI = {
  getConversations: () => apiCall('GET', '/dm/conversations'),
  getMessages: (conversationId, page = 1, limit = 50) => 
    apiCall('GET', `/dm/conversations/${conversationId}/messages?page=${page}&limit=${limit}`),
  sendMessage: (conversationId, content) => 
    apiCall('POST', `/dm/conversations/${conversationId}/messages`, { content }),
  createConversation: (recipientId) => 
    apiCall('POST', '/dm/conversations', { userId: recipientId }),
  markAsRead: (conversationId) => 
    apiCall('PUT', `/dm/conversations/${conversationId}/read`, {}),
  deleteMessage: (conversationId, messageId) => 
    apiCall('DELETE', `/dm/conversations/${conversationId}/messages/${messageId}`),
  addReaction: (conversationId, messageId, emoji) => 
    apiCall('POST', `/dm/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji }),
  removeReaction: (conversationId, messageId, emoji) => 
    apiCall('DELETE', `/dm/conversations/${conversationId}/messages/${messageId}/reactions/${emoji}`)
};

// Health Check API
export const healthAPI = {
  check: () => apiCall('GET', '/health'),
  detailed: () => apiCall('GET', '/health/detailed')
};

// Templates API
export { default as templatesAPI } from './templatesAPI';

export default api;
