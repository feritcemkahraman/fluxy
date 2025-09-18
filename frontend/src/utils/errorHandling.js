class APIError extends Error {
  constructor(message, status, code, details = {}) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class NetworkError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

const handleAPIError = (error) => {
  console.error('API Error Details:', {
    message: error.message,
    status: error.status,
    url: error.config?.url,
    method: error.config?.method,
    timestamp: new Date().toISOString()
  });

  // Network errors
  if (error.code === 'ERR_NETWORK' || !error.response) {
    return new NetworkError(
      'Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.',
      error
    );
  }

  // HTTP errors
  const status = error.response?.status;
  const data = error.response?.data;

  switch (status) {
    case 400:
      return new APIError(
        data?.message || 'Geçersiz istek',
        status,
        'BAD_REQUEST',
        data
      );
    case 401:
      return new APIError(
        'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
        status,
        'UNAUTHORIZED',
        data
      );
    case 403:
      return new APIError(
        'Bu işlem için yetkiniz bulunmuyor.',
        status,
        'FORBIDDEN',
        data
      );
    case 404:
      return new APIError(
        'Aradığınız kaynak bulunamadı.',
        status,
        'NOT_FOUND',
        data
      );
    case 409:
      return new APIError(
        data?.message || 'Bu veri zaten mevcut.',
        status,
        'CONFLICT',
        data
      );
    case 429:
      return new APIError(
        'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.',
        status,
        'RATE_LIMITED',
        data
      );
    case 500:
      return new APIError(
        'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
        status,
        'SERVER_ERROR',
        data
      );
    default:
      return new APIError(
        data?.message || 'Beklenmeyen bir hata oluştu.',
        status,
        'UNKNOWN_ERROR',
        data
      );
  }
};

const retryRequest = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw handleAPIError(error);
      }
      
      // Don't retry on the last attempt
      if (i === maxRetries) {
        throw handleAPIError(error);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  
  throw handleAPIError(lastError);
};

export { APIError, NetworkError, handleAPIError, retryRequest };