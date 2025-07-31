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
  removeSupabaseId();
}).catch(err => {
  console.error('❌ MongoDB Atlas connection failed:', err);
});

async function removeSupabaseId() {
  try {
    console.log('🔧 Removing supabase_id field and index...');
    
    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');
    
    // Drop the supabase_id unique index
    try {
      await ordersCollection.dropIndex('supabase_id_1');
      console.log('✅ Dropped supabase_id unique index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️ supabase_id index does not exist, skipping...');
      } else {
        console.log('⚠️ Error dropping index:', error.message);
      }
    }
    
    // Remove supabase_id field from all documents
    const result = await ordersCollection.updateMany(
      { supabase_id: { $exists: true } },
      { $unset: { supabase_id: 1 } }
    );
    
    console.log(`✅ Removed supabase_id field from ${result.modifiedCount} orders`);
    
    // Also remove other unnecessary fields
    const result2 = await ordersCollection.updateMany(
      { 
        $or: [
          { sync_source: { $exists: true } },
          { last_synced: { $exists: true } },
          { mongo_user_id: { $exists: true } }
        ]
      },
      { 
        $unset: { 
          sync_source: 1, 
          last_synced: 1, 
          mongo_user_id: 1 
        } 
      }
    );
    
    console.log(`✅ Removed other unnecessary fields from ${result2.modifiedCount} orders`);
    
    // List all indexes to verify
    const indexes = await ordersCollection.listIndexes().toArray();
    console.log('📋 Current indexes:', indexes.map(idx => idx.name));
    
    console.log('🎉 Database cleanup complete!');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
  } finally {
    mongoose.connection.close();
  }
} 