const mongoose = require('mongoose');

const toSlug = (name) =>
  name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

const perfumeSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  slug:         { type: String, unique: true },
  price:        { type: Number, required: true },
  description:  String,
  scentProfile: [String],
  image:        String,
  images:       [String],
  stock:        { type: Number, default: 0 },
  featured:     { type: Boolean, default: false },

  // #7 Product Variants (sizes/volumes)
  variants: [{
    label: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
  }],

  // #13 Soft Delete
  isDeleted:  { type: Boolean, default: false },
  deletedAt:  { type: Date,    default: null },

  flashSale: {
    active:    { type: Boolean, default: false },
    salePrice: { type: Number },
    endsAt:    { type: Date },
  },
}, { timestamps: true });

perfumeSchema.index({ name: 'text' });
perfumeSchema.index({ featured: 1 });
perfumeSchema.index({ 'flashSale.active': 1 });

// ✅ No "next" parameter
perfumeSchema.pre('save', async function () {
  if (!this.isModified('name') && this.slug) return;
  let base = toSlug(this.name);
  let slug = base;
  let count = 1;
  while (await mongoose.model('Perfume').findOne({ slug, _id: { $ne: this._id } })) {
    slug = `${base}-${count++}`;
  }
  this.slug = slug;
});

// ✅ No "next" parameter
perfumeSchema.pre('findOneAndUpdate', async function () {
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
});

module.exports = mongoose.model('Perfume', perfumeSchema);