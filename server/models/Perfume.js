const mongoose = require('mongoose');

const perfumeSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  price:        { type: Number, required: true },
  description:  String,
  scentProfile: [String],
  image:        String,          // primary image (kept for backwards compat)
  images:       [String],        // full gallery array
  stock:        { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Perfume', perfumeSchema);