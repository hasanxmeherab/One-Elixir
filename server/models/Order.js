const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerEmail: { type: String }, 
  phone: { type: String, required: true },
  address: { type: String },
  items: [
    {
      perfumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Perfume' },
      name: String,
      price: Number, // Original Price
      quantity: { type: Number, default: 1 },
      // NEW: Individual Item Discount Tracking
      discountType: { type: String, enum: ['fixed', 'percentage', 'none'], default: 'none' },
      discountValue: { type: Number, default: 0 },
      finalItemPrice: { type: Number } // Price after manual item discount
    }
  ],
  totalAmount: { type: Number, required: true },
  discountApplied: { type: Number, default: 0 }, // Coupon discount
  status: { type: String, default: 'Pending' },
  isManual: { type: Boolean, default: false }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);