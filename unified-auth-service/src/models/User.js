const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  is_admin: { type: Boolean, default: false },
  wallet_balance: { type: Number, default: 0.00 },
  locked_amount: { type: Number, default: 0.00 },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Instance method to convert to unified user format
userSchema.methods.toUnifiedUser = function() {
  return {
    id: this._id,
    email: this.email,
    name: this.name,
    phone: this.phone,
    address: this.address,
    is_admin: this.is_admin,
    wallet_balance: this.wallet_balance,
    locked_amount: this.locked_amount,
    created_at: this.created_at,
    updated_at: this.updated_at
  };
};

module.exports = mongoose.model('User', userSchema);
