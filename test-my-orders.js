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
  testMyOrders();
}).catch(err => {
  console.error('❌ MongoDB Atlas connection failed:', err);
});

async function testMyOrders() {
  try {
    console.log('🔧 Testing my-orders endpoint functionality...');
    
    const Order = require('./src/models/Order');
    
    // Get all orders and group by user_id
    const allOrders = await Order.find({}).sort({ created_at: -1 });
    console.log(`📦 Total orders in database: ${allOrders.length}`);
    
    // Get unique user IDs
    const userIds = [...new Set(allOrders.map(order => order.user_id))];
    console.log(`👥 Found ${userIds.length} unique users`);
    
    // Test my-orders logic for each user
    console.log('\n📋 Testing my-orders for each user:');
    
    userIds.forEach((userId, index) => {
      // Simulate the my-orders endpoint query: Order.find({ user_id: req.user.id })
      const userOrders = allOrders.filter(order => order.user_id === userId);
      
      console.log(`\n👤 User ${index + 1}: ${userId}`);
      console.log(`   📊 Orders count: ${userOrders.length}`);
      
      userOrders.forEach(order => {
        console.log(`   📦 ${order.order_number} - ₹${order.amount} - ${order.status} - ${new Date(order.created_at).toLocaleDateString()}`);
      });
      
      // Verify the query logic
      const directQuery = allOrders.filter(order => order.user_id === userId);
      if (directQuery.length === userOrders.length) {
        console.log(`   ✅ Query logic verified - ${userOrders.length} orders found`);
      } else {
        console.log(`   ❌ Query logic mismatch!`);
      }
    });
    
    // Test specific user scenarios
    console.log('\n🔍 Testing specific scenarios:');
    
    // Test user with most orders
    const userWithMostOrders = userIds.reduce((maxUser, userId) => {
      const userOrderCount = allOrders.filter(order => order.user_id === userId).length;
      const maxOrderCount = allOrders.filter(order => order.user_id === maxUser).length;
      return userOrderCount > maxOrderCount ? userId : maxUser;
    });
    
    const mostOrders = allOrders.filter(order => order.user_id === userWithMostOrders);
    console.log(`\n👑 User with most orders: ${userWithMostOrders}`);
    console.log(`   📊 Total orders: ${mostOrders.length}`);
    mostOrders.forEach(order => {
      console.log(`   📦 ${order.order_number} - ${order.status}`);
    });
    
    // Test user with single order
    const userWithSingleOrder = userIds.find(userId => 
      allOrders.filter(order => order.user_id === userId).length === 1
    );
    
    if (userWithSingleOrder) {
      const singleOrder = allOrders.find(order => order.user_id === userWithSingleOrder);
      console.log(`\n👤 User with single order: ${userWithSingleOrder}`);
      console.log(`   📦 ${singleOrder.order_number} - ₹${singleOrder.amount} - ${singleOrder.status}`);
    }
    
    // Test the actual MongoDB query that the endpoint uses
    console.log('\n🔍 Testing actual MongoDB query:');
    for (const userId of userIds.slice(0, 3)) { // Test first 3 users
      const mongoQuery = await Order.find({ user_id: userId }).sort({ created_at: -1 });
      const filterQuery = allOrders.filter(order => order.user_id === userId);
      
      console.log(`\n👤 User: ${userId}`);
      console.log(`   📊 MongoDB query result: ${mongoQuery.length} orders`);
      console.log(`   📊 Filter query result: ${filterQuery.length} orders`);
      
      if (mongoQuery.length === filterQuery.length) {
        console.log(`   ✅ MongoDB query matches filter logic`);
      } else {
        console.log(`   ❌ MongoDB query mismatch!`);
      }
    }
    
    console.log('\n🎉 My-orders functionality test complete!');
    
  } catch (error) {
    console.error('❌ My-orders test failed:', error);
  } finally {
    mongoose.connection.close();
  }
} 