// Audio Manager for Fluxy sound effects
class AudioManager {
  constructor() {
    this.audioContext = null;
    this.sounds = new Map();
    this.volume = 0.4; // Sabit sistem ses seviyesi
    this.isLoaded = false;
    
    // Initialize audio context on first user interaction
    this.initAudioContext();
    
    // Load sounds when audio context is ready
    this.ensureAudioContextAndLoadSounds();
  }

  async ensureAudioContextAndLoadSounds() {
    try {
      if (!this.audioContext) {
        this.initAudioContext();
      }
      
      if (this.audioContext && !this.isLoaded) {
        await this.loadSounds();
        this.isLoaded = true;
      }
    } catch (error) {
      // Audio initialization failed, continue silently
    }
  }

  initAudioContext() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        // Web Audio API not supported
      }
    }
  }

  // Load sound effects using HTML Audio API
  async loadSounds() {
    const { getSoundPath } = await import('./assetHelper');
    
    const soundFiles = {
      'voice-join': getSoundPath('giris.wav'),
      'voice-leave': getSoundPath('cikis.wav')
    };

    for (const [name, url] of Object.entries(soundFiles)) {
      try {
        // Create HTML Audio element
        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = this.volume;
        
        // Test if audio can be loaded
        await new Promise((resolve, reject) => {
          audio.addEventListener('canplaythrough', () => {
            resolve();
          });
          
          audio.addEventListener('error', (e) => {
            reject(e);
          });
          
          audio.src = url;
        });
        
        // Store as HTML Audio element
        this.sounds.set(name, audio);
        
      } catch (error) {
        // Fallback to generated sounds
        try {
          if (this.audioContext) {
            const fallbackGenerator = name === 'voice-join' ? 
              this.generateJoinSound.bind(this) : 
              this.generateLeaveSound.bind(this);
            const fallbackBuffer = await fallbackGenerator();
            this.sounds.set(name, fallbackBuffer);
          }
        } catch (fallbackError) {
          // Fallback also failed, continue silently
        }
      }
    }
  }

  // Generate Discord-like voice channel join sound
  async generateJoinSound() {
    const sampleRate = 44100;
    const duration = 0.4; // 400ms
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < channelData.length; i++) {
        const t = i / sampleRate;
        
        // Discord join sound: Rising tone with harmonics
        const freq1 = 800 + (t * 400); // Rising from 800Hz to 1200Hz
        const freq2 = 1200 + (t * 200); // Rising from 1200Hz to 1400Hz
        
        const envelope = Math.exp(-t * 3) * Math.sin(t * Math.PI * 5); // Fade out envelope
        
        channelData[i] = (
          Math.sin(2 * Math.PI * freq1 * t) * 0.3 +
          Math.sin(2 * Math.PI * freq2 * t) * 0.2
        ) * envelope * 0.4;
      }
    }
    
    return buffer;
  }

  // Generate Discord-like voice channel leave sound
  async generateLeaveSound() {
    const sampleRate = 44100;
    const duration = 0.3; // 300ms
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < channelData.length; i++) {
        const t = i / sampleRate;
        
        // Discord leave sound: Falling tone
        const freq1 = 1000 - (t * 600); // Falling from 1000Hz to 400Hz
        const freq2 = 600 - (t * 300); // Falling from 600Hz to 300Hz
        
        const envelope = Math.exp(-t * 4) * Math.sin(t * Math.PI * 4); // Fade out envelope
        
        channelData[i] = (
          Math.sin(2 * Math.PI * freq1 * t) * 0.3 +
          Math.sin(2 * Math.PI * freq2 * t) * 0.2
        ) * envelope * 0.4;
      }
    }
    
    return buffer;
  }

  // Play a sound effect
  async playSound(soundName, volume = null) {
    // Ensure audio context and sounds are loaded
    await this.ensureAudioContextAndLoadSounds();
    
    const sound = this.sounds.get(soundName);
    if (!sound) {
      return;
    }

    try {
      // Check if it's HTML Audio element
      if (sound instanceof HTMLAudioElement) {
        // Set volume
        const finalVolume = volume !== null ? volume : this.volume;
        sound.volume = finalVolume;
        
        // Clone audio to allow multiple simultaneous plays
        const audioClone = sound.cloneNode();
        audioClone.volume = finalVolume;
        
        await audioClone.play();
        
      } else {
        // Web Audio API buffer
        
        if (!this.audioContext) {
          return;
        }

        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = sound;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Set volume
        const finalVolume = volume !== null ? volume : this.volume;
        gainNode.gain.setValueAtTime(finalVolume, this.audioContext.currentTime);
        
        source.start();
      }
      
    } catch (error) {
      // Error handled silently
    }
  }

  // Voice channel specific methods
  async playVoiceJoin() {
    await this.playSound('voice-join', 0.6);
  }

  async playVoiceLeave() {
    await this.playSound('voice-leave', 0.5);
  }
}

// Create singleton instance
const audioManager = new AudioManager();

export default audioManager;