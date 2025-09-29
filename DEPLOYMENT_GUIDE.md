# 🚀 Deployment Guide - MongoDB Atlas & Local Setup

## ☁️ Option 1: MongoDB Atlas (Cloud - Recommended)

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for free account
3. Create new project: "Yerli Milli Projem"

### Step 2: Create Cluster
1. Click "Build a Database"
2. Choose **M0 Sandbox (FREE)**
3. Select region closest to you (Europe - Frankfurt)
4. Cluster name: `yerli-milli-cluster`

### Step 3: Create Database User
1. Go to "Database Access"
2. Add new user:
   - Username: `fluxy-admin`
   - Password: Generate secure password
   - Role: `Atlas admin`

### Step 4: Network Access
1. Go to "Network Access"
2. Add IP Address:
   - **For development**: `0.0.0.0/0` (Allow from anywhere)
   - **For production**: Add your specific IP

### Step 5: Get Connection String
1. Go to "Database" → "Connect"
2. Choose "Connect your application"
3. Copy connection string:
```
mongodb+srv://fluxy-admin:<password>@yerli-milli-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### Step 6: Update Backend Configuration
```javascript
// backend/.env
MONGODB_URI=mongodb+srv://fluxy-admin:<password>@yerli-milli-cluster.xxxxx.mongodb.net/fluxy-db?retryWrites=true&w=majority
```

---

## 🏠 Option 2: Local MongoDB Setup

### Step 1: Install MongoDB Community Server
1. Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Install with default settings
3. MongoDB will run on `localhost:27017`

### Step 2: Install MongoDB Compass (GUI)
1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect to `mongodb://localhost:27017`

### Step 3: Update Backend Configuration
```javascript
// backend/.env
MONGODB_URI=mongodb://localhost:27017/fluxy-db
```

---

## 🌐 Ngrok Setup for External Access

### Step 1: Install Ngrok
1. Download from [ngrok.com](https://ngrok.com/)
2. Sign up and get auth token
3. Run: `ngrok authtoken YOUR_TOKEN`

### Step 2: Expose Backend
```bash
# Terminal 1 - Start backend
cd backend
npm start

# Terminal 2 - Expose backend
ngrok http 5000
```

### Step 3: Expose Frontend
```bash
# Terminal 3 - Start frontend
cd frontend
npm run electron-dev

# Terminal 4 - Expose frontend (if needed for web access)
ngrok http 3000
```

### Step 4: Update Frontend Configuration
```javascript
// frontend/src/services/api.js
const BASE_URL = 'https://your-ngrok-url.ngrok.io/api';
```

---

## 🔧 Environment Variables Setup

### Backend (.env)
```env
# Database
MONGODB_URI=mongodb+srv://fluxy-admin:<password>@yerli-milli-cluster.xxxxx.mongodb.net/fluxy-db

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Server
PORT=5000
NODE_ENV=development

# File Upload
MAX_FILE_SIZE=50MB
UPLOAD_PATH=./uploads

# CORS
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
# API
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000

# Features
REACT_APP_ENABLE_VOICE_CHAT=true
REACT_APP_ENABLE_FILE_UPLOAD=true
```

---

## 🚀 Production Deployment

### Option 1: Heroku + MongoDB Atlas
1. Create Heroku app
2. Set environment variables in Heroku
3. Deploy backend to Heroku
4. Build and serve frontend

### Option 2: VPS + Docker
1. Create Docker containers
2. Use docker-compose for orchestration
3. Set up reverse proxy (nginx)
4. Configure SSL certificates

### Option 3: Vercel + MongoDB Atlas
1. Deploy backend to Vercel
2. Deploy frontend to Vercel
3. Configure environment variables

---

## 📊 Database Collections Structure

```javascript
// Users Collection
{
  _id: ObjectId,
  username: String,
  displayName: String,
  email: String,
  password: String (hashed),
  avatar: String,
  status: String,
  createdAt: Date
}

// Servers Collection
{
  _id: ObjectId,
  name: String,
  description: String,
  icon: String,
  owner: ObjectId,
  members: [ObjectId],
  channels: [ObjectId],
  createdAt: Date
}

// Channels Collection
{
  _id: ObjectId,
  name: String,
  type: String, // 'text' | 'voice'
  server: ObjectId,
  createdAt: Date
}

// Messages Collection
{
  _id: ObjectId,
  content: String,
  author: ObjectId,
  channel: ObjectId,
  attachments: [String],
  createdAt: Date
}

// DirectMessages Collection
{
  _id: ObjectId,
  content: String,
  author: ObjectId,
  conversation: ObjectId,
  createdAt: Date
}
```

---

## 🔍 Testing Your Setup

### 1. Test Database Connection
```bash
cd backend
npm start
# Should see: "✅ MongoDB connected successfully"
```

### 2. Test API Endpoints
```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"123456"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

### 3. Test Frontend Connection
1. Start frontend: `npm run electron-dev`
2. Register new account
3. Create server and channels
4. Test messaging and voice chat

---

## 🛠️ Troubleshooting

### MongoDB Atlas Issues
- **Connection timeout**: Check network access settings
- **Authentication failed**: Verify username/password
- **Database not found**: Check database name in connection string

### Local MongoDB Issues
- **Connection refused**: Ensure MongoDB service is running
- **Port conflict**: Check if port 27017 is available

### Ngrok Issues
- **Tunnel not found**: Restart ngrok
- **Rate limits**: Upgrade to paid plan for more tunnels
- **CORS errors**: Update CORS settings in backend

---

## 📈 Performance Optimization

### Database Indexing
```javascript
// Add indexes for better performance
db.users.createIndex({ email: 1 })
db.messages.createIndex({ channel: 1, createdAt: -1 })
db.directmessages.createIndex({ conversation: 1, createdAt: -1 })
```

### File Upload Optimization
- Use CDN for file storage (AWS S3, Cloudinary)
- Implement image compression
- Add file caching headers

### Socket.IO Optimization
- Use Redis adapter for scaling
- Implement connection pooling
- Add rate limiting

---

## 🔐 Security Best Practices

1. **Environment Variables**: Never commit .env files
2. **JWT Secrets**: Use strong, unique secrets
3. **File Uploads**: Validate file types and sizes
4. **CORS**: Configure properly for production
5. **Rate Limiting**: Implement API rate limiting
6. **Input Validation**: Validate all user inputs
7. **HTTPS**: Use SSL certificates in production

---

## 📞 Support

If you encounter issues:
1. Check console logs for errors
2. Verify environment variables
3. Test database connectivity
4. Check network/firewall settings
5. Review this guide step by step

Happy coding! 🚀
