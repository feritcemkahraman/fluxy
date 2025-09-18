const mongoose = require('mongoose');
require('dotenv').config();

async function addDemoUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // User model'ini import et
    const User = require('./models/User');

    // Yeni demo user oluştur
    const demoUser = new User({
      username: 'DemoUser',
      email: 'demo@example.com',
      password: 'password123', // Bu production'da hash'lenmeli
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
      status: 'online',
      discriminator: '1234'
    });

    await demoUser.save();
    console.log('✅ Demo user oluşturuldu:', demoUser.username);

    // Server'ı bul
    const Server = require('./models/Server');
    const server = await Server.findOne({ name: /Testo Fero/i });

    if (server) {
      // User'ı server'a ekle
      server.members.push({
        user: demoUser._id,
        roles: [],
        joinedAt: new Date()
      });

      await server.save();
      console.log('✅ Demo user server\'a eklendi');
      console.log('📊 Server members count:', server.members.length);
    } else {
      console.log('❌ Testo Fero sunucusu bulunamadı');
      // Tüm server'ları listele
      const allServers = await Server.find({}, 'name');
      console.log('📋 Mevcut server\'lar:', allServers.map(s => s.name));
    }

    console.log('✅ İşlem tamamlandı!');

  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

addDemoUser();
