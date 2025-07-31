const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  amount: { type: Number, required: true },
  order_number: { type: String, required: true, unique: true },
  products: [{ 
    product_id: { type: String },
    name: { type: String },
    price: { type: Number },
    quantity: { type: Number }
  }],
  address: { type: String },
  first_name: { type: String },
  last_name: { type: String },
  phone: { type: String },
  city: { type: String },
  state: { type: String },
  zip: { type: String },
  status: { type: String, default: 'order_raised' },
  upi_reference: { type: String }
  // Removed supabase_id and other unnecessary fields since we're only using MongoDB
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Order', orderSchema); 