// Code Quality Issues ve Çözümleri

## 🔴 Mevcut Problemler:

### 1. Code Duplication
```javascript
// Bu kod 3 farklı yerde tekrarlanıyor:
const allConnectedUserIds = updatedChannel.connectedUsers.map(cu => {
  const userId = cu.user?._id?.toString() || cu.user?.id?.toString() || cu.user?.toString();
  return userId;
}).filter((userId, index, array) => array.indexOf(userId) === index);
```

### 2. Error Handling Eksik
```javascript
// Database işlemleri try-catch içinde ama socket events'ler değil
socket.on('joinVoiceChannel', async (data) => {
  // Error handling sadece dış try-catch'de
});
```

### 3. Magic Numbers
```javascript
// Debounce values hardcoded
setTimeout(() => {}, 100); // Neden 100ms?
```

### 4. Inconsistent Naming
```javascript
// Bazen channelId, bazen channel_id
io.to(`voice:${channelId}`)
io.to(`server_${channel.server}`)
```

### 5. Memory Leaks
```javascript
// Socket disconnect'de cleanup eksik
const voiceChannels = new Map(); // Bu hiç temizlenmiyor
```

## ✅ Çözüm Önerileri:

### 1. Utility Functions
```javascript
const VoiceUtils = {
  extractUserIds(connectedUsers) {
    return connectedUsers
      .map(cu => cu.user?._id?.toString() || cu.user?.toString())
      .filter(Boolean)
      .filter((id, index, arr) => arr.indexOf(id) === index);
  },

  createVoiceRoomName(channelId) {
    return `voice:${channelId}`;
  },

  createServerRoomName(serverId) {
    return `server_${serverId}`;
  }
};
```

### 2. Error Boundaries
```javascript
const withErrorHandling = (handler) => {
  return async (...args) => {
    try {
      await handler(...args);
    } catch (error) {
      console.error(`Voice channel error in ${handler.name}:`, error);
      // Specific error handling per operation
    }
  };
};
```

### 3. Configuration
```javascript
const VOICE_CONFIG = {
  DEBOUNCE_MS: 100,
  MAX_CHANNEL_USERS: 50,
  SYNC_TIMEOUT_MS: 5000,
  RECONNECT_ATTEMPTS: 3
};
```

### 4. Type Safety (TypeScript benzeri)
```javascript
/**
 * @typedef {Object} VoiceChannelData
 * @property {string} channelId
 * @property {string[]} connectedUsers
 */

/**
 * @typedef {Object} VoiceUser
 * @property {string} user - User ID
 * @property {Date} joinedAt
 * @property {boolean} isMuted
 * @property {boolean} isDeafened
 */
```

## 📊 Performance Metrics:

### Şu anki durumda:
- Her join/leave: 3-4 emit event
- Database: 2-3 query per operation
- Memory: Map'ler cleanup edilmiyor
- Network: Aynı data 3 kere gönderiliyor

### Optimize edildikten sonra:
- Her join/leave: 1 emit event (debounced)
- Database: 1 batch query per operation
- Memory: Auto cleanup with TTL
- Network: %70 daha az trafik