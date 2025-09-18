import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/.netlify/functions/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to home page where AuthWrapper will handle login
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateStatus: (statusData) => api.put('/profile/status', statusData),
};

// Server API
export const serverAPI = {
  getServers: () => api.get('/servers'),
  createServer: (serverData) => api.post('/servers', serverData),
  getServer: (serverId) => api.get(`/servers/${serverId}`),
  updateServer: (serverId, serverData) => api.put(`/servers/${serverId}`, serverData),
  deleteServer: (serverId) => api.delete(`/servers/${serverId}`),
  joinServer: (serverId) => api.post(`/servers/${serverId}/join`),
  leaveServer: (serverId) => api.delete(`/servers/${serverId}/leave`),
  getServerMembers: (serverId) => api.get(`/servers/${serverId}/members`),
  kickMember: (serverId, userId, reason) => api.post(`/servers/${serverId}/kick/${userId}`, { reason }),
  banMember: (serverId, userId, banData) => api.post(`/servers/${serverId}/ban/${userId}`, banData),
  unbanMember: (serverId, userId) => api.delete(`/servers/${serverId}/ban/${userId}`),
  getBannedUsers: (serverId) => api.get(`/servers/${serverId}/bans`),
  createInvite: (serverId) => api.post(`/servers/${serverId}/invite`),
};

// Channel API
export const channelAPI = {
  getChannels: (serverId) => api.get(`/channels/${serverId}`),
  createChannel: (channelData) => api.post('/channels', channelData),
  updateChannel: (channelId, channelData) => api.put(`/channels/${channelId}`, channelData),
  deleteChannel: (channelId) => api.delete(`/channels/${channelId}`),
  joinVoiceChannel: (channelId) => api.post(`/channels/${channelId}/join`),
  leaveVoiceChannel: (channelId) => api.delete(`/channels/${channelId}/leave`),
};

// Message API
export const messageAPI = {
  getMessages: (channelId, page = 1, limit = 50) => 
    api.get(`/messages/${channelId}?page=${page}&limit=${limit}`),
  sendMessage: (channelId, content) => 
    api.post('/messages', { content, channelId }),
  editMessage: (messageId, content) => 
    api.put(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId) => 
    api.delete(`/messages/${messageId}`),
  addReaction: (messageId, emoji) => 
    api.post(`/messages/${messageId}/react`, { emoji }),
  removeReaction: (messageId, emoji) => 
    api.delete(`/messages/${messageId}/react`, { data: { emoji } })
};

// Direct Messages API
export const dmAPI = {
  getConversations: () => api.get('/dm/conversations'),
  getMessages: (conversationId, page = 1, limit = 50) => 
    api.get(`/dm/${conversationId}/messages?page=${page}&limit=${limit}`),
  sendMessage: (userId, content) => 
    api.post('/dm/send', { userId, content }),
  createConversation: (userId) => 
    api.post('/dm/conversations', { userId }),
  markAsRead: (conversationId) => 
    api.put(`/dm/${conversationId}/read`)
};

// Role API
export const roleAPI = {
  getRoles: (serverId) => api.get(`/roles/server/${serverId}`),
  createRole: (serverId, roleData) => api.post(`/roles/server/${serverId}`, roleData),
  updateRole: (roleId, roleData) => api.put(`/roles/${roleId}`, roleData),
  deleteRole: (roleId) => api.delete(`/roles/${roleId}`),
  assignRole: (roleId, userId, serverId) => api.post(`/roles/${roleId}/assign/${userId}`, { serverId }),
  removeRole: (roleId, userId, serverId) => api.delete(`/roles/${roleId}/remove/${userId}`, { data: { serverId } }),
  reorderRoles: (serverId, roleOrder) => api.put(`/roles/server/${serverId}/reorder`, { roleOrder })
};

// User Settings API
export const userSettingsAPI = {
  getSettings: () => api.get('/user-settings'),
  updateSettings: (settings) => api.put('/user-settings', settings),
  updateCategory: (category, settings) => api.put(`/user-settings/${category}`, settings),
  resetSettings: () => api.post('/user-settings/reset'),
  exportSettings: () => api.get('/user-settings/export'),
  importSettings: (settings) => api.post('/user-settings/import', { settings })
};

// Profile API
export const profileAPI = {
  getProfile: (userId) => api.get(`/profile/${userId}`),
  updateProfile: (profileData) => api.put('/profile', profileData),
  updateStatus: (statusData) => api.put('/profile/status', statusData),
  addBadge: (badgeData) => api.post('/profile/badges', badgeData),
  removeBadge: (badgeId) => api.delete(`/profile/badges/${badgeId}`),
  addConnection: (connectionData) => api.post('/profile/connections', connectionData),
  removeConnection: (connectionId) => api.delete(`/profile/connections/${connectionId}`),
  clearCustomStatus: () => api.delete('/profile/status/custom')
};

// Upload API
export const uploadAPI = {
  uploadFiles: (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return api.post('/upload/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadServerIcon: (file) => {
    const formData = new FormData();
    formData.append('icon', file);
    return api.post('/upload/server-icon', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// Templates API
export { default as templatesAPI } from './templatesAPI';

export default api;
