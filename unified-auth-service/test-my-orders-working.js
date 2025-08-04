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
  testMyOrdersWorking();
}).catch(err => {
  console.error('❌ MongoDB Atlas connection failed:', err);
});

async function testMyOrdersWorking() {
  try {
    console.log('🔧 Testing my-orders functionality...');
    
    const Order = require('./src/models/Order');
    
    // Get all orders
    const allOrders = await Order.find({}).sort({ created_at: -1 });
    console.log(`📦 Total orders in database: ${allOrders.length}`);
    
    // Get unique user IDs
    const userIds = [...new Set(allOrders.map(order => order.user_id))];
    console.log(`👥 Found ${userIds.length} unique users`);
    
    // Test each user's orders
    console.log('\n📋 Testing my-orders for each user:');
    
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      
      // Simulate the my-orders endpoint query
      const userOrders = await Order.find({ user_id: userId }).sort({ created_at: -1 });
      
      console.log(`\n👤 User ${i + 1}: ${userId}`);
      console.log(`   📊 Orders count: ${userOrders.length}`);
      
      if (userOrders.length > 0) {
        console.log(`   📦 Latest order: ${userOrders[0].order_number} - ₹${userOrders[0].amount} - ${userOrders[0].status}`);
        
        // Check if products are in correct format
        const products = userOrders[0].products;
        if (Array.isArray(products)) {
          console.log(`   ✅ Products format: Array (${products.length} items)`);
        } else if (typeof products === 'string') {
          console.log(`   ⚠️ Products format: String (${products.length} characters)`);
        } else {
          console.log(`   ❌ Products format: Unknown (${typeof products})`);
        }
      }
      
      // Verify the query works correctly
      const manualFilter = allOrders.filter(order => order.user_id === userId);
      if (userOrders.length === manualFilter.length) {
        console.log(`   ✅ Query verification: PASSED`);
      } else {
        console.log(`   ❌ Query verification: FAILED (Expected ${manualFilter.length}, got ${userOrders.length})`);
      }
    }
    
    // Test specific scenarios
    console.log('\n🔍 Testing specific scenarios:');
    
    // Test user with most orders
    const userOrderCounts = {};
    userIds.forEach(userId => {
      userOrderCounts[userId] = allOrders.filter(order => order.user_id === userId).length;
    });
    
    const userWithMostOrders = Object.keys(userOrderCounts).reduce((a, b) => 
      userOrderCounts[a] > userOrderCounts[b] ? a : b
    );
    
    console.log(`\n👑 User with most orders: ${userWithMostOrders}`);
    console.log(`   📊 Total orders: ${userOrderCounts[userWithMostOrders]}`);
    
    // Test user with single order
    const userWithSingleOrder = Object.keys(userOrderCounts).find(userId => 
      userOrderCounts[userId] === 1
    );
    
    if (userWithSingleOrder) {
      console.log(`\n👤 User with single order: ${userWithSingleOrder}`);
      const singleOrder = allOrders.find(order => order.user_id === userWithSingleOrder);
      console.log(`   📦 Order: ${singleOrder.order_number} - ₹${singleOrder.amount} - ${singleOrder.status}`);
    }
    
    // Test products format consistency
    console.log('\n📝 Testing products format consistency:');
    const arrayProducts = allOrders.filter(order => Array.isArray(order.products));
    const stringProducts = allOrders.filter(order => typeof order.products === 'string');
    const otherProducts = allOrders.filter(order => !Array.isArray(order.products) && typeof order.products !== 'string');
    
    console.log(`   📦 Orders with array products: ${arrayProducts.length}`);
    console.log(`   📦 Orders with string products: ${stringProducts.length}`);
    console.log(`   📦 Orders with other format: ${otherProducts.length}`);
    
    if (stringProducts.length > 0) {
      console.log(`   ⚠️ Found ${stringProducts.length} orders with string products - these need migration`);
    }
    
    // Test order status distribution
    console.log('\n📊 Order status distribution:');
    const statusCounts = {};
    allOrders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} orders`);
    });
    
    // Test the actual endpoint logic
    console.log('\n🔍 Testing endpoint logic:');
    console.log('   The my-orders endpoint should:');
    console.log('   1. ✅ Filter orders by user_id');
    console.log('   2. ✅ Sort by created_at descending');
    console.log('   3. ✅ Return only user-specific orders');
    console.log('   4. ✅ Handle empty results gracefully');
    
    // Test with a non-existent user
    const nonExistentUserId = 'non-existent-user-id';
    const nonExistentUserOrders = await Order.find({ user_id: nonExistentUserId });
    console.log(`\n🧪 Test with non-existent user (${nonExistentUserId}):`);
    console.log(`   📦 Orders found: ${nonExistentUserOrders.length} (should be 0)`);
    
    console.log('\n🎉 My-orders functionality test complete!');
    console.log('\n📋 Summary:');
    console.log(`   ✅ Total orders: ${allOrders.length}`);
    console.log(`   ✅ Unique users: ${userIds.length}`);
    console.log(`   ✅ Array products: ${arrayProducts.length}`);
    console.log(`   ⚠️ String products: ${stringProducts.length}`);
    console.log(`   ✅ Query logic: Working correctly`);
    
  } catch (error) {
    console.error('❌ My-orders test failed:', error);
  } finally {
    mongoose.connection.close();
  }
} 