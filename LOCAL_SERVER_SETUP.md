# Fluxy Backend - Ngrok Setup Guide

## 🚀 Quick Start

### 1. Backend'i Başlatın
```bash
cd backend
npm run dev
```

### 2. Ngrok Tunnel Açın
```bash
ngrok http 3001
```

### 3. Ngrok URL'ini Kopyalayın
Ngrok size şöyle bir URL verecek:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:3001
```

### 4. Environment Dosyalarını Güncelleyin

**frontend/.env.production:**
```env
REACT_APP_API_URL=https://abc123.ngrok.io
REACT_APP_WS_URL=wss://abc123.ngrok.io
REACT_APP_SOCKET_URL=https://abc123.ngrok.io
```

**frontend/.env.local:** (aynı şekilde)

### 5. Frontend'i Netlify'da Deploy Edin
```bash
cd frontend
npm run build
```

## 🎯 Otomatik Başlatma

`start-ngrok.bat` dosyasını çalıştırın:
- Backend otomatik başlar
- Ngrok tunnel otomatik açılır
- URL'i kopyalayıp environment dosyalarına yapıştırın

## ✅ Avantajları

✅ **Gerçek WebSocket** - Tam Socket.IO desteği
✅ **Voice Chat** - WebRTC ile ses chat
✅ **Real-time** - Anında mesajlaşma
✅ **Free** - Ngrok free plan yeterli
✅ **Easy Setup** - 5 dakikada hazır

## ⚠️ Dikkat Edilecekler

- Bilgisayarınız açık kalmalı
- Ngrok URL'i her seferinde değişir (free plan)
- Environment dosyalarını her ngrok restart'ta güncelleyin

## 🔧 Pro Tips

1. **Sabit URL için**: Ngrok paid plan ($8/ay)
2. **Otomatik güncelleme**: Script ile environment update
3. **Multiple domains**: Ngrok multiple tunnels

## 🚀 Production Ready

- Frontend: Netlify (https://fluxycorn.netlify.app)
- Backend: Kendi bilgisayarınız + Ngrok
- WebSocket: Tam destekli ✅
- Voice Chat: Çalışır ✅