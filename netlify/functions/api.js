const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const serverless = require('serverless-http');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const channelRoutes = require('./routes/channels');
const messageRoutes = require('./routes/messages');
const dmRoutes = require('./routes/dm');
const uploadRoutes = require('./routes/upload');
const roleRoutes = require('./routes/roles');
const userSettingsRoutes = require('./routes/userSettings');
const profileRoutes = require('./routes/profile');
const friendRoutes = require('./routes/friends');
const templateRoutes = require('./routes/templates');

const app = express();

// Configure Express for serverless environment
app.set('trust proxy', true); // Enable trust proxy for Netlify

// CORS configuration for Netlify
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://fluxycorn.netlify.app',
  process.env.FRONTEND_URL
].filter(Boolean);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting with serverless-friendly configuration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: 'Çok fazla giriş denemesi, 15 dakika sonra tekrar deneyin.',
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator for serverless
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  },
  // Skip rate limiting if IP can't be determined
  skip: (req) => {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    return !ip || ip === 'unknown';
  }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Bu IP adresinden çok fazla istek, lütfen daha sonra tekrar deneyin.',
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator for serverless
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  },
  // Skip rate limiting if IP can't be determined
  skip: (req) => {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    return !ip || ip === 'unknown';
  }
});

// Apply rate limiting - Direct paths after transformation
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
app.use('/', generalLimiter);

// CORS middleware with strict production settings
app.use(cors({
  origin: function (origin, callback) {
    // In production, be more strict about origins
    if (process.env.NODE_ENV === 'production') {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('CORS politikası tarafından engellendi'), false);
      }
    }

    // For development, allow localhost origins
    if (!origin) return callback(null, true);
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(null, true); // Allow all for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count', 'X-Request-ID'],
  maxAge: 86400, // Cache preflight for 24 hours
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

// Body parsing middleware with security limits
app.use(express.json({ 
  limit: '10mb',
  strict: true,
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

// MongoDB connection with enhanced connection pooling and monitoring
let isConnected = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

const connectToDatabase = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  connectionAttempts++;
  
  try {
    // Optimized settings for serverless - only modern options
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 20000,
      maxPoolSize: 5,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      waitQueueTimeoutMS: 15000,
      retryWrites: true,
      retryReads: true,
      readPreference: 'primary',
      bufferCommands: false,
      heartbeatFrequencyMS: 30000
    };

    console.log('Attempting MongoDB connection...');
    await mongoose.connect(process.env.MONGODB_URI, options);
    
    isConnected = true;
    connectionAttempts = 0;
    
    console.log('MongoDB connected successfully');
    
    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
      isConnected = true;
    });
    
  } catch (error) {
    console.error(`MongoDB connection attempt ${connectionAttempts} failed:`, error);
    isConnected = false;
    
    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
      throw new Error(`Failed to connect to MongoDB after ${MAX_CONNECTION_ATTEMPTS} attempts`);
    }
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, 2000 * connectionAttempts));
    return connectToDatabase();
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

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  res.set('X-Request-ID', req.requestId);
  next();
});

// Request logging middleware with detailed debugging
app.use((req, res, next) => {
  const start = Date.now();
  
  // Debug: Log incoming request details
  console.log(`[${req.requestId}] Incoming request:`, {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    headers: {
      host: req.headers.host,
      'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
    }
  });
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.requestId}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// API routes - Direct paths after transformation
app.use('/auth', authRoutes);
app.use('/servers', serverRoutes);
app.use('/channels', channelRoutes);
app.use('/messages', messageRoutes);
app.use('/dm', dmRoutes);
app.use('/upload', uploadRoutes);
app.use('/roles', roleRoutes);
app.use('/user-settings', userSettingsRoutes);
app.use('/profile', profileRoutes);
app.use('/friends', friendRoutes);
app.use('/templates', templateRoutes);

// Test route to debug path issues
app.get('/test', (req, res) => {
  res.json({ 
    message: 'API test endpoint working',
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

app.post('/auth/test', (req, res) => {
  res.json({ 
    message: 'Auth test endpoint working',
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // Log detailed error for debugging
  console.error(`[${req.requestId}] Error ${errorId}:`, {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Determine error status code
  let statusCode = err.statusCode || err.status || 500;
  let message = 'Bir şeyler ters gitti!';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Geçersiz veri formatı';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Geçersiz ID formatı';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Bu veri zaten mevcut';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Geçersiz token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token süresi dolmuş';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    errorId,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack
    })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API endpoint bulunamadı' });
});

// Custom handler to ensure MongoDB connection
const handler = async (event, context) => {
  // Set a timeout for the entire function
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    console.log(`Function invoked: ${event.httpMethod} ${event.path}`);
    
    // Debug environment variables
    console.log('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: process.env.MONGODB_URI ? 'SET (length: ' + process.env.MONGODB_URI.length + ')' : 'NOT_SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET (length: ' + process.env.JWT_SECRET.length + ')' : 'NOT_SET',
      FRONTEND_URL: process.env.FRONTEND_URL || 'NOT_SET'
    });
    
    // Check required environment variables
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          message: 'Server configuration error: MONGODB_URI not set',
          timestamp: new Date().toISOString()
        })
      };
    }
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          message: 'Server configuration error: JWT_SECRET not set',
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Ensure database connection before processing request
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Database connection successful');
    
    // Process the request with serverless wrapper
    // Transform Netlify function path to Express path
    const modifiedEvent = { ...event };
    if (event.path && event.path.startsWith('/.netlify/functions/api')) {
      modifiedEvent.path = event.path.replace('/.netlify/functions/api', '') || '/';
    }
    
    const serverlessHandler = serverless(app);
    return await serverlessHandler(modifiedEvent, context);
    
  } catch (error) {
    console.error('Handler error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        message: 'Sunucu hatası',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        errorName: error.name,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Export for Netlify
module.exports = app;
module.exports.handler = handler;