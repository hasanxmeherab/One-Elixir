const mongoose = require('mongoose');

const perfumeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  scentProfile: [String],
  image: String,
  stock: { type: Number, default: 0 }
});

module.exports = mongoose.model('Perfume', perfumeSchema);