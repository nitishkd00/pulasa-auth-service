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
  migrateProducts();
}).catch(err => {
  console.error('❌ MongoDB Atlas connection failed:', err);
});

async function migrateProducts() {
  try {
    console.log('🔧 Migrating string products to arrays...');
    
    const Order = require('./src/models/Order');
    
    // Find all orders with string products
    const ordersWithStringProducts = await Order.find({ products: { $type: 'string' } });
    console.log(`Found ${ordersWithStringProducts.length} orders with string products`);
    
    let migratedCount = 0;
    
    for (const order of ordersWithStringProducts) {
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
        
        // If parsing fails, create a default product structure
        const defaultProduct = {
          product_id: 'unknown',
          name: 'Product',
          price: order.amount || 0,
          quantity: 1
        };
        
        await Order.findByIdAndUpdate(order._id, {
          products: [defaultProduct]
        });
        
        console.log(`⚠️ Created default product for order ${order.order_number}`);
        migratedCount++;
      }
    }
    
    console.log(`🎉 Migration complete! Migrated ${migratedCount} orders`);
    
    // Verify the migration
    const stringProductsAfter = await Order.find({ products: { $type: 'string' } });
    const arrayProductsAfter = await Order.find({ products: { $type: 'array' } });
    console.log(`📝 Orders with string products after migration: ${stringProductsAfter.length}`);
    console.log(`📝 Orders with array products after migration: ${arrayProductsAfter.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
} 