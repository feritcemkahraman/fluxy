/**
 * Optimized Screen Share Service
 * Uses OffscreenCanvas + requestVideoFrameCallback for better performance
 * Discord-like optimization techniques
 */

import adaptiveQualityController from '../utils/adaptiveQuality';

class OptimizedScreenShare {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.sourceVideo = null;
    this.outputStream = null;
    this.frameCallback = null;
    this.isActive = false;
    this.currentFPS = 15;
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / this.currentFPS;
  }

  /**
   * Initialize optimized screen share from video element
   * @param {HTMLVideoElement} videoElement - Source video element
   * @param {Object} options - Configuration options
   */
  async initialize(videoElement, options = {}) {
    if (!videoElement || !videoElement.srcObject) {
      throw new Error('Invalid video element or no source stream');
    }

    this.sourceVideo = videoElement;
    const profile = adaptiveQualityController.getCurrentProfile();
    
    // Create OffscreenCanvas for GPU-accelerated processing
    this.canvas = new OffscreenCanvas(profile.width, profile.height);
    this.ctx = this.canvas.getContext('2d', {
      alpha: false, // No transparency = faster
      desynchronized: true, // Allow async rendering
      willReadFrequently: false // Optimize for drawing
    });

    // Set current FPS
    this.currentFPS = profile.fps;
    this.frameInterval = 1000 / this.currentFPS;

    console.log(`🎨 OffscreenCanvas initialized: ${profile.width}x${profile.height} @ ${profile.fps}fps`);

    // Create output stream from canvas
    this.outputStream = this.canvas.captureStream(this.currentFPS);
    
    // Add audio track from original stream if exists
    const audioTracks = videoElement.srcObject.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks.forEach(track => {
        this.outputStream.addTrack(track);
      });
    }

    // Listen for quality changes
    this.qualityUnsubscribe = adaptiveQualityController.onQualityChange((profile) => {
      this.updateQuality(profile);
    });

    return this.outputStream;
  }

  /**
   * Start processing frames
   */
  startProcessing() {
    if (this.isActive || !this.sourceVideo) return;

    this.isActive = true;
    console.log('▶️ Frame processing started');

    // Use requestVideoFrameCallback for precise frame control (Chrome/Electron)
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      this.processFrameWithCallback();
    } else {
      // Fallback to requestAnimationFrame
      this.processFrameWithRAF();
    }

    // Start adaptive quality monitoring
    adaptiveQualityController.startMonitoring();
  }

  /**
   * Process frames using requestVideoFrameCallback (preferred)
   */
  processFrameWithCallback() {
    if (!this.isActive) return;

    this.frameCallback = this.sourceVideo.requestVideoFrameCallback((now, metadata) => {
      const currentTime = performance.now();
      
      // Frame rate throttling
      if (currentTime - this.lastFrameTime >= this.frameInterval) {
        this.drawFrame();
        this.lastFrameTime = currentTime;
      }

      // Continue processing
      if (this.isActive) {
        this.processFrameWithCallback();
      }
    });
  }

  /**
   * Process frames using requestAnimationFrame (fallback)
   */
  processFrameWithRAF() {
    if (!this.isActive) return;

    this.frameCallback = requestAnimationFrame(() => {
      const currentTime = performance.now();
      
      // Frame rate throttling
      if (currentTime - this.lastFrameTime >= this.frameInterval) {
        this.drawFrame();
        this.lastFrameTime = currentTime;
      }

      // Continue processing
      if (this.isActive) {
        this.processFrameWithRAF();
      }
    });
  }

  /**
   * Draw current video frame to canvas
   */
  drawFrame() {
    if (!this.ctx || !this.sourceVideo) return;

    try {
      // GPU-accelerated drawing
      this.ctx.drawImage(
        this.sourceVideo,
        0, 0,
        this.canvas.width,
        this.canvas.height
      );
    } catch (error) {
      // Ignore errors during drawing (e.g., video not ready)
    }
  }

  /**
   * Update quality settings
   */
  updateQuality(profile) {
    console.log(`🎛️ Updating quality: ${profile.label}`);

    // Resize canvas
    if (this.canvas) {
      this.canvas.width = profile.width;
      this.canvas.height = profile.height;
    }

    // Update FPS
    this.currentFPS = profile.fps;
    this.frameInterval = 1000 / this.currentFPS;

    // Update stream FPS if possible
    if (this.outputStream) {
      const videoTracks = this.outputStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].applyConstraints({
          frameRate: { ideal: profile.fps, max: profile.fps }
        }).catch(err => console.warn('Failed to update FPS:', err));
      }
    }
  }

  /**
   * Stop processing
   */
  stop() {
    this.isActive = false;

    // Cancel frame callback
    if (this.frameCallback) {
      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        // No cancel method for requestVideoFrameCallback, just stop calling it
      } else {
        cancelAnimationFrame(this.frameCallback);
      }
      this.frameCallback = null;
    }

    // Stop adaptive quality monitoring
    adaptiveQualityController.stopMonitoring();

    // Unsubscribe from quality changes
    if (this.qualityUnsubscribe) {
      this.qualityUnsubscribe();
      this.qualityUnsubscribe = null;
    }

    // Stop output stream
    if (this.outputStream) {
      this.outputStream.getTracks().forEach(track => track.stop());
      this.outputStream = null;
    }

    // Clear canvas
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.canvas = null;
    this.ctx = null;
    this.sourceVideo = null;

    console.log('⏹️ Optimized screen share stopped');
  }

  /**
   * Get output stream
   */
  getOutputStream() {
    return this.outputStream;
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      isActive: this.isActive,
      fps: this.currentFPS,
      resolution: this.canvas ? `${this.canvas.width}x${this.canvas.height}` : 'N/A',
      quality: adaptiveQualityController.currentQuality
    };
  }
}

export default OptimizedScreenShare;
