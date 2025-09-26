// Discord-like Automatic Gain Control AudioWorklet Processor
class AGCProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Discord-like AGC parameters
    this.config = {
      targetLevel: -23,         // dBFS target level (Discord standard)
      maxGain: 18,              // Maximum gain in dB
      minGain: -12,             // Minimum gain in dB
      adaptationRate: 0.05,     // Learning rate for gain adjustment
      attackTime: 0.01,         // Attack time in seconds (10ms)
      releaseTime: 0.5,         // Release time in seconds (500ms)
      lookAheadTime: 0.01,      // Look-ahead time (10ms)
      compressionRatio: 3,      // Compression ratio above target
      noiseGate: -60,           // Noise gate threshold in dB
      holdTime: 0.1             // Hold time for peak detection
    };
    
    // State variables
    this.currentGain = 0;       // Current gain in dB
    this.targetGain = 0;        // Target gain in dB
    this.peakLevel = -100;      // Peak level detector
    this.averageLevel = -100;   // Average level (RMS)
    this.levelHistory = [];     // Level history for adaptation
    this.peakHoldCounter = 0;   // Peak hold counter
    this.frameCount = 0;
    
    // Smoothing coefficients
    this.attackCoeff = Math.exp(-1 / (this.config.attackTime * sampleRate));
    this.releaseCoeff = Math.exp(-1 / (this.config.releaseTime * sampleRate));
    this.peakReleaseCoeff = Math.exp(-1 / (this.config.holdTime * sampleRate));
    
    // Circular buffer for look-ahead
    this.lookAheadBuffer = new Float32Array(Math.ceil(this.config.lookAheadTime * sampleRate));
    this.bufferIndex = 0;
    
    // AGC Processor initialized
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
      // Process each sample
      for (let i = 0; i < frameSize; i++) {
        const inputSample = inputChannel[i];
        
        // Store in look-ahead buffer
        this.lookAheadBuffer[this.bufferIndex] = inputSample;
        
        // Get delayed sample for processing
        const delaySamples = Math.floor(this.config.lookAheadTime * sampleRate);
        const delayedIndex = (this.bufferIndex - delaySamples + this.lookAheadBuffer.length) % this.lookAheadBuffer.length;
        const delayedSample = this.lookAheadBuffer[delayedIndex];
        
        // Calculate instantaneous level
        const instantLevel = Math.abs(inputSample);
        const instantLevelDb = instantLevel > 0 ? 20 * Math.log10(instantLevel) : -100;
        
        // Update peak detector with hold
        if (instantLevelDb > this.peakLevel) {
          this.peakLevel = instantLevelDb;
          this.peakHoldCounter = Math.floor(this.config.holdTime * sampleRate);
        } else if (this.peakHoldCounter > 0) {
          this.peakHoldCounter--;
        } else {
          // Release peak
          this.peakLevel = this.peakLevel * this.peakReleaseCoeff + instantLevelDb * (1 - this.peakReleaseCoeff);
        }
        
        // Update average level (RMS-like)
        this.averageLevel = 0.99 * this.averageLevel + 0.01 * instantLevelDb;
        
        // Calculate required gain every few samples
        if (i % 16 === 0) {
          this.updateGain();
        }
        
        // Apply gain with smooth transitions
        const linearGain = Math.pow(10, this.currentGain / 20);
        let outputSample = delayedSample * linearGain;
        
        // Soft limiting to prevent clipping
        if (Math.abs(outputSample) > 0.95) {
          const sign = Math.sign(outputSample);
          const magnitude = Math.abs(outputSample);
          outputSample = sign * (0.95 + 0.05 * Math.tanh((magnitude - 0.95) * 20));
        }
        
        outputChannel[i] = outputSample;
        
        // Advance buffer index
        this.bufferIndex = (this.bufferIndex + 1) % this.lookAheadBuffer.length;
      }
      
      // Send status to main thread occasionally
      if (this.frameCount % 200 === 0) {
        this.port.postMessage({
          type: 'status',
          currentGain: this.currentGain,
          targetGain: this.targetGain,
          peakLevel: this.peakLevel,
          averageLevel: this.averageLevel
        });
      }
      
      this.frameCount++;
      
    } catch (error) {
      // Fallback: pass through on error
      for (let i = 0; i < frameSize; i++) {
        outputChannel[i] = inputChannel[i];
      }
    }
    
    return true;
  }
  
  updateGain() {
    // Use peak level for gain calculation (more responsive)
    const controlLevel = Math.max(this.peakLevel, this.averageLevel);
    
    // Apply noise gate
    if (controlLevel < this.config.noiseGate) {
      this.targetGain = this.config.minGain;
      return;
    }
    
    // Calculate required gain to reach target level
    let requiredGain = this.config.targetLevel - controlLevel;
    
    // Apply compression above target level
    if (controlLevel > this.config.targetLevel) {
      const excess = controlLevel - this.config.targetLevel;
      const compressedExcess = excess / this.config.compressionRatio;
      requiredGain = this.config.targetLevel - (controlLevel - compressedExcess);
      requiredGain = requiredGain - controlLevel;
    }
    
    // Clamp gain to limits
    requiredGain = Math.max(this.config.minGain, Math.min(this.config.maxGain, requiredGain));
    
    // Smooth gain changes
    const gainDiff = requiredGain - this.currentGain;
    const coeff = gainDiff > 0 ? this.attackCoeff : this.releaseCoeff;
    
    // Apply adaptation rate
    const adaptedGainDiff = gainDiff * this.config.adaptationRate;
    this.targetGain = this.currentGain + adaptedGainDiff;
    
    // Smooth the gain
    this.currentGain = this.targetGain + (this.currentGain - this.targetGain) * coeff;
    
    // Update level history for long-term adaptation
    this.levelHistory.push(controlLevel);
    if (this.levelHistory.length > 100) {
      this.levelHistory.shift();
      
      // Adaptive target adjustment based on long-term average
      const longTermAvg = this.levelHistory.reduce((a, b) => a + b, 0) / this.levelHistory.length;
      if (Math.abs(longTermAvg - this.config.targetLevel) > 3) {
        // Gradually adjust adaptation rate if consistently off-target
        this.config.adaptationRate = Math.min(0.1, this.config.adaptationRate * 1.01);
      }
    }
  }
}

// Register the processor
registerProcessor('agc-processor', AGCProcessor);
