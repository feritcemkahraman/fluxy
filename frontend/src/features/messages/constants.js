// Messages Feature Constants - Discord Style

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system',
  VOICE: 'voice'
};

export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  OPTIMISTIC: 'optimistic'
};

export const TYPING_TIMEOUT = 3000; // 3 seconds
export const MESSAGE_BATCH_SIZE = 50;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const SUPPORTED_FILE_TYPES = {
  IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  DOCUMENTS: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
  ARCHIVES: ['zip', 'rar', '7z', 'tar', 'gz'],
  AUDIO: ['mp3', 'wav', 'ogg', 'm4a', 'flac'],
  VIDEO: ['mp4', 'avi', 'mkv', 'mov', 'webm']
};

export const MESSAGE_REACTIONS = {
  LIKE: '👍',
  LOVE: '❤️',
  LAUGH: '😂',
  SURPRISE: '😮',
  SAD: '😢',
  ANGRY: '😠'
};

export const MESSAGE_ERRORS = {
  TOO_LONG: 'Mesaj çok uzun (maksimum 2000 karakter)',
  EMPTY: 'Boş mesaj gönderilemez',
  FILE_TOO_LARGE: 'Dosya çok büyük (maksimum 25MB)',
  UNSUPPORTED_FILE: 'Desteklenmeyen dosya türü',
  NETWORK_ERROR: 'Bağlantı hatası, lütfen tekrar deneyin',
  SEND_FAILED: 'Mesaj gönderilemedi',
  LOAD_FAILED: 'Mesajlar yüklenemedi'
};

export const SYSTEM_MESSAGES = {
  USER_JOINED: '{user} sohbete katıldı',
  USER_LEFT: '{user} sohbetten ayrıldı',
  CHANNEL_CREATED: 'Kanal oluşturuldu',
  CHANNEL_DELETED: 'Kanal silindi'
};
