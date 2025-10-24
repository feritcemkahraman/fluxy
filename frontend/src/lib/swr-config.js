/**
 * SWR Configuration - Discord-like Caching
 * 
 * Pattern: Stale-While-Revalidate
 * 1. Return cached data instantly (stale)
 * 2. Revalidate in background
 * 3. Update UI when fresh data arrives
 * 
 * Benefits:
 * - Instant UI updates
 * - Reduced server load
 * - Better UX (no loading spinners)
 * - Automatic deduplication
 */

import { serverAPI, friendsAPI, dmAPI } from '../services/api';

/**
 * Global fetcher function for SWR
 * Maps endpoint to appropriate API call
 */
export const fetcher = async (key) => {
  // Parse the key to determine which API to call
  if (typeof key === 'string') {
    // Server list
    if (key === '/servers') {
      const response = await serverAPI.getServers();
      return response.servers || response;
    }
    
    // Friends list
    if (key === '/friends') {
      return await friendsAPI.getFriends();
    }
    
    // Friend requests (pending)
    if (key === '/friends/pending') {
      return await friendsAPI.getFriendRequests();
    }
    
    // DM conversations
    if (key === '/conversations') {
      return await dmAPI.getConversations();
    }
    
    // Server members: /servers/:id/members
    if (key.startsWith('/servers/') && key.endsWith('/members')) {
      const serverId = key.split('/')[2];
      const response = await serverAPI.getServerMembers(serverId);
      return response.members || response;
    }
    
    // Server channels: /servers/:id/channels
    if (key.startsWith('/servers/') && key.endsWith('/channels')) {
      const serverId = key.split('/')[2];
      const response = await serverAPI.getServerChannels(serverId);
      return response.channels || response;
    }
  }
  
  // Array key format [url, ...params]
  if (Array.isArray(key)) {
    const [endpoint, ...params] = key;
    
    // Channel messages: ['/channels/:id/messages', channelId]
    if (endpoint === '/channels/:id/messages') {
      const [channelId] = params;
      // Note: Messages are handled by useChannelMessages hook
      // This is just for potential future use
      return [];
    }
  }
  
  throw new Error(`Unknown SWR key: ${key}`);
};

/**
 * Default SWR configuration
 * Optimized for Discord-like experience
 */
export const swrConfig = {
  // Stale-while-revalidate settings
  revalidateOnFocus: true, // Revalidate when user returns to tab
  revalidateOnReconnect: true, // Revalidate when reconnected
  revalidateIfStale: true, // Revalidate if data is stale
  
  // Deduplication
  dedupingInterval: 2000, // Dedupe requests within 2 seconds
  
  // Error retry
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000, // 5 seconds
  
  // Focus throttle (prevent too many revalidations)
  focusThrottleInterval: 5000, // 5 seconds
  
  // Keep previous data while revalidating (smooth transitions)
  keepPreviousData: true,
  
  // Global fetcher
  fetcher,
};

/**
 * Custom SWR options for specific use cases
 */

// Server list: Long cache (servers don't change often)
export const serverListConfig = {
  ...swrConfig,
  revalidateOnFocus: false, // Don't revalidate on every focus
  dedupingInterval: 10000, // 10 seconds
  refreshInterval: 0, // No auto refresh (socket handles updates)
};

// Friends list: Medium cache
export const friendsListConfig = {
  ...swrConfig,
  dedupingInterval: 5000, // 5 seconds
  refreshInterval: 0, // Socket handles updates
};

// DM conversations: Medium cache
export const conversationsConfig = {
  ...swrConfig,
  dedupingInterval: 5000,
  refreshInterval: 0,
};

// Server members: Long cache (updated via socket)
export const serverMembersConfig = {
  ...swrConfig,
  revalidateOnFocus: false,
  dedupingInterval: 15000, // 15 seconds
  refreshInterval: 0,
};

// Server channels: Long cache
export const serverChannelsConfig = {
  ...swrConfig,
  revalidateOnFocus: false,
  dedupingInterval: 15000,
  refreshInterval: 0,
};
