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
  testOrdersEndpoint();
}).catch(err => {
  console.error('❌ MongoDB Atlas connection failed:', err);
});

async function testOrdersEndpoint() {
  try {
    console.log('🔧 Testing orders endpoint...');
    
    const Order = require('./src/models/Order');
    
    // Test 1: Count all orders
    const totalOrders = await Order.countDocuments();
    console.log(`📦 Total orders in database: ${totalOrders}`);
    
    // Test 2: Get a sample order
    const sampleOrder = await Order.findOne();
    if (sampleOrder) {
      console.log('📋 Sample order:', {
        id: sampleOrder._id,
        order_number: sampleOrder.order_number,
        user_id: sampleOrder.user_id,
        amount: sampleOrder.amount,
        status: sampleOrder.status,
        products_type: typeof sampleOrder.products,
        products_length: Array.isArray(sampleOrder.products) ? sampleOrder.products.length : 'N/A'
      });
    }
    
    // Test 3: Check if there are any orders with the old schema
    const oldSchemaOrders = await Order.find({
      $or: [
        { supabase_id: { $exists: true } },
        { mongo_user_id: { $exists: true } },
        { sync_source: { $exists: true } }
      ]
    });
    console.log(`⚠️ Orders with old schema fields: ${oldSchemaOrders.length}`);
    
    // Test 4: Check products field format
    const stringProducts = await Order.find({ products: { $type: 'string' } });
    const arrayProducts = await Order.find({ products: { $type: 'array' } });
    console.log(`📝 Orders with string products: ${stringProducts.length}`);
    console.log(`📝 Orders with array products: ${arrayProducts.length}`);
    
    console.log('🎉 Orders endpoint test complete!');
    
  } catch (error) {
    console.error('❌ Orders endpoint test failed:', error);
  } finally {
    mongoose.connection.close();
  }
} 