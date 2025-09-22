// Optimized Voice Channel State Management
class VoiceStateManager {
  constructor() {
    this.channelUsers = new Map();
    this.updateQueue = new Map();
    this.subscribers = new Set();
  }

  // Debounced state updates
  debouncedUpdate(channelId, users) {
    if (this.updateQueue.has(channelId)) {
      clearTimeout(this.updateQueue.get(channelId));
    }

    const timeout = setTimeout(() => {
      this.channelUsers.set(channelId, users);
      this.notifySubscribers();
      this.updateQueue.delete(channelId);
    }, 50); // 50ms debounce

    this.updateQueue.set(channelId, timeout);
  }

  updateChannel(channelId, users) {
    // Prevent unnecessary updates
    const currentUsers = this.channelUsers.get(channelId) || [];
    if (this.arraysEqual(currentUsers, users)) {
      return;
    }

    this.debouncedUpdate(channelId, users);
  }

  arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => val === b[i]);
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    const state = Object.fromEntries(this.channelUsers);
    this.subscribers.forEach(callback => callback(state));
  }

  getChannelUsers(channelId) {
    return this.channelUsers.get(channelId) || [];
  }

  getAllChannels() {
    return Object.fromEntries(this.channelUsers);
  }
}

// Usage in FluxyApp.jsx
const voiceStateManager = new VoiceStateManager();

const handleVoiceChannelSync = useCallback((data) => {
  console.log('🔄 Voice channel sync received:', data);
  
  if (data.channelId && Array.isArray(data.connectedUsers)) {
    voiceStateManager.updateChannel(data.channelId, data.connectedUsers);
  }
}, []);

// Subscribe to state changes
useEffect(() => {
  return voiceStateManager.subscribe((newState) => {
    setVoiceChannelUsers(newState);
  });
}, []);

export { VoiceStateManager, voiceStateManager };