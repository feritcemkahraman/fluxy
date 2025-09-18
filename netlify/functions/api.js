const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const serverless = require('serverless-http');
require('dotenv').config();

// Import routes
const authRoutes = require('../routes/auth');
const serverRoutes = require('../routes/servers');
const channelRoutes = require('../routes/channels');
const messageRoutes = require('../routes/messages');
const dmRoutes = require('../routes/dm');
const uploadRoutes = require('../routes/upload');
const roleRoutes = require('../routes/roles');
const userSettingsRoutes = require('../routes/userSettings');
const profileRoutes = require('../routes/profile');
const friendRoutes = require('../routes/friends');
const templateRoutes = require('../routes/templates');

const app = express();

// CORS configuration for Netlify
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://your-netlify-app.netlify.app',
  process.env.FRONTEND_URL
].filter(Boolean);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Bu IP adresinden çok fazla istek, lütfen daha sonra tekrar deneyin.'
});

app.use('/api/', limiter);

// CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // For development, allow all localhost origins
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(null, true); // Allow all for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Handle preflight requests
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection with connection pooling
let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Connect to database before handling requests
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Fluxy API çalışıyor!',
    version: '1.0.0',
    status: 'sağlıklı',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/user-settings', userSettingsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/templates', templateRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err.message);
  res.status(500).json({
    message: 'Bir şeyler ters gitti!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API endpoint bulunamadı' });
});

// Export for Netlify
module.exports = app;
module.exports.handler = serverless(app);