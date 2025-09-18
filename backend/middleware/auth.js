const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const auth = async (req, res, next) => {
  try {
    console.log('🔐 Auth middleware called for:', req.method, req.path);
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ Auth middleware: No token found');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    console.log('🔐 Auth middleware: Token found, verifying...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 Auth middleware: Token decoded, userId:', decoded.userId);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('❌ Auth middleware: User not found for userId:', decoded.userId);
      return res.status(401).json({ message: 'Token is not valid' });
    }

    console.log('✅ Auth middleware: User found, proceeding...');
    req.user = user;
    next();
  } catch (error) {
    console.log('❌ Auth middleware: Error:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user is admin
const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
      }
      next();
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { auth, adminAuth };
