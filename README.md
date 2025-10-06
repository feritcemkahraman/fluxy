# Fluxy - Discord Benzeri Chat Uygulaması

Modern, Discord-benzeri bir masaüstü chat uygulaması. Electron + React + MongoDB ile geliştirilmiştir.

## Özellikler

### Mesajlaşma
- **Gerçek zamanlı mesajlaşma** (Socket.IO)
- **Direkt mesajlar** (DM)
- **Kanal mesajları**
- **Dosya paylaşımı** (Drag & Drop)
- **Emoji & GIF desteği**
- **Mesaj tepkileri**

### Sesli Sohbet
- **WebRTC tabanlı sesli sohbet***
- **Mikrofon susturma/deafen***
- **Gerçek zamanlı katılımcı takibi***
- **Yüksek kaliteli ses** (48kHz, düşük gecikme)
- **Otomatik ses kazancı***
- **Gürültü önleme**

### Ekran Paylaşımı
- **1920x1080, 60fps ekran paylaşımı***
- **Pencere veya tam ekran seçimi***
- **HD/SD kalite kontrolü***
- **Sistem sesi desteği***
- **Çoklu ekran paylaşımı**

### Sunucu Yönetimi
- **Sunucu oluşturma/yönetme***
- **Kanal oluşturma** (Metin/Sesli)
- **Rol tabanlı izinler***
- **Sunucu şablonları***
- **Üye yönetimi**

### Kullanıcı Arayüzü
- **Modern Discord-benzeri tasarım***
- **Karanlık tema***
- **Responsive tasarım***
- **Animasyonlar** (Framer Motion)
- **Radix UI bileşenleri***
- **TailwindCSS styling**

## Teknolojiler

### Frontend
- **React 19** - UI framework
- **Electron 38** - Desktop app wrapper
- **TailwindCSS** - Styling
- **Radix UI** - UI components
- **Framer Motion** - Animations
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client
- **React Router v7** - Routing

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Socket.IO** - WebSocket server
- **JWT** - Authentication
- **Multer** - File uploads
- **Bcrypt** - Password hashing

## Sistem Gereksinimleri

- **Node.js**: >= 20.0.0
- **npm**: >= 10.0.0
- **MongoDB**: >= 6.0
- **RAM**: Minimum 4GB (8GB önerilen)
- **Disk**: 500MB boş alan

## Kurulum

### 1. Projeyi İndirin
```bash
git clone https://github.com/feritcemkahraman/yerli-milli-projem.git
cd yerli-milli-projem
```

### 2. Backend Kurulumu
```bash
cd backend
npm install

# .env dosyasını oluşturun
cp .env.example .env
# .env dosyasını düzenleyin (MongoDB URI, JWT Secret)
```

### 3. Frontend Kurulumu
```bash
cd ../frontend
npm install
```

### 4. MongoDB Kurulumu

#### Yerel MongoDB (Development)
```bash
# MongoDB'yi indirin ve kurun
# https://www.mongodb.com/try/download/community

# MongoDB'yi başlatın
mongod
```

#### MongoDB Atlas (Production)
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)'a kaydolun
2. Yeni bir cluster oluşturun
3. Database user oluşturun
4. IP whitelist'e ekleyin (0.0.0.0/0 tüm IP'ler için)
5. Connection string'i kopyalayın
6. Backend `.env` dosyasına ekleyin

## Kullanım

### Development Modu

#### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

#### Terminal 2 - Frontend (Web)
```bash
cd frontend
npm start
```

#### Terminal 3 - Electron
```bash
cd frontend
npm run electron-dev
```

### Çoklu Client Test (Electron)

#### Terminal 1 - Backend
```bash
cd backend
npm start
```

#### Terminal 2 - React Dev Server
```bash
cd frontend
npm start
```

#### Terminal 3 - Client 1
```bash
cd frontend
npm run electron-client1
```

#### Terminal 4 - Client 2
```bash
cd frontend
npm run electron-client2
```

## Production Build

### 1. React Build
```bash
cd frontend
npm run build
```

### 2. Electron Build

#### Windows
```bash
npm run dist:win
```

#### Linux
```bash
npm run dist:linux
```

#### Tüm Platformlar
```bash
npm run dist
```

Build dosyaları `frontend/dist/` klasöründe oluşacaktır.

## Güvenlik

### Production için Önemli Notlar

1. **Environment Variables**
   - `.env` dosyalarını asla commit etmeyin
   - Production'da güçlü JWT secret kullanın
   - MongoDB credentials'ı güvende tutun

2. **Electron Security***
   - Production build'de `--no-sandbox` ve `--disable-web-security` bayraklarını kaldırın
   - Context isolation aktif tutun
   - Node integration kapalı tutun

3. **Backend Security***
   - Rate limiting aktif
   - Helmet middleware aktif
   - CORS düzgün yapılandırılmış
   - Input validation yapılıyor

## Proje Yapısı

```
yerli-milli-projem/
├── backend/                 # Backend API
│   ├── models/             # MongoDB modelleri
│   ├── routes/             # API route'ları
│   ├── socket/             # Socket.IO handlers
│   ├── middleware/         # Express middleware
│   ├── managers/           # İş mantığı
│   └── server.js           # Ana server dosyası
│
├── frontend/               # Frontend Electron app
│   ├── src/
│   │   ├── components/    # React bileşenleri
│   │   ├── features/      # Feature modülleri
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API servisleri
│   │   ├── context/       # React Context
│   │   └── utils/         # Yardımcı fonksiyonlar
│   │
│   ├── public/            # Statik dosyalar
│   ├── index.js           # Electron main process
│   ├── preload.js         # Electron preload script
│   └── package.json       # Dependencies
│
└── README.md              # Bu dosya
```

## Bilinen Sorunlar

- Reaction özelliği henüz tamamlanmadı (TODO)
- Message retry özelliği henüz tamamlanmadı (TODO)
- Voice settings modal henüz tamamlanmadı (TODO)

## Katkıda Bulunma

1. Forkleyin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## Lisans

MIT License - Detaylar için `LICENSE` dosyasına bakın.

## Geliştirici

**Fluxy Team**
- GitHub: [@feritcemkahraman](https://github.com/feritcemkahraman)

## Teşekkürler

- Discord - UI/UX ilhamı için
- Electron - Desktop app framework
- React - UI library
- MongoDB - Database

## Destek

Sorun yaşarsanız:
1. [Issues](https://github.com/feritcemkahraman/yerli-milli-projem/issues) sayfasından yeni bir issue açın
2. Hata mesajını ve adımları detaylı yazın
3. Sistem bilgilerinizi ekleyin (OS, Node version, vb.)
