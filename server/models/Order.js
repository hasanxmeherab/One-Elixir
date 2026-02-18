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
      price: Number, 
      quantity: { type: Number, default: 1 },
      discountType: { type: String, enum: ['fixed', 'percentage', 'none'], default: 'none' },
      discountValue: { type: Number, default: 0 },
      finalItemPrice: { type: Number } 
    }
  ],
  totalAmount: { type: Number, required: true },
  discountApplied: { type: Number, default: 0 }, 
  status: { type: String, default: 'Pending' },
  // --- NEW FIELDS ---
  paymentMethod: { type: String, default: 'Cash on Delivery' }, 
  paymentStatus: { type: String, default: 'Unpaid' }, 
  // ------------------
  isManual: { type: Boolean, default: false }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);