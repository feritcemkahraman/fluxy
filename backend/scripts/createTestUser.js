const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const createTestUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@fluxy.com' });
    if (existingUser) {
      console.log('✅ Test user already exists:');
      console.log('   Email: test@fluxy.com');
      console.log('   Password: test123');
      console.log('   Username:', existingUser.username);
      return;
    }

    // Find available username
    let username = 'testuser';
    let counter = 1;
    while (await User.findOne({ username })) {
      username = `testuser${counter}`;
      counter++;
    }

    // Create test user
    const testUser = new User({
      username,
      displayName: 'Test User',
      email: 'test@fluxy.com',
      password: 'test123',
      status: 'online',
      avatar: null,
      customStatus: 'Test kullanıcısı',
      badges: [],
      connections: [],
      settings: {
        theme: 'dark',
        language: 'tr',
        notifications: {
          desktop: true,
          sound: true,
          mentions: true
        },
        privacy: {
          showOnlineStatus: true,
          allowDirectMessages: true,
          allowFriendRequests: true
        }
      }
    });

    await testUser.save();
    
    console.log('✅ Test user created successfully!');
    console.log('   Email: test@fluxy.com');
    console.log('   Password: test123');
    console.log('   Username:', username);
    console.log('   Display Name: Test User');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
};

// Run the script
createTestUser();
