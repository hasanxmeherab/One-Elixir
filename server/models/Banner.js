const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  title: { type: String },
  subtitle: { type: String },
  link: { type: String, default: "/shop" }, // Where the banner leads
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Banner', bannerSchema);