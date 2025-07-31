const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
require('dotenv').config();

async function createTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pulasa_ecommerce');
    console.log('✅ Connected to MongoDB');

    // Create test users
    const testUsers = [
      {
        email: 'user1@pulasa.com',
        password: 'user123',
        name: 'John Doe',
        phone: '9876543210',
        address: '123 Main St, City, State',
        is_admin: false
      },
      {
        email: 'user2@pulasa.com',
        password: 'user123',
        name: 'Jane Smith',
        phone: '9876543211',
        address: '456 Oak Ave, City, State',
        is_admin: false
      },
      {
        email: 'user3@pulasa.com',
        password: 'user123',
        name: 'Bob Johnson',
        phone: '9876543212',
        address: '789 Pine Rd, City, State',
        is_admin: false
      },
      {
        email: 'user4@pulasa.com',
        password: 'user123',
        name: 'Alice Brown',
        phone: '9876543213',
        address: '321 Elm St, City, State',
        is_admin: false
      },
      {
        email: 'user5@pulasa.com',
        password: 'user123',
        name: 'Charlie Wilson',
        phone: '9876543214',
        address: '654 Maple Dr, City, State',
        is_admin: false
      }
    ];

    // Create users
    const createdUsers = [];
    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = new User({
          email: userData.email,
          password_hash: hashedPassword,
          name: userData.name,
          phone: userData.phone,
          address: userData.address,
          is_admin: userData.is_admin
        });
        await user.save();
        createdUsers.push(user);
        console.log(`✅ Created user: ${userData.name} (${userData.email})`);
      } else {
        createdUsers.push(existingUser);
        console.log(`⚠️  User already exists: ${userData.name} (${userData.email})`);
      }
    }

    console.log('\n🎉 Test data creation completed!');
    console.log('📊 Summary:');
    console.log(`👥 Users: ${createdUsers.length}`);
    console.log('🔑 Admin Login: admin@pulasa.com / admin123');
    console.log('🔑 Test User Logins:');
    testUsers.forEach(user => {
      console.log(`   ${user.email} / user123`);
    });

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createTestData(); 