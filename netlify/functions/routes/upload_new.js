const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

console.log('Upload route loaded - file uploads disabled in serverless environment');

router.post('/files', auth, async (req, res) => {
  res.status(501).json({ 
    message: 'File uploads temporarily disabled in serverless environment',
    info: 'Cloud storage integration will be implemented soon'
  });
});

router.post('/avatar', auth, async (req, res) => {
  res.status(501).json({ 
    message: 'Avatar uploads temporarily disabled in serverless environment',
    info: 'Cloud storage integration will be implemented soon'
  });
});

router.delete('/files/:filename', auth, async (req, res) => {
  res.status(501).json({ 
    message: 'File operations temporarily disabled in serverless environment'
  });
});

module.exports = router;