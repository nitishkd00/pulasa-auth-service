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
  checkDatabase();
}).catch(err => {
  console.error('❌ MongoDB Atlas connection failed:', err);
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking MongoDB Atlas database...');
    console.log('Connection URL:', MONGODB_URI);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📚 Collections found:', collections.map(c => c.name));
    
    // Check orders collection
    const Order = require('./src/models/Order');
    const orderCount = await Order.countDocuments();
    console.log(`📦 Orders count: ${orderCount}`);
    
    if (orderCount > 0) {
      const sampleOrder = await Order.findOne();
      console.log('📋 Sample order:', {
        id: sampleOrder._id,
        order_number: sampleOrder.order_number,
        user_id: sampleOrder.user_id,
        amount: sampleOrder.amount
      });
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    mongoose.connection.close();
  }
} 