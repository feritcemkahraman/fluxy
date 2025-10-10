// Redis Cache Layer for Discord-like Performance
// Install: npm install ioredis

const Redis = require('ioredis');

// Redis configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true
});

// Redis connection events
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

// Cache TTLs (Discord-like)
const CACHE_TTL = {
  MESSAGE: 3600, // 1 hour
  USER: 1800, // 30 minutes
  SERVER: 3600, // 1 hour
  CHANNEL: 3600, // 1 hour
  PRESENCE: 300, // 5 minutes
  TYPING: 10 // 10 seconds
};

class CacheManager {
  // ==================== MESSAGE CACHE ====================
  
  /**
   * Cache messages for a channel (Discord caches last 50-100 messages per channel)
   */
  async cacheMessages(channelId, messages) {
    const key = `messages:${channelId}`;
    try {
      await redis.setex(key, CACHE_TTL.MESSAGE, JSON.stringify(messages));
      return true;
    } catch (error) {
      console.error('Cache messages error:', error);
      return false;
    }
  }

  /**
   * Get cached messages for a channel
   */
  async getCachedMessages(channelId) {
    const key = `messages:${channelId}`;
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Get cached messages error:', error);
      return null;
    }
  }

  /**
   * Invalidate message cache when new message is sent
   */
  async invalidateMessageCache(channelId) {
    const key = `messages:${channelId}`;
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Invalidate message cache error:', error);
      return false;
    }
  }

  // ==================== USER PRESENCE CACHE ====================
  
  /**
   * Set user presence (online/offline/dnd/idle)
   * Discord uses this heavily for "green dot" status
   */
  async setUserPresence(userId, status, activity = null) {
    const key = `presence:${userId}`;
    const data = {
      status,
      activity,
      lastSeen: Date.now()
    };
    
    try {
      await redis.setex(key, CACHE_TTL.PRESENCE, JSON.stringify(data));
      
      // Also add to online users set for quick lookup
      if (status === 'online') {
        await redis.sadd('users:online', userId);
      } else {
        await redis.srem('users:online', userId);
      }
      
      return true;
    } catch (error) {
      console.error('Set user presence error:', error);
      return false;
    }
  }

  /**
   * Get user presence
   */
  async getUserPresence(userId) {
    const key = `presence:${userId}`;
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Get user presence error:', error);
      return null;
    }
  }

  /**
   * Get all online users in a server (for member list)
   */
  async getOnlineUsers(serverMemberIds) {
    try {
      const onlineUsers = await redis.smembers('users:online');
      return serverMemberIds.filter(id => onlineUsers.includes(id.toString()));
    } catch (error) {
      console.error('Get online users error:', error);
      return [];
    }
  }

  // ==================== TYPING INDICATORS ====================
  
  /**
   * Set typing indicator (Discord shows "X is typing..." for 5-10 seconds)
   */
  async setTyping(channelId, userId, username) {
    const key = `typing:${channelId}`;
    const data = { userId, username, timestamp: Date.now() };
    
    try {
      // Use hash to store multiple users typing
      await redis.hset(key, userId, JSON.stringify(data));
      await redis.expire(key, CACHE_TTL.TYPING);
      return true;
    } catch (error) {
      console.error('Set typing error:', error);
      return false;
    }
  }

  /**
   * Get typing users for a channel
   */
  async getTypingUsers(channelId) {
    const key = `typing:${channelId}`;
    try {
      const typing = await redis.hgetall(key);
      const users = [];
      
      for (const [userId, data] of Object.entries(typing)) {
        const parsed = JSON.parse(data);
        // Only return if typing event is less than 10 seconds old
        if (Date.now() - parsed.timestamp < 10000) {
          users.push(parsed);
        }
      }
      
      return users;
    } catch (error) {
      console.error('Get typing users error:', error);
      return [];
    }
  }

  /**
   * Remove typing indicator
   */
  async removeTyping(channelId, userId) {
    const key = `typing:${channelId}`;
    try {
      await redis.hdel(key, userId);
      return true;
    } catch (error) {
      console.error('Remove typing error:', error);
      return false;
    }
  }

  // ==================== SERVER/CHANNEL CACHE ====================
  
  /**
   * Cache server data (Discord caches server structure aggressively)
   */
  async cacheServer(serverId, serverData) {
    const key = `server:${serverId}`;
    try {
      await redis.setex(key, CACHE_TTL.SERVER, JSON.stringify(serverData));
      return true;
    } catch (error) {
      console.error('Cache server error:', error);
      return false;
    }
  }

  /**
   * Get cached server data
   */
  async getCachedServer(serverId) {
    const key = `server:${serverId}`;
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Get cached server error:', error);
      return null;
    }
  }

  /**
   * Invalidate server cache (when server is updated)
   */
  async invalidateServerCache(serverId) {
    const key = `server:${serverId}`;
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Invalidate server cache error:', error);
      return false;
    }
  }

  // ==================== RATE LIMITING ====================
  
  /**
   * Check rate limit (Discord has per-user, per-channel rate limits)
   */
  async checkRateLimit(userId, action, maxRequests = 5, windowSeconds = 10) {
    const key = `ratelimit:${action}:${userId}`;
    
    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }
      
      return {
        allowed: current <= maxRequests,
        current,
        limit: maxRequests,
        resetIn: await redis.ttl(key)
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true, current: 0, limit: maxRequests };
    }
  }

  // ==================== UTILITY ====================
  
  /**
   * Clear all cache (for development/debugging)
   */
  async clearAll() {
    try {
      await redis.flushdb();
      console.log('✅ Cache cleared');
      return true;
    } catch (error) {
      console.error('Clear cache error:', error);
      return false;
    }
  }

  /**
   * Get cache stats
   */
  async getStats() {
    try {
      const info = await redis.info('stats');
      const memory = await redis.info('memory');
      
      return {
        connected: redis.status === 'ready',
        info,
        memory
      };
    } catch (error) {
      console.error('Get cache stats error:', error);
      return null;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    await redis.quit();
  }
}

// Export singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;
