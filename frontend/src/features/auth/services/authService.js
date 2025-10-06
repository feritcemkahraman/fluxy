import { AUTH_ERRORS } from '../constants';

/**
 * Auth Service - Discord Style
 * Centralized authentication service with clean error handling
 */
class AuthService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
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
        'ngrok-skip-browser-warning': 'true', // Skip ngrok warning
        'User-Agent': 'Fluxy-Desktop-App', // Custom user agent
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
      console.error(`API Error [${endpoint}]:`, error);
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
    if (errorMessage.includes('Invalid credentials') || errorMessage.includes('401')) {
      return AUTH_ERRORS.INVALID_CREDENTIALS;
    }
    if (errorMessage.includes('User already exists') || errorMessage.includes('409')) {
      return AUTH_ERRORS.USER_EXISTS;
    }
    if (errorMessage.includes('Password too weak')) {
      return AUTH_ERRORS.WEAK_PASSWORD;
    }
    if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
      return AUTH_ERRORS.NETWORK_ERROR;
    }
    return AUTH_ERRORS.SERVER_ERROR;
  }

  /**
   * Login user
   */
  async login(credentials) {
    const result = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (result.success) {
      const { token, user } = result.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      return { success: true, user, token };
    }

    return result;
  }

  /**
   * Register user
   */
  async register(userData) {
    const result = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (result.success) {
      const { token, user } = result.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      return { success: true, user, token };
    }

    return result;
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      // Notify server (optional - don't block on failure)
      await this.makeRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Server logout notification failed:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    return { success: true };
  }

  /**
   * Verify token
   */
  async verifyToken() {
    const token = localStorage.getItem('token');
    if (!token) {
      return { success: false, error: 'No token found' };
    }

    const result = await this.makeRequest('/auth/verify');
    
    if (result.success) {
      const { user } = result.data;
      localStorage.setItem('user', JSON.stringify(user));
      return { success: true, user, token };
    }

    // Token invalid - clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return result;
  }

  /**
   * Get current user from storage
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user from storage:', error);
      return null;
    }
  }

  /**
   * Get current token from storage
   */
  getCurrentToken() {
    return localStorage.getItem('token');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!(this.getCurrentToken() && this.getCurrentUser());
  }
}

// Export singleton instance
export const authService = new AuthService();
