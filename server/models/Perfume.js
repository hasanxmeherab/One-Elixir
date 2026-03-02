const mongoose = require('mongoose');

// Converts "Bleu de Chanel" → "bleu-de-chanel"
const toSlug = (name) =>
  name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

const perfumeSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  slug:         { type: String, unique: true },   // ← URL-friendly name
  price:        { type: Number, required: true },
  description:  String,
  scentProfile: [String],
  image:        String,
  images:       [String],
  stock:        { type: Number, default: 0 },

  // ── Flash Sale ──────────────────────────────────────────────
  flashSale: {
    active:    { type: Boolean, default: false },
    salePrice: { type: Number },
    endsAt:    { type: Date },
  },
});

// Auto-generate slug from name before saving
perfumeSchema.pre('save', async function (next) {
  if (!this.isModified('name') && this.slug) return next();
  let base = toSlug(this.name);
  let slug = base;
  let count = 1;
  // Ensure uniqueness
  while (await mongoose.model('Perfume').findOne({ slug, _id: { $ne: this._id } })) {
    slug = `${base}-${count++}`;
  }
  this.slug = slug;
  next();
});

// Also handle findByIdAndUpdate — regenerate slug if name changes
perfumeSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  if (update.name) {
    let base = toSlug(update.name);
    let slug = base;
    let count = 1;
    const docId = this.getQuery()._id;
    while (await mongoose.model('Perfume').findOne({ slug, _id: { $ne: docId } })) {
      slug = `${base}-${count++}`;
    }
    this.setUpdate({ ...update, slug });
  }
  next();
});

module.exports = mongoose.model('Perfume', perfumeSchema);