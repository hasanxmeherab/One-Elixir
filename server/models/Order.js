const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  // 1. Added customerEmail to link orders to user accounts
  customerEmail: { type: String }, 
  phone: { type: String, required: true },
  address: { type: String },
  items: [
    {
      perfumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Perfume' },
      name: String,
      price: Number,
      quantity: { type: Number, default: 1 }
    }
  ],
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'Pending' },
  // 2. Added isManual flag to separate business entries from customer purchases
  isManual: { type: Boolean, default: false }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);