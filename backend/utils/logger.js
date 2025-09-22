// Production Logger - Optimized Logging
class ProductionLogger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    this.currentLevel = this.isDevelopment ? this.logLevels.DEBUG : this.logLevels.ERROR;
  }

  /**
   * Log error messages (always shown)
   */
  error(message, ...args) {
    if (this.currentLevel >= this.logLevels.ERROR) {
      console.error('❌', message, ...args);
    }
  }

  /**
   * Log warning messages 
   */
  warn(message, ...args) {
    if (this.currentLevel >= this.logLevels.WARN) {
      console.warn('⚠️', message, ...args);
    }
  }

  /**
   * Log info messages (development only)
   */
  info(message, ...args) {
    if (this.currentLevel >= this.logLevels.INFO) {
      console.log('ℹ️', message, ...args);
    }
  }

  /**
   * Log debug messages (development only)
   */
  debug(message, ...args) {
    if (this.currentLevel >= this.logLevels.DEBUG) {
      console.log('🔧', message, ...args);
    }
  }

  /**
   * Log voice operations (special category)
   */
  voice(operation, username, channelId, users = []) {
    if (this.currentLevel >= this.logLevels.INFO) {
      console.log(`🔊 ${operation}: ${username} | Channel: ${channelId} | Users: [${users.join(', ')}]`);
    }
  }

  /**
   * Log network operations
   */
  network(message, ...args) {
    if (this.currentLevel >= this.logLevels.DEBUG) {
      console.log('🌐', message, ...args);
    }
  }

  /**
   * Log performance metrics
   */
  performance(operation, duration, ...args) {
    if (this.currentLevel >= this.logLevels.INFO) {
      console.log(`⚡ ${operation}: ${duration}ms`, ...args);
    }
  }

  /**
   * Set log level dynamically
   */
  setLevel(level) {
    if (typeof level === 'string') {
      this.currentLevel = this.logLevels[level.toUpperCase()] || this.logLevels.ERROR;
    } else {
      this.currentLevel = level;
    }
  }
}

// Create singleton instance
const logger = new ProductionLogger();

module.exports = logger;