const mongoose = require('mongoose');
const User = require('./src/models/User');
const Order = require('./src/models/Order');
require('dotenv').config();

async function createTestOrders() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pulasa_ecommerce');
    console.log('✅ Connected to MongoDB');

    // Get existing users
    const users = await User.find({});
    if (users.length === 0) {
      console.log('❌ No users found. Please run create-test-data.js first.');
      return;
    }

    console.log(`📊 Found ${users.length} users`);

    // Create test orders
    const testOrders = [
      {
        user_id: users[0]._id,
        amount: 25000,
        order_number: 'P000001',
        products: [
          {
            product_id: new mongoose.Types.ObjectId(),
            name: 'Premium Wild Pulasa',
            price: 25000,
            quantity: 1
          }
        ],
        first_name: 'John',
        last_name: 'Doe',
        phone: '9876543210',
        city: 'Hyderabad',
        state: 'Telangana',
        zip: '500001',
        status: 'pending',
        upi_reference: 'UPI123456789'
      },
      {
        user_id: users[1]._id,
        amount: 50000,
        order_number: 'P000002',
        products: [
          {
            product_id: new mongoose.Types.ObjectId(),
            name: 'Premium Wild Pulasa',
            price: 25000,
            quantity: 2
          }
        ],
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '9876543211',
        city: 'Mumbai',
        state: 'Maharashtra',
        zip: '400001',
        status: 'completed',
        upi_reference: 'UPI987654321'
      },
      {
        user_id: users[2]._id,
        amount: 25000,
        order_number: 'P000003',
        products: [
          {
            product_id: new mongoose.Types.ObjectId(),
            name: 'Pulasa Curry',
            price: 25000,
            quantity: 1
          }
        ],
        first_name: 'Bob',
        last_name: 'Johnson',
        phone: '9876543212',
        city: 'Delhi',
        state: 'Delhi',
        zip: '110001',
        status: 'pending',
        upi_reference: 'UPI456789123'
      },
      {
        user_id: users[3]._id,
        amount: 25000,
        order_number: 'P000004',
        products: [
          {
            product_id: new mongoose.Types.ObjectId(),
            name: 'Premium Wild Pulasa',
            price: 25000,
            quantity: 1
          }
        ],
        first_name: 'Alice',
        last_name: 'Brown',
        phone: '9876543213',
        city: 'Bangalore',
        state: 'Karnataka',
        zip: '560001',
        status: 'pending',
        upi_reference: 'UPI789123456'
      },
      {
        user_id: users[4]._id,
        amount: 25000,
        order_number: 'P000005',
        products: [
          {
            product_id: new mongoose.Types.ObjectId(),
            name: 'Premium Wild Pulasa',
            price: 25000,
            quantity: 1
          }
        ],
        first_name: 'Charlie',
        last_name: 'Wilson',
        phone: '9876543214',
        city: 'Chennai',
        state: 'Tamil Nadu',
        zip: '600001',
        status: 'completed',
        upi_reference: 'UPI321654987'
      }
    ];

    // Create orders
    for (const orderData of testOrders) {
      const existingOrder = await Order.findOne({ order_number: orderData.order_number });
      if (!existingOrder) {
        const order = new Order(orderData);
        await order.save();
        console.log(`✅ Created order: ${orderData.order_number} - ₹${orderData.amount} (${orderData.status})`);
      } else {
        console.log(`⚠️  Order already exists: ${orderData.order_number}`);
      }
    }

    console.log('\n🎉 Test orders creation completed!');
    console.log('📊 Summary:');
    console.log(`📦 Orders: ${testOrders.length}`);
    console.log('🔑 Admin Login: admin@pulasa.com / admin123');

  } catch (error) {
    console.error('❌ Error creating test orders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createTestOrders(); 