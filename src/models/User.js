const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password_hash: { type: String }, // Made optional for Google OAuth users
  name: { type: String, required: true },
  phone: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        // Indian mobile number validation: +91 followed by 10 digits, or 10 digits starting with 6-9
        return /^(\+91[6-9]\d{9}|[6-9]\d{9})$/.test(v);
      },
      message: props => `${props.value} is not a valid Indian mobile number!`
    }
  },
  address: { type: String },
  is_admin: { type: Boolean, default: false },
  wallet_balance: { type: Number, default: 0.00 },
  locked_amount: { type: Number, default: 0.00 },
  // Google OAuth fields
  google_id: { type: String, sparse: true }, // Sparse index for optional field
  is_verified: { type: Boolean, default: false },
  auth_provider: { type: String, enum: ['local', 'google'], default: 'local' }
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
    updated_at: this.updated_at,
    is_verified: this.is_verified,
    auth_provider: this.auth_provider
  };
};

module.exports = mongoose.model('User', userSchema);
