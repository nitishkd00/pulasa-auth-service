const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
require('dotenv').config();

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pulasa_ecommerce');
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@pulasa.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('📧 Email: admin@pulasa.com');
      console.log('🔑 Password: admin123');
      console.log('👤 Name: Pulasa Admin');
      console.log('👑 Is Admin: true');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
    const adminUser = new User({
      email: 'admin@pulasa.com',
      password_hash: hashedPassword,
      name: 'Pulasa Admin',
      phone: '9999999999',
      address: 'Admin Address',
      is_admin: true
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@pulasa.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Name: Pulasa Admin');
    console.log('👑 Is Admin: true');
    console.log('\n🎯 You can now login to the main Pulasa application with these credentials!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createAdminUser(); 