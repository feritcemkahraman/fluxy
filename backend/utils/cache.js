const Redis = require('ioredis');

class CacheManager {
  constructor() {
    this.redis = null;
    this.isConnected = false;

    this.init();
  }

  async init() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected');
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        console.warn('⚠️ Redis connection error:', err.message);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        console.log('🔌 Redis connection closed');
        this.isConnected = false;
      });

    } catch (error) {
      console.warn('⚠️ Redis initialization failed:', error.message);
    }
  }

  // Voice channel state caching
  async setVoiceChannelState(channelId, users) {
    if (!this.isConnected) return;

    try {
      const key = `voice_channel:${channelId}`;
      const data = JSON.stringify({
        users: Array.from(users),
        timestamp: Date.now()
      });

      await this.redis.setex(key, 3600, data); // 1 hour expiry
    } catch (error) {
      console.warn('⚠️ Redis set error:', error.message);
    }
  }

  async getVoiceChannelState(channelId) {
    if (!this.isConnected) return null;

    try {
      const key = `voice_channel:${channelId}`;
      const data = await this.redis.get(key);

      if (data) {
        const parsed = JSON.parse(data);
        // Check if data is not too old (max 5 minutes)
        if (Date.now() - parsed.timestamp < 300000) {
          return new Set(parsed.users);
        }
      }
    } catch (error) {
      console.warn('⚠️ Redis get error:', error.message);
    }

    return null;
  }

  // User session caching
  async setUserSession(userId, sessionData) {
    if (!this.isConnected) return;

    try {
      const key = `user_session:${userId}`;
      await this.redis.setex(key, 1800, JSON.stringify(sessionData)); // 30 minutes
    } catch (error) {
      console.warn('⚠️ Redis session set error:', error.message);
    }
  }

  async getUserSession(userId) {
    if (!this.isConnected) return null;

    try {
      const key = `user_session:${userId}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('⚠️ Redis session get error:', error.message);
      return null;
    }
  }

  // Rate limiting
  async checkRateLimit(key, windowMs = 60000, maxRequests = 100) {
    if (!this.isConnected) return true; // Allow if Redis is down

    try {
      const redisKey = `ratelimit:${key}`;
      const current = await this.redis.incr(redisKey);

      if (current === 1) {
        await this.redis.pexpire(redisKey, windowMs);
      }

      return current <= maxRequests;
    } catch (error) {
      console.warn('⚠️ Redis rate limit error:', error.message);
      return true; // Allow on error
    }
  }

  // Cleanup
  async disconnect() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

const cacheManager = new CacheManager();

module.exports = cacheManager;