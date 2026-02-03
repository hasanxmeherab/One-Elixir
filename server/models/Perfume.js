const mongoose = require('mongoose');

const perfumeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String, default: "OneElixir" },
    price: { type: Number, required: true },
    description: String,
    scentProfile: [String], // e.g., ["Woody", "Citrus"]
    image: String,
    stock: Number
});

module.exports = mongoose.model('Perfume', perfumeSchema);