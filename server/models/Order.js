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
  shippingCost: { type: Number, default: 0 },
  discountApplied: { type: Number, default: 0 }, 
  status: { type: String, default: 'Pending' },
  paymentMethod: { type: String, default: 'Cash on Delivery' }, 
  paymentStatus: { type: String, default: 'Unpaid' }, 
  // --- UPDATED PAYMENT DETAILS ---
  paymentDetails: {
    senderNumber: String,
    transactionId: String,
    platform: String,
    screenshot: String,
    amountPaid: Number // To track if they paid delivery charge or full amount
  },
  isManual: { type: Boolean, default: false },
  createdBy: { type: String }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);