const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  perfumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Perfume', required: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName:  { type: String, required: true },
  rating:    { type: Number, required: true, min: 1, max: 5 },
  comment:   { type: String, required: true, trim: true },
  images:    [{ type: String }], // ← up to 3 Cloudinary URLs
}, { timestamps: true });

reviewSchema.index({ perfumeId: 1 });
reviewSchema.index({ userId: 1, perfumeId: 1 });

module.exports = mongoose.model('Review', reviewSchema);