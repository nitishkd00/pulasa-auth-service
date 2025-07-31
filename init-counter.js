require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./src/models/Order');
const Counter = require('./src/models/Counter');

// Use the same MongoDB Atlas connection as the main server
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://nitishkumardevoju:muwLYrPn5blRAGCd@pulasa.sjvscku.mongodb.net/?retryWrites=true&w=majority&appName=pulasa';

// Connect to MongoDB Atlas
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function initCounter() {
  try {
    console.log('🔧 Initializing order counter...');
    
    // Count existing orders
    const orderCount = await Order.countDocuments();
    console.log(`Found ${orderCount} existing orders`);
    
    // Initialize or update the counter
    await Counter.findByIdAndUpdate(
      'orderNumber',
      { seq: orderCount },
      { upsert: true }
    );
    
    console.log(`✅ Counter initialized to ${orderCount}`);
    console.log(`📝 Next order number will be: P${String(orderCount + 1).padStart(6, '0')}`);
    
  } catch (error) {
    console.error('❌ Counter initialization failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

initCounter(); 