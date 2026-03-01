const mongoose = require('mongoose');

const perfumeSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  price:        { type: Number, required: true },
  description:  String,
  scentProfile: [String],
  image:        String,
  stock:        { type: Number, default: 0 },

  // ── Flash Sale ──────────────────────────────────────────────
  flashSale: {
    active:    { type: Boolean, default: false },
    salePrice: { type: Number },           // discounted price during sale
    endsAt:    { type: Date },             // countdown target
  },
});

module.exports = mongoose.model('Perfume', perfumeSchema);