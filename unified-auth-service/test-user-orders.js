require('dotenv').config();
const mongoose = require('mongoose');

// Use the same MongoDB Atlas connection as the main server
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://nitishkumardevoju:muwLYrPn5blRAGCd@pulasa.sjvscku.mongodb.net/?retryWrites=true&w=majority&appName=pulasa';

// Connect to MongoDB Atlas
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ Connected to MongoDB Atlas');
  testUserOrders();
}).catch(err => {
  console.error('❌ MongoDB Atlas connection failed:', err);
});

async function testUserOrders() {
  try {
    console.log('🔧 Testing user-specific orders...');
    
    const Order = require('./src/models/Order');
    
    // Get all orders and group by user_id
    const allOrders = await Order.find({}).sort({ created_at: -1 });
    console.log(`📦 Total orders in database: ${allOrders.length}`);
    
    // Group orders by user_id
    const ordersByUser = {};
    allOrders.forEach(order => {
      const userId = order.user_id;
      if (!ordersByUser[userId]) {
        ordersByUser[userId] = [];
      }
      ordersByUser[userId].push({
        order_number: order.order_number,
        amount: order.amount,
        status: order.status,
        created_at: order.created_at
      });
    });
    
    // Display orders for each user
    console.log('\n📋 Orders by User:');
    Object.keys(ordersByUser).forEach(userId => {
      const userOrders = ordersByUser[userId];
      console.log(`\n👤 User ID: ${userId}`);
      console.log(`   📊 Total Orders: ${userOrders.length}`);
      userOrders.forEach(order => {
        console.log(`   📦 ${order.order_number} - ₹${order.amount} - ${order.status} - ${new Date(order.created_at).toLocaleDateString()}`);
      });
    });
    
    // Test the my-orders endpoint logic
    console.log('\n🔍 Testing my-orders endpoint logic:');
    Object.keys(ordersByUser).forEach(userId => {
      const userOrders = ordersByUser[userId];
      console.log(`\n👤 For User: ${userId}`);
      
      // Simulate the my-orders endpoint query
      const userSpecificOrders = allOrders.filter(order => order.user_id === userId);
      console.log(`   ✅ Found ${userSpecificOrders.length} orders for this user`);
      
      if (userSpecificOrders.length !== userOrders.length) {
        console.log(`   ❌ Mismatch! Expected ${userOrders.length}, got ${userSpecificOrders.length}`);
      } else {
        console.log(`   ✅ Order count matches`);
      }
    });
    
    // Check for any orders without user_id
    const ordersWithoutUserId = await Order.find({ user_id: { $exists: false } });
    if (ordersWithoutUserId.length > 0) {
      console.log(`\n⚠️ Found ${ordersWithoutUserId.length} orders without user_id`);
    } else {
      console.log('\n✅ All orders have user_id');
    }
    
    // Check for duplicate user_id values
    const userIds = allOrders.map(order => order.user_id);
    const uniqueUserIds = [...new Set(userIds)];
    console.log(`\n👥 Unique users: ${uniqueUserIds.length}`);
    console.log(`📊 Total orders: ${allOrders.length}`);
    
    if (uniqueUserIds.length === allOrders.length) {
      console.log('✅ Each order belongs to a different user');
    } else {
      console.log('✅ Multiple orders per user (normal)');
    }
    
    console.log('\n🎉 User orders test complete!');
    
  } catch (error) {
    console.error('❌ User orders test failed:', error);
  } finally {
    mongoose.connection.close();
  }
} 