const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, text, and document files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per upload
  }
});

// @route   POST /api/upload/files
// @desc    Upload files
// @access  Private
router.post('/files', auth, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.originalname,
      url: `/uploads/${file.filename}`,
      size: file.size,
      contentType: file.mimetype,
      uploadedAt: new Date()
    }));

    res.json({ 
      message: 'Files uploaded successfully',
      files: uploadedFiles 
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'File upload failed' });
  }
});

// @route   POST /api/upload/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No avatar file uploaded' });
    }

    // Check if it's an image
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Avatar must be an image file' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    res.json({ 
      message: 'Avatar uploaded successfully',
      avatarUrl 
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ message: 'Avatar upload failed' });
  }
});

// @route   POST /api/upload/server-icon
// @desc    Upload server icon
// @access  Private
router.post('/server-icon', auth, upload.single('icon'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No icon file uploaded' });
    }

    // Check if it's an image
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'Server icon must be an image file' });
    }

    const iconUrl = `/uploads/${req.file.filename}`;

    res.json({ 
      message: 'Server icon uploaded successfully',
      iconUrl 
    });

  } catch (error) {
    console.error('Server icon upload error:', error);
    res.status(500).json({ message: 'Server icon upload failed' });
  }
});

// @route   GET /api/upload/:filename
// @desc    Serve uploaded files
// @access  Public
router.get('/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  // Send file
  res.sendFile(filePath);
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum is 5 files per upload.' });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ message: error.message });
  }

  next(error);
});

module.exports = router;
