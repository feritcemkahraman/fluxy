// Test join server API
const axios = require('axios');

const testJoinServer = async () => {
  const serverId = '68cd555b2de91ebe81d5a7e9'; // test sunucu ID
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGNhNDhhMmQ1YmYyMjcwZWJlMDBhZjkiLCJpYXQiOjE3NTgyNzU1MDUsImV4cCI6MTc1ODg4MDMwNX0.8MZY90OHl1VCuCqj7J5kGU36d4xoU_hVfHQp-9n8g0k';
  
  try {
    console.log('Testing join server API...');
    console.log('Server ID:', serverId);
    
    const response = await axios.post(
      `https://38c54745d2d7.ngrok-free.app/api/servers/${serverId}/join`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      }
    );
    
    console.log('SUCCESS:', response.data);
  } catch (error) {
    console.log('ERROR:', error.response?.status, error.response?.data);
    console.log('Full error:', error.message);
  }
};

testJoinServer();