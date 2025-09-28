import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';
import socketService from '../services/socket';
import voiceChatService from '../services/voiceChat';
import electronStorage from '../utils/electronStorage';
import electronAPI from '../utils/electronAPI';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state from storage (Electron-compatible)
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await electronStorage.getItem('token');
        const savedUser = await electronStorage.getItem('user');
        
        if (token && savedUser) {
          try {
            // Immediately load user from storage for instant UI
            const localUser = JSON.parse(savedUser);
            const savedStatus = await electronStorage.getItem('userStatus') || 'online';
            
            const userData = { ...localUser, status: savedStatus };
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                user: userData,
                token
              }
            });

            // Set user data in voice chat service
            if (voiceChatService.setCurrentUser) {
              voiceChatService.setCurrentUser(userData);
            }

            // Skip API verification for now to avoid loading issues
            // TODO: Re-enable token verification when backend is stable
            /*
            // Then verify token by making an API call and update if needed
            const response = await authAPI.getMe();
            const apiUser = response.data;
            
            // Update with fresh data from API (in case user info changed)
            dispatch({
              type: 'UPDATE_USER',
              payload: { ...apiUser, status: savedStatus }
            });
            */

            // Don't connect socket here - let the other useEffect handle it
          } catch (error) {
            // Token is invalid, clear storage
            await electronStorage.removeItem('token');
            await electronStorage.removeItem('user');
            await electronStorage.removeItem('userStatus');
            dispatch({ type: 'LOGOUT' });
          }
        } else {
          // No token found
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (storageError) {
        // Storage error, just set loading to false
        console.warn('Storage error during auth init:', storageError);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    initAuth();
  }, []); // Only run once on mount

  const login = async (credentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await authAPI.login(credentials);
      const { user, token } = response; // authAPI.login already returns response.data

      // Store in storage (Electron-compatible)
      await electronStorage.setItem('token', token);
      await electronStorage.setItem('user', JSON.stringify(user));
      await electronStorage.setItem('userStatus', user.status || 'online');

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });

      // Set user data in voice chat service
      if (voiceChatService.setCurrentUser) {
        voiceChatService.setCurrentUser(user);
      }

      // Connect to socket
      socketService.connect(token);

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Giriş başarısız. Lütfen tekrar deneyin.';
      const errorType = error.response?.data?.type;
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Login error:', {
          message: errorMessage,
          type: errorType,
          status: error.response?.status,
          data: error.response?.data
        });
      }

      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { 
        success: false, 
        error: errorMessage,
        type: errorType
      };
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await authAPI.register(userData);
      const { user, token } = response; // authAPI.register already returns response.data

      // Store in storage (Electron-compatible)
      await electronStorage.setItem('token', token);
      await electronStorage.setItem('user', JSON.stringify(user));
      await electronStorage.setItem('userStatus', user.status || 'online');

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });

      // Set user data in voice chat service
      if (voiceChatService.setCurrentUser) {
        voiceChatService.setCurrentUser(user);
      }

      // Connect to socket
      socketService.connect(token);

      return { success: true };
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      
      // Extract the most relevant error information
      let errorMessage = 'Kayıt işlemi başarısız. Lütfen tekrar deneyin.';
      let errorType = null;
      let status = undefined;
      
      // If it's an APIError from our error handling system
      if (error.message && error.status !== undefined) {
        errorMessage = error.message;
        errorType = error.type;
        status = error.status;
      }
      // If it's a raw axios error
      else if (error.response?.data) {
        errorMessage = error.response.data.message || errorMessage;
        errorType = error.response.data.type;
        status = error.response.status;
      }
      // Network or other errors
      else if (error.message && error.message !== 'Network Error') {
        errorMessage = error.message;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.error('Registration error:', {
          message: errorMessage,
          type: errorType,
          status: status,
          data: error.response?.data,
          originalError: error
        });
      }

      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { 
        success: false, 
        error: errorMessage,
        type: errorType
      };
    }
  };

  const logout = async (skipSocketDisconnect = false) => {
    // First clear storage and state immediately (Electron-compatible)
    await electronStorage.removeItem('token');
    await electronStorage.removeItem('user');
    await electronStorage.removeItem('userStatus');
    
    dispatch({ type: 'LOGOUT' });
    
    // Disconnect socket only if not already disconnected
    if (!skipSocketDisconnect) {
      socketService.disconnect();
    }
    
    // Optionally try to notify server, but don't block logout
    try {
      await authAPI.logout();
    } catch (error) {
      // Silently handle server logout errors (token might be expired)
      if (process.env.NODE_ENV === 'development') {
        console.log('Server logout notification failed (ignored):', error.message);
      }
      // Don't throw error - logout should always succeed locally
    }
  };

  useEffect(() => {
    if (state.isAuthenticated && state.token) {
      // Only connect if not already connected/connecting and we have a valid token
      if (!socketService.isConnected() && !socketService.socket?.connecting && state.token.trim() !== '') {
        console.log('Connecting socket with authentication token');
        try {
          socketService.connect(state.token);
        } catch (error) {
          console.warn('Socket connection failed:', error.message);
          // Don't throw error, app should work without real-time features
        }
      } else if (socketService.isConnected()) {
        console.log('Socket already connected, skipping connection attempt');
      }
    } else {
      // Disconnect socket when not authenticated
      if (socketService.isConnected()) {
        console.log('Disconnecting socket - user not authenticated');
        socketService.disconnect();
      }
    }

    return () => {
      // Only disconnect on unmount, not on every state change
      if (socketService.isConnected()) {
        socketService.disconnect();
      }
    };
  }, [state.isAuthenticated, state.token]);

  useEffect(() => {
    const handleConnected = () => {
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    const handleDisconnected = (reason) => {
      console.log('Socket disconnected with reason:', reason);
      
      // Don't logout for normal disconnect reasons
      const normalDisconnectReasons = [
        'io server disconnect',
        'io client disconnect', 
        'ping timeout',
        'transport close',
        'transport error'
      ];
      
      if (normalDisconnectReasons.includes(reason)) {
        console.log('Normal disconnect, not logging out');
        return;
      }
      
      // Only logout for authentication-related disconnects
      if (reason === 'unauthorized' || reason === 'authentication failed') {
        console.log('Authentication failed, logging out');
        logout(true);
      }
    };

    const handleAuthError = () => {
      logout();
    };

    const handleConnectionError = (error) => {
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    socketService.on('connected', handleConnected);
    socketService.on('disconnected', handleDisconnected);
    socketService.on('authError', handleAuthError);
    socketService.on('connectionError', handleConnectionError);

    return () => {
      socketService.off('connected', handleConnected);
      socketService.off('disconnected', handleDisconnected);
      socketService.off('authError', handleAuthError);
      socketService.off('connectionError', handleConnectionError);
    };
  }, []);

  const updateStatus = async (statusData) => {
    try {
      const response = await authAPI.updateStatus(statusData);
      const updatedUser = response.data.user;
      
      // Save status to storage (Electron-compatible)
      electronStorage.setItem('userStatus', updatedUser.status);
      
      dispatch({
        type: 'UPDATE_USER',
        payload: updatedUser,
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Status update failed';
      return { success: false, error: errorMessage };
    }
  };

  const updateUser = (userData) => {
    // Update storage (Electron-compatible)
    const currentUser = JSON.parse(electronStorage.getItem('user') || '{}');
    const updatedUserData = { ...currentUser, ...userData };
    electronStorage.setItem('user', JSON.stringify(updatedUserData));
    
    // Update AuthContext state
    dispatch({
      type: 'UPDATE_USER',
      payload: userData,
    });
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateStatus,
    updateUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
