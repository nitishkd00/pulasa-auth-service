const mongoose = require('mongoose');
const Order = require('./src/models/Order');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pulasa', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function migrateOrders() {
  try {
    console.log('🔧 Starting order migration...');
    
    // Find all orders
    const orders = await Order.find({});
    console.log(`Found ${orders.length} orders to check`);
    
    let migratedCount = 0;
    
    for (const order of orders) {
      // Check if products is a string (old format)
      if (typeof order.products === 'string') {
        try {
          // Try to parse the string as JSON
          const parsedProducts = JSON.parse(order.products);
          
          // Update the order with the parsed products array
          await Order.findByIdAndUpdate(order._id, {
            products: parsedProducts
          });
          
          console.log(`✅ Migrated order ${order.order_number}: ${order.products.length} characters -> ${parsedProducts.length} products`);
          migratedCount++;
        } catch (parseError) {
          console.log(`❌ Failed to parse products for order ${order.order_number}:`, parseError.message);
        }
      } else if (Array.isArray(order.products)) {
        console.log(`✅ Order ${order.order_number} already has correct format`);
      } else {
        console.log(`⚠️ Order ${order.order_number} has unexpected products format:`, typeof order.products);
      }
    }
    
    console.log(`🎉 Migration complete! Migrated ${migratedCount} orders`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

migrateOrders(); 