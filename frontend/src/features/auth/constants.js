// Auth Feature Constants - Discord Style

export const AUTH_MODES = {
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT_PASSWORD: 'forgot_password',
  RESET_PASSWORD: 'reset_password'
};

export const AUTH_VALIDATION_RULES = {
  EMAIL: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Geçerli bir e-posta adresi giriniz'
  },
  PASSWORD: {
    required: true,
    minLength: 6,
    message: 'Şifre en az 6 karakter olmalıdır'
  },
  USERNAME: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: 'Kullanıcı adı 3-20 karakter arası olmalı ve sadece harf, rakam, alt çizgi içerebilir'
  },
  DISPLAY_NAME: {
    required: true,
    minLength: 2,
    maxLength: 32,
    message: 'Görünen ad 2-32 karakter arası olmalıdır'
  }
};

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Geçersiz e-posta veya şifre',
  USER_EXISTS: 'Bu e-posta adresi zaten kullanımda',
  WEAK_PASSWORD: 'Şifre çok zayıf',
  NETWORK_ERROR: 'Bağlantı hatası, lütfen tekrar deneyin',
  SERVER_ERROR: 'Sunucu hatası, lütfen daha sonra tekrar deneyin'
};

export const AUTH_SUCCESS_MESSAGES = {
  LOGIN: 'Başarıyla giriş yapıldı!',
  REGISTER: 'Hesabınız başarıyla oluşturuldu!',
  LOGOUT: 'Başarıyla çıkış yapıldı',
  PASSWORD_RESET: 'Şifre sıfırlama bağlantısı e-postanıza gönderildi'
};
