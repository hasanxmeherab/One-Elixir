const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  adminId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  adminName:  { type: String, required: true },
  amount:     { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  transactionId: { type: String, default: '' },
  note:       { type: String, default: '' },
  status:     {
    type: String,
    enum: ['pending', 'confirmed', 'rejected'],
    default: 'pending'
  },
  confirmedBy: {
    adminId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    adminName: { type: String, default: '' }
  },
  confirmedAt: { type: Date, default: null },
  createdAt:   { type: Date, default: Date.now }
});

settlementSchema.index({ adminId: 1 });
settlementSchema.index({ status: 1 });
settlementSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Settlement', settlementSchema);
