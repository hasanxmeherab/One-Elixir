const mongoose = require('mongoose');

const bundleSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  image:       { type: String, default: '' },
  products:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Perfume', required: true }],
  bundlePrice: { type: Number, required: true },
  active:      { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Bundle', bundleSchema);