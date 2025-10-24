/**
 * Hybrid Noise Suppression Manager - Discord-like AI Noise Cancellation
 * 
 * Supports:
 * 1. NVIDIA RTX Voice (GPU-accelerated, best quality)
 * 2. RNNoise AI (Cross-platform, good quality)
 * 3. Native WebRTC (Fallback, basic quality)
 * 
 * Auto-detects GPU and selects best available option
 */

import { createNoiseSuppressor } from '@sapphi-red/web-noise-suppressor';
import devLog from '../utils/devLogger';

class NoiseSuppressionManager {
  constructor() {
    this.mode = 'auto'; // auto, rtx, rnnoise, native, off
    this.currentProcessor = null;
    this.noiseSuppressor = null;
    this.gpuInfo = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.destinationStream = null;
    
    // Performance stats
    this.stats = {
      mode: 'none',
      cpuUsage: 0,
      gpuUsage: 0,
      quality: 0
    };
  }

  // ==================== INITIALIZATION ====================

  /**
   * Initialize noise suppression system
   * Auto-detects best available option
   */
  async initialize(userPreference = 'auto') {
    try {
      devLog.log('🎤 Initializing Noise Suppression...');
      
      // Detect GPU capabilities
      await this.detectGPU();
      
      // Determine best mode based on preference and availability
      const mode = await this.determineBestMode(userPreference);
      
      // Set the mode
      this.mode = mode;
      this.stats.mode = mode;
      
      devLog.log(`✅ Noise Suppression initialized: ${mode.toUpperCase()}`);
      return { success: true, mode };
      
    } catch (error) {
      console.error('❌ Noise Suppression init failed:', error);
      this.mode = 'native';
      this.stats.mode = 'native';
      return { success: false, mode: 'native', error: error.message };
    }
  }

  /**
   * Detect GPU capabilities (NVIDIA RTX, AMD, etc.)
   */
  async detectGPU() {
    try {
      // Check for NVIDIA RTX via Electron
      if (window.electronAPI?.getGPUInfo) {
        this.gpuInfo = await window.electronAPI.getGPUInfo();
        devLog.log('🎮 GPU Info:', this.gpuInfo);
        return this.gpuInfo;
      }

      // Fallback: WebGL GPU detection
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          
          this.gpuInfo = {
            vendor,
            renderer,
            isNVIDIA: renderer.toLowerCase().includes('nvidia'),
            isRTX: renderer.toLowerCase().includes('rtx') || renderer.toLowerCase().includes('geforce')
          };
          
          devLog.log('🎮 GPU detected:', this.gpuInfo);
        }
      }
      
      return this.gpuInfo;
      
    } catch (error) {
      console.warn('⚠️ GPU detection failed:', error);
      this.gpuInfo = { vendor: 'unknown', renderer: 'unknown', isNVIDIA: false, isRTX: false };
      return this.gpuInfo;
    }
  }

  /**
   * Determine best noise suppression mode
   */
  async determineBestMode(userPreference) {
    // If user explicitly disabled
    if (userPreference === 'off') {
      return 'off';
    }

    // If user selected specific mode and it's available
    if (userPreference === 'rtx' && this.isRTXAvailable()) {
      return 'rtx';
    }
    
    if (userPreference === 'rnnoise') {
      return 'rnnoise';
    }
    
    if (userPreference === 'native') {
      return 'native';
    }

    // Auto mode: Select best available
    if (userPreference === 'auto') {
      // Check RTX Voice availability
      if (this.isRTXAvailable()) {
        devLog.log('✨ RTX Voice available! Using GPU acceleration');
        return 'rtx';
      }
      
      // Fallback to RNNoise (good quality, cross-platform)
      devLog.log('🎵 Using RNNoise AI (cross-platform)');
      return 'rnnoise';
    }

    // Default fallback
    return 'rnnoise';
  }

  /**
   * Check if RTX Voice is available
   */
  isRTXAvailable() {
    // Windows only
    if (!window.electronAPI?.platform || window.electronAPI.platform() !== 'win32') {
      return false;
    }

    // NVIDIA RTX GPU required
    if (!this.gpuInfo?.isNVIDIA || !this.gpuInfo?.isRTX) {
      return false;
    }

    // Check if RTX Voice SDK is installed
    if (window.electronAPI?.checkRTXVoice) {
      return window.electronAPI.checkRTXVoice();
    }

    return false;
  }

  // ==================== AUDIO PROCESSING ====================

  /**
   * Process audio stream with selected noise suppression mode
   * @param {MediaStream} inputStream - Original audio stream
   * @param {string} mode - 'rtx', 'rnnoise', 'native', or 'off'
   * @returns {Promise<MediaStream>} Processed audio stream
   */
  async processAudioStream(inputStream, mode = this.mode) {
    try {
      devLog.log(`🎤 Processing audio with mode: ${mode}`);

      // No processing
      if (mode === 'off' || mode === 'native') {
        return inputStream;
      }

      // RTX Voice processing
      if (mode === 'rtx') {
        return await this.processWithRTX(inputStream);
      }

      // RNNoise AI processing
      if (mode === 'rnnoise') {
        return await this.processWithRNNoise(inputStream);
      }

      // Fallback to original stream
      return inputStream;

    } catch (error) {
      console.error('❌ Audio processing failed:', error);
      // Fallback to original stream on error
      return inputStream;
    }
  }

  /**
   * Process with NVIDIA RTX Voice (GPU-accelerated)
   */
  async processWithRTX(inputStream) {
    try {
      devLog.log('🎮 Processing with RTX Voice...');

      if (!window.electronAPI?.processAudioWithRTX) {
        throw new Error('RTX Voice API not available');
      }

      // Use Electron main process for RTX processing
      const processedStream = await window.electronAPI.processAudioWithRTX(inputStream);
      
      this.stats = {
        mode: 'rtx',
        cpuUsage: 1, // Very low CPU
        gpuUsage: 15, // GPU does the work
        quality: 95 // Best quality
      };

      devLog.log('✅ RTX Voice processing active');
      return processedStream;

    } catch (error) {
      console.error('❌ RTX Voice failed, falling back to RNNoise:', error);
      return await this.processWithRNNoise(inputStream);
    }
  }

  /**
   * Process with RNNoise AI (Cross-platform)
   */
  async processWithRNNoise(inputStream) {
    try {
      devLog.log('🎵 Processing with RNNoise AI...');

      // Clean up previous processor
      if (this.noiseSuppressor) {
        await this.cleanup();
      }

      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 48000,
        latencyHint: 'interactive'
      });

      // Create RNNoise suppressor
      this.noiseSuppressor = await createNoiseSuppressor(this.audioContext);

      // Create audio nodes
      this.sourceNode = this.audioContext.createMediaStreamSource(inputStream);
      
      // Connect: source → RNNoise → destination
      const processedNode = this.noiseSuppressor.createProcessor(this.sourceNode);
      const destination = this.audioContext.createMediaStreamDestination();
      processedNode.connect(destination);

      this.destinationStream = destination.stream;
      this.currentProcessor = 'rnnoise';

      this.stats = {
        mode: 'rnnoise',
        cpuUsage: 5, // Low CPU
        gpuUsage: 0,
        quality: 85 // Very good quality
      };

      devLog.log('✅ RNNoise AI processing active');
      return this.destinationStream;

    } catch (error) {
      console.error('❌ RNNoise failed, using native WebRTC:', error);
      
      this.stats = {
        mode: 'native',
        cpuUsage: 2,
        gpuUsage: 0,
        quality: 60 // Basic quality
      };
      
      return inputStream;
    }
  }

  // ==================== SETTINGS & CONTROLS ====================

  /**
   * Change noise suppression mode
   */
  async changeMode(newMode) {
    try {
      devLog.log(`🔄 Changing noise suppression mode: ${this.mode} → ${newMode}`);
      
      const oldMode = this.mode;
      this.mode = newMode;

      // Clean up current processor
      await this.cleanup();

      // Re-initialize with new mode
      const result = await this.initialize(newMode);
      
      if (!result.success) {
        // Rollback on failure
        this.mode = oldMode;
        throw new Error(result.error);
      }

      devLog.log(`✅ Mode changed to: ${newMode}`);
      return { success: true, mode: newMode };

    } catch (error) {
      console.error('❌ Mode change failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current stats
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get available modes based on system
   */
  getAvailableModes() {
    const modes = [
      { id: 'off', name: 'Kapalı', available: true, quality: 0 },
      { id: 'native', name: 'Standart (WebRTC)', available: true, quality: 60 },
      { id: 'rnnoise', name: 'Gelişmiş (RNNoise AI)', available: true, quality: 85, recommended: true },
    ];

    // Add RTX if available
    if (this.isRTXAvailable()) {
      modes.push({
        id: 'rtx',
        name: 'RTX Voice (NVIDIA GPU)',
        available: true,
        quality: 95,
        bestQuality: true
      });
    }

    return modes;
  }

  // ==================== CLEANUP ====================

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      // Stop RNNoise
      if (this.noiseSuppressor) {
        await this.noiseSuppressor.dispose();
        this.noiseSuppressor = null;
      }

      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        this.audioContext = null;
      }

      // Clean up streams
      if (this.destinationStream) {
        this.destinationStream.getTracks().forEach(track => track.stop());
        this.destinationStream = null;
      }

      this.sourceNode = null;
      this.processorNode = null;
      this.currentProcessor = null;

      devLog.log('✅ Noise suppression cleaned up');

    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

// Singleton instance
const noiseSuppressionManager = new NoiseSuppressionManager();
export default noiseSuppressionManager;
