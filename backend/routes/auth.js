const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Kullanıcı adı 3 ile 30 karakter arasında olmalıdır')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Kullanıcı adı sadece harf, rakam, alt çizgi ve tire içerebilir'),
  body('email')
    .isEmail()
    .withMessage('Geçerli bir e-posta adresi girin'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Şifre en az 6 karakter uzunluğunda olmalıdır')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Doğrulama başarısız',
        errors: errors.array()
      });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? 'E-posta zaten kayıtlı' : 'Kullanıcı adı zaten alınmış'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Kullanıcı başarıyla kaydedildi',
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        discriminator: user.discriminator,
        fullUsername: user.fullUsername
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Kayıt sırasında sunucu hatası' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Geçerli bir e-posta adresi girin'),
  body('password').exists().withMessage('Şifre gereklidir')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Doğrulama başarısız',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        message: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı',
        type: 'USER_NOT_FOUND'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ 
        message: 'Şifre hatalı. Lütfen doğru şifreyi girin',
        type: 'WRONG_PASSWORD'
      });
    }

    // Update user status to online
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        discriminator: user.discriminator,
        fullUsername: user.fullUsername,
        status: user.status,
        customStatus: user.customStatus
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Giriş sırasında sunucu hatası' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        discriminator: user.discriminator,
        fullUsername: user.fullUsername,
        status: user.status,
        customStatus: user.customStatus,
        isVerified: user.isVerified,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (set status to offline)
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.status = 'offline';
    user.lastSeen = new Date();
    await user.save();

    res.json({ message: 'Başarıyla çıkış yapıldı' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Çıkış sırasında sunucu hatası' });
  }
});

// @route   PUT /api/auth/status
// @desc    Update user status
// @access  Private
router.put('/status', auth, [
  body('status').isIn(['online', 'idle', 'dnd', 'offline']).withMessage('Geçersiz durum'),
  body('customStatus').optional().isLength({ max: 128 }).withMessage('Özel durum çok uzun')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Doğrulama başarısız',
        errors: errors.array()
      });
    }

    const { status, customStatus } = req.body;
    
    const user = await User.findById(req.user._id);
    user.status = status;
    if (customStatus !== undefined) {
      user.customStatus = customStatus;
    }
    user.lastSeen = new Date();
    await user.save();

    res.json({
      message: 'Durum başarıyla güncellendi',
      user: {
        status: user.status,
        customStatus: user.customStatus
      }
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
