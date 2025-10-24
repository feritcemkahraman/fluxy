/**
 * Asset Helper - Discord-like Asset Management
 * Centralized asset path resolution for web and Electron
 * 
 * @module assetHelper
 */

/**
 * Check if running in Electron
 * @returns {boolean}
 */
const isElectron = () => {
  return window.electronAPI || 
         window.isElectron || 
         window.location.protocol === 'file:';
};

/**
 * Get asset path with proper protocol handling
 * @param {string} path - Relative path from public folder (e.g., 'sounds/giris.wav')
 * @returns {string} - Full path to asset
 */
export const getAssetPath = (path) => {
  // Remove leading slash if exists
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  if (isElectron()) {
    // Electron: Use relative path from index.html location
    // Build structure: build/index.html, build/sounds/, build/pepe/
    return `./${cleanPath}`;
  }
  
  // Web: Use absolute path from root
  return `/${cleanPath}`;
};

/**
 * Get sound file path
 * @param {string} filename - Sound filename (e.g., 'giris.wav')
 * @returns {string}
 */
export const getSoundPath = (filename) => {
  return getAssetPath(`sounds/${filename}`);
};

/**
 * Get Pepe emoji path
 * @param {string} filename - Pepe filename (e.g., '4304-pepe.png')
 * @returns {string}
 */
export const getPepePath = (filename) => {
  return getAssetPath(`pepe/${filename}`);
};

/**
 * Preload audio file
 * @param {string} path - Audio file path
 * @returns {Promise<HTMLAudioElement>}
 */
export const preloadAudio = (path) => {
  return new Promise((resolve, reject) => {
    const audio = new Audio(path);
    audio.addEventListener('canplaythrough', () => resolve(audio), { once: true });
    audio.addEventListener('error', reject, { once: true });
    audio.load();
  });
};

/**
 * Preload image
 * @param {string} path - Image file path
 * @returns {Promise<HTMLImageElement>}
 */
export const preloadImage = (path) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = path;
  });
};

export default {
  getAssetPath,
  getSoundPath,
  getPepePath,
  preloadAudio,
  preloadImage,
};
