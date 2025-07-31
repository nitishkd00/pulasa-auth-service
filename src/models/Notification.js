const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: { type: String, required: true }, // User ID from the order
  type: { 
    type: String, 
    enum: ['order_approved', 'order_rejected', 'order_shipped', 'order_status_update', 'general'],
    default: 'order_status_update'
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  order_id: { type: String },
  order_number: { type: String },
  read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema); 