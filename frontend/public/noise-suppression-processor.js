// Discord-like Noise Suppression AudioWorklet Processor
class NoiseSuppressionProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Discord-like noise suppression parameters
    this.config = {
      noiseGate: -40,           // dB threshold for noise gate
      smoothingFactor: 0.85,    // Smoothing for level calculation
      attackTime: 0.003,        // Attack time in seconds (3ms)
      releaseTime: 0.1,         // Release time in seconds (100ms)
      lookAheadTime: 0.005,     // Look-ahead time (5ms)
      spectralSubtraction: 0.6, // Spectral subtraction factor
      adaptiveThreshold: true   // Enable adaptive threshold
    };
    
    // State variables
    this.previousLevel = -100;
    this.currentGain = 0;
    this.targetGain = 0;
    this.levelHistory = [];
    this.noiseProfile = new Array(256).fill(-80); // Noise profile for spectral subtraction
    this.frameCount = 0;
    this.isLearningNoise = true;
    this.learningFrames = 100; // Learn noise profile for first 100 frames
    
    // Smoothing filters
    this.attackCoeff = Math.exp(-1 / (this.config.attackTime * sampleRate));
    this.releaseCoeff = Math.exp(-1 / (this.config.releaseTime * sampleRate));
    
    console.log('🔇 Noise Suppression Processor initialized');
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (input.length === 0 || output.length === 0) {
      return true;
    }
    
    const inputChannel = input[0];
    const outputChannel = output[0];
    const frameSize = inputChannel.length;
    
    if (frameSize === 0) {
      return true;
    }
    
    try {
      // Calculate RMS level
      let rms = 0;
      for (let i = 0; i < frameSize; i++) {
        rms += inputChannel[i] * inputChannel[i];
      }
      rms = Math.sqrt(rms / frameSize);
      
      // Convert to dB
      const currentLevel = rms > 0 ? 20 * Math.log10(rms) : -100;
      
      // Smooth the level
      this.previousLevel = this.config.smoothingFactor * this.previousLevel + 
                          (1 - this.config.smoothingFactor) * currentLevel;
      
      // Update level history for adaptive threshold
      this.levelHistory.push(this.previousLevel);
      if (this.levelHistory.length > 50) {
        this.levelHistory.shift();
      }
      
      // Learn noise profile during initial frames
      if (this.isLearningNoise && this.frameCount < this.learningFrames) {
        this.updateNoiseProfile(inputChannel);
        this.frameCount++;
        
        if (this.frameCount >= this.learningFrames) {
          this.isLearningNoise = false;
          console.log('🎓 Noise profile learning completed');
        }
      }
      
      // Calculate adaptive threshold
      let threshold = this.config.noiseGate;
      if (this.config.adaptiveThreshold && this.levelHistory.length > 10) {
        const avgLevel = this.levelHistory.reduce((a, b) => a + b, 0) / this.levelHistory.length;
        const minLevel = Math.min(...this.levelHistory);
        threshold = Math.max(this.config.noiseGate, minLevel + 6); // 6dB above noise floor
      }
      
      // Determine target gain based on noise gate
      if (this.previousLevel > threshold) {
        this.targetGain = 1.0; // Pass through
      } else {
        // Apply spectral subtraction for noise below threshold
        const suppressionFactor = Math.max(0.1, 
          1 - this.config.spectralSubtraction * Math.exp((this.previousLevel - threshold) / 10)
        );
        this.targetGain = suppressionFactor;
      }
      
      // Smooth gain changes (attack/release)
      const coeff = this.targetGain > this.currentGain ? this.attackCoeff : this.releaseCoeff;
      this.currentGain = this.targetGain + (this.currentGain - this.targetGain) * coeff;
      
      // Apply gain with soft clipping
      for (let i = 0; i < frameSize; i++) {
        let sample = inputChannel[i] * this.currentGain;
        
        // Soft clipping to prevent harsh cutoffs
        if (Math.abs(sample) > 0.95) {
          sample = Math.sign(sample) * (0.95 + 0.05 * Math.tanh((Math.abs(sample) - 0.95) * 10));
        }
        
        outputChannel[i] = sample;
      }
      
      // Send level info to main thread occasionally
      if (this.frameCount % 100 === 0) {
        this.port.postMessage({
          type: 'level',
          level: this.previousLevel,
          gain: this.currentGain,
          threshold: threshold
        });
      }
      
    } catch (error) {
      // Fallback: pass through on error
      for (let i = 0; i < frameSize; i++) {
        outputChannel[i] = inputChannel[i];
      }
    }
    
    return true;
  }
  
  updateNoiseProfile(inputChannel) {
    // Simple noise profile update (could be more sophisticated)
    const frameSize = inputChannel.length;
    let rms = 0;
    
    for (let i = 0; i < frameSize; i++) {
      rms += inputChannel[i] * inputChannel[i];
    }
    
    rms = Math.sqrt(rms / frameSize);
    const level = rms > 0 ? 20 * Math.log10(rms) : -100;
    
    // Update noise profile with exponential smoothing
    const alpha = 0.1;
    const profileIndex = Math.min(255, Math.max(0, Math.floor((level + 100) * 2.55)));
    this.noiseProfile[profileIndex] = alpha * level + (1 - alpha) * this.noiseProfile[profileIndex];
  }
}

// Register the processor
registerProcessor('noise-suppression-processor', NoiseSuppressionProcessor);
