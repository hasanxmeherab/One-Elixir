const mongoose = require('mongoose');

const paymentLedgerSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  adminName: { type: String, required: true },
  amount: { type: Number, required: true },
  type: {
    type: String,
    enum: ['collection', 'settlement', 'adjustment', 'received_from_admin', 'vault_transfer'],
    required: true
  },
  paymentMethod: { type: String, default: '' },
  settlementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Settlement', default: null },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

paymentLedgerSchema.index({ adminId: 1 });
paymentLedgerSchema.index({ type: 1 });
paymentLedgerSchema.index({ createdAt: -1 });
paymentLedgerSchema.index({ orderId: 1 });

module.exports = mongoose.model('PaymentLedger', paymentLedgerSchema);
