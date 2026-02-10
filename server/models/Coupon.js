const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true }, // e.g., "ELIXIR10"
  discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  discountValue: { type: Number, required: true }, // e.g., 10 for 10%
  expiryDate: { type: Date },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Coupon', couponSchema);