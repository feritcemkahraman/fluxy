/**
 * Adaptive Quality Controller
 * Discord-like dynamic quality adjustment based on CPU usage
 */

class AdaptiveQualityController {
  constructor() {
    this.currentQuality = 'medium';
    this.monitorInterval = null;
    this.qualityChangeCallbacks = [];
    this.cpuSamples = [];
    this.maxSamples = 5;
    
    // Quality profiles (Discord-like)
    this.profiles = {
      low: {
        width: 854,
        height: 480,
        fps: 10,
        bitrate: 500_000,
        label: 'Düşük (480p @ 10fps)'
      },
      medium: {
        width: 1280,
        height: 720,
        fps: 15,
        bitrate: 1_500_000,
        label: 'Orta (720p @ 15fps)'
      },
      high: {
        width: 1920,
        height: 1080,
        fps: 20,
        bitrate: 2_500_000,
        label: 'Yüksek (1080p @ 20fps)'
      }
    };
  }

  /**
   * Start monitoring CPU and adjusting quality
   */
  startMonitoring() {
    if (this.monitorInterval) return;

    console.log('📊 Adaptive quality monitoring started');
    
    this.monitorInterval = setInterval(() => {
      this.checkAndAdjustQuality();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      this.cpuSamples = [];
      console.log('📊 Adaptive quality monitoring stopped');
    }
  }

  /**
   * Check CPU usage and adjust quality if needed
   */
  async checkAndAdjustQuality() {
    const cpuUsage = await this.estimateCPUUsage();
    
    // Keep last N samples for smoothing
    this.cpuSamples.push(cpuUsage);
    if (this.cpuSamples.length > this.maxSamples) {
      this.cpuSamples.shift();
    }

    // Average CPU usage
    const avgCPU = this.cpuSamples.reduce((a, b) => a + b, 0) / this.cpuSamples.length;
    
    console.log(`📊 CPU Usage: ${avgCPU.toFixed(1)}% (Current quality: ${this.currentQuality})`);

    // Adjust quality based on CPU
    if (avgCPU > 60 && this.currentQuality !== 'low') {
      this.downgradeQuality();
    } else if (avgCPU < 25 && this.currentQuality !== 'high') {
      this.upgradeQuality();
    }
  }

  /**
   * Estimate CPU usage (browser-based approximation)
   */
  async estimateCPUUsage() {
    // Use performance.now() to estimate CPU load
    const start = performance.now();
    
    // Do some work to measure responsiveness
    let sum = 0;
    for (let i = 0; i < 100000; i++) {
      sum += Math.sqrt(i);
    }
    
    const duration = performance.now() - start;
    
    // Normalize to 0-100 scale (baseline ~1ms for this work)
    // Higher duration = higher CPU usage
    const cpuEstimate = Math.min(100, (duration / 1) * 10);
    
    return cpuEstimate;
  }

  /**
   * Downgrade quality
   */
  downgradeQuality() {
    let newQuality = this.currentQuality;
    
    if (this.currentQuality === 'high') {
      newQuality = 'medium';
    } else if (this.currentQuality === 'medium') {
      newQuality = 'low';
    }

    if (newQuality !== this.currentQuality) {
      console.log(`⬇️ Downgrading quality: ${this.currentQuality} → ${newQuality}`);
      this.setQuality(newQuality);
    }
  }

  /**
   * Upgrade quality
   */
  upgradeQuality() {
    let newQuality = this.currentQuality;
    
    if (this.currentQuality === 'low') {
      newQuality = 'medium';
    } else if (this.currentQuality === 'medium') {
      newQuality = 'high';
    }

    if (newQuality !== this.currentQuality) {
      console.log(`⬆️ Upgrading quality: ${this.currentQuality} → ${newQuality}`);
      this.setQuality(newQuality);
    }
  }

  /**
   * Set quality profile
   */
  setQuality(quality) {
    if (!this.profiles[quality]) {
      console.error('Invalid quality:', quality);
      return;
    }

    this.currentQuality = quality;
    const profile = this.profiles[quality];

    // Notify all callbacks
    this.qualityChangeCallbacks.forEach(callback => {
      callback(profile);
    });
  }

  /**
   * Get current quality profile
   */
  getCurrentProfile() {
    return this.profiles[this.currentQuality];
  }

  /**
   * Register callback for quality changes
   */
  onQualityChange(callback) {
    this.qualityChangeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.qualityChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.qualityChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Manually set quality (user override)
   */
  setManualQuality(quality) {
    console.log(`🎛️ Manual quality set: ${quality}`);
    this.setQuality(quality);
  }
}

// Export singleton instance
const adaptiveQualityController = new AdaptiveQualityController();
export default adaptiveQualityController;
