const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı');

    const User = require('./models/User');

    // Önce mevcut test kullanıcısını sil
    await User.deleteMany({ email: 'test@test.com' });

    // Şifreyi hash'le
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);

    // Test kullanıcısı oluştur
    const testUser = new User({
      username: 'TestUser',
      email: 'test@test.com',
      password: hashedPassword,
      displayName: 'Test User',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
      status: 'online',
      discriminator: '0001'
    });

    await testUser.save();
    console.log('✅ Test kullanıcısı oluşturuldu:');
    console.log('Email: test@test.com');
    console.log('Password: 123456');
    console.log('Username:', testUser.username);

    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

createTestUser();