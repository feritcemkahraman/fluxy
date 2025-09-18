import api from './api';

class FriendsAPI {
  // Get all friends
  async getFriends() {
    try {
      const response = await api.get('/friends');
      return response.data.friends;
    } catch (error) {
      throw error;
    }
  }

  // Get pending friend requests (received)
  async getPendingRequests() {
    try {
      const response = await api.get('/friends/requests');
      return response.data.requests;
    } catch (error) {
      throw error;
    }
  }

  // Get sent friend requests
  async getSentRequests() {
    try {
      const response = await api.get('/friends/requests/sent');
      return response.data.requests;
    } catch (error) {
      throw error;
    }
  }

  // Get blocked users
  async getBlockedUsers() {
    try {
      const response = await api.get('/friends/blocked');
      return response.data.blocked;
    } catch (error) {
      throw error;
    }
  }

  // Send friend request
  async sendFriendRequest(username, discriminator = null, message = '') {
    try {
      const data = { username, message };
      if (discriminator) {
        data.discriminator = discriminator;
      }

      const response = await api.post('/friends/request', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Accept friend request
  async acceptFriendRequest(requestId) {
    try {
      const response = await api.post(`/friends/request/${requestId}/accept`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Decline friend request
  async declineFriendRequest(requestId) {
    try {
      const response = await api.post(`/friends/request/${requestId}/decline`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Remove friend
  async removeFriend(friendId) {
    try {
      const response = await api.delete(`/friends/${friendId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Block user
  async blockUser(userId) {
    try {
      const response = await api.post('/friends/block', { userId });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Unblock user
  async unblockUser(userId) {
    try {
      const response = await api.delete(`/friends/block/${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Search users
  async searchUsers(query) {
    try {
      const response = await api.get(`/friends/search?q=${encodeURIComponent(query)}`);
      return response.data.users;
    } catch (error) {
      throw error;
    }
  }
}

const friendsAPI = new FriendsAPI();
export default friendsAPI;
