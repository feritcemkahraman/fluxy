const mongoose = require('mongoose');
const ServerTemplate = require('../models/ServerTemplate');

// Load environment variables
require('dotenv').config();

const seedTemplates = async () => {
  try {
    console.log('🌱 Seeding server templates...');

    // Clear existing templates
    await ServerTemplate.deleteMany({});
    console.log('🗑️  Cleared existing templates');

    const templates = [
      // Gaming Templates
      {
        name: 'Gaming Hub',
        description: 'Perfect for gaming communities with voice channels and game discussions',
        category: 'gaming',
        icon: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&h=150&fit=crop',
        template: {
          server: {
            name: 'Gaming Hub',
            description: 'Welcome to our gaming community!',
            isPublic: true
          },
          channels: [
            { name: 'announcements', type: 'text', description: 'Important announcements' },
            { name: 'general', type: 'text', description: 'General chat' },
            { name: 'game-discussion', type: 'text', description: 'Talk about games' },
            { name: 'memes', type: 'text', description: 'Gaming memes and funny moments' },
            { name: 'General', type: 'voice', description: 'General voice chat' },
            { name: 'Gaming', type: 'voice', description: 'Gaming voice channel' }
          ],
          roles: [
            { name: 'Admin', color: '#F04747', permissions: { administrator: true } },
            { name: 'Moderator', color: '#FAA61A', permissions: { manageMessages: true, kickMembers: true } },
            { name: 'Member', color: '#99AAB5', permissions: {} },
            { name: 'VIP Gamer', color: '#FF73FA', permissions: { mentionEveryone: true } }
          ],
          welcomeMessages: [
            { content: 'Welcome to Gaming Hub! 🎮', author: 'Gaming Bot' },
            { content: 'Check out our gaming channels and join the fun!', author: 'Gaming Bot', delay: 2000 }
          ]
        }
      },
      {
        name: 'Study Group',
        description: 'Collaborative learning environment for students',
        category: 'education',
        icon: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=150&h=150&fit=crop',
        template: {
          server: {
            name: 'Study Group',
            description: 'A place for focused learning and collaboration',
            isPublic: true
          },
          channels: [
            { name: 'announcements', type: 'text', description: 'Study announcements' },
            { name: 'general', type: 'text', description: 'General discussion' },
            { name: 'math-help', type: 'text', description: 'Mathematics help' },
            { name: 'science', type: 'text', description: 'Science discussions' },
            { name: 'homework', type: 'text', description: 'Homework help' },
            { name: 'Study Room 1', type: 'voice', description: 'Study voice channel' },
            { name: 'Study Room 2', type: 'voice', description: 'Study voice channel' }
          ],
          roles: [
            { name: 'Teacher', color: '#206694', permissions: { manageMessages: true, manageChannels: true } },
            { name: 'Tutor', color: '#FAA61A', permissions: { manageMessages: true } },
            { name: 'Student', color: '#99AAB5', permissions: {} }
          ],
          welcomeMessages: [
            { content: 'Welcome to Study Group! 📚', author: 'Study Bot' },
            { content: 'Feel free to ask questions and help each other learn!', author: 'Study Bot', delay: 2000 }
          ]
        }
      },
      {
        name: 'Community Hub',
        description: 'General community server for discussions and events',
        category: 'community',
        icon: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&h=150&fit=crop',
        template: {
          server: {
            name: 'Community Hub',
            description: 'A welcoming community for everyone',
            isPublic: true
          },
          channels: [
            { name: 'announcements', type: 'text', description: 'Community announcements' },
            { name: 'general', type: 'text', description: 'General discussion' },
            { name: 'introductions', type: 'text', description: 'Introduce yourself' },
            { name: 'off-topic', type: 'text', description: 'Random discussions' },
            { name: 'events', type: 'text', description: 'Community events' },
            { name: 'General Chat', type: 'voice', description: 'General voice chat' },
            { name: 'Events', type: 'voice', description: 'Event discussions' }
          ],
          roles: [
            { name: 'Community Manager', color: '#F04747', permissions: { manageServer: true, manageRoles: true } },
            { name: 'Moderator', color: '#FAA61A', permissions: { manageMessages: true, kickMembers: true } },
            { name: 'Event Organizer', color: '#FF73FA', permissions: { manageChannels: true } },
            { name: 'Member', color: '#99AAB5', permissions: {} }
          ],
          welcomeMessages: [
            { content: 'Welcome to Community Hub! 👋', author: 'Community Bot' },
            { content: 'Introduce yourself in #introductions and join the conversation!', author: 'Community Bot', delay: 2000 }
          ]
        }
      },
      {
        name: 'Music Lounge',
        description: 'Music sharing and discussion server',
        category: 'music',
        icon: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop',
        template: {
          server: {
            name: 'Music Lounge',
            description: 'Share and discover amazing music',
            isPublic: true
          },
          channels: [
            { name: 'announcements', type: 'text', description: 'Music announcements' },
            { name: 'general', type: 'text', description: 'General music discussion' },
            { name: 'song-recommendations', type: 'text', description: 'Share your favorite songs' },
            { name: 'artist-spotlight', type: 'text', description: 'Discuss artists and albums' },
            { name: 'music-theory', type: 'text', description: 'Music theory discussions' },
            { name: 'Music Lounge', type: 'voice', description: 'Listen to music together' },
            { name: 'Jam Session', type: 'voice', description: 'Play music together' }
          ],
          roles: [
            { name: 'DJ', color: '#FF73FA', permissions: { manageMessages: true } },
            { name: 'Music Expert', color: '#FAA61A', permissions: {} },
            { name: 'Listener', color: '#99AAB5', permissions: {} }
          ],
          welcomeMessages: [
            { content: 'Welcome to Music Lounge! 🎵', author: 'Music Bot' },
            { content: 'Share your favorite tracks and discover new music!', author: 'Music Bot', delay: 2000 }
          ]
        }
      },
      {
        name: 'Art Studio',
        description: 'Creative space for artists and designers',
        category: 'art',
        icon: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=150&h=150&fit=crop',
        template: {
          server: {
            name: 'Art Studio',
            description: 'A creative space for artists and art lovers',
            isPublic: true
          },
          channels: [
            { name: 'announcements', type: 'text', description: 'Art announcements' },
            { name: 'general', type: 'text', description: 'General art discussion' },
            { name: 'showcase', type: 'text', description: 'Show off your artwork' },
            { name: 'wip', type: 'text', description: 'Work in progress' },
            { name: 'critique', type: 'text', description: 'Art critique and feedback' },
            { name: 'resources', type: 'text', description: 'Art resources and tutorials' },
            { name: 'Art Discussion', type: 'voice', description: 'Discuss art' }
          ],
          roles: [
            { name: 'Art Director', color: '#F04747', permissions: { manageMessages: true } },
            { name: 'Artist', color: '#FAA61A', permissions: {} },
            { name: 'Apprentice', color: '#99AAB5', permissions: {} }
          ],
          welcomeMessages: [
            { content: 'Welcome to Art Studio! 🎨', author: 'Art Bot' },
            { content: 'Share your artwork in #showcase and get feedback!', author: 'Art Bot', delay: 2000 }
          ]
        }
      }
    ];

    // Create templates
    for (const templateData of templates) {
      const template = new ServerTemplate({
        ...templateData,
        createdBy: new mongoose.Types.ObjectId(), // Placeholder user ID
        isOfficial: true
      });
      await template.save();
      console.log(`✅ Created template: ${template.name}`);
    }

    console.log('🎉 Server templates seeded successfully!');
    console.log(`📊 Created ${templates.length} templates`);

  } catch (error) {
    console.error('❌ Error seeding templates:', error);
  }
};

module.exports = seedTemplates;

// Run if called directly
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('📱 Connected to MongoDB');
      return seedTemplates();
    })
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
