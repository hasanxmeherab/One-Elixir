const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  adminId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  adminName: { type: String, required: true },
  action:    { type: String, required: true },   // e.g. 'UPDATE_PRICE'
  target:    { type: String, required: true },   // e.g. 'Perfume'
  detail:    { type: String, required: true },   // human-readable description
  ip:        { type: String, default: '' }
}, { timestamps: true });

logSchema.index({ adminId: 1 });
logSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Log', logSchema);