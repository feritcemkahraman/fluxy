const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/fluxy');
    console.log('Connected to MongoDB');
    
    const users = await User.find({ 
      username: { $in: ['testoses', 'bauklotze'] } 
    }).select('username displayName');
    
    console.log('\n=== USER DISPLAY NAMES ===');
    users.forEach(user => {
      console.log(`Username: ${user.username}`);
      console.log(`DisplayName: ${user.displayName}`);
      console.log(`DisplayName exists: ${user.displayName !== undefined}`);
      console.log(`DisplayName === username: ${user.displayName === user.username}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkUsers();