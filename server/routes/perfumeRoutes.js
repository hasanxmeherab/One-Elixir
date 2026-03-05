const express = require('express');
const router = express.Router();
const Perfume = require('../models/Perfume');
const Log = require('../models/Log');
const Order = require('../models/Order');
const Review = require('../models/Review');
const generateSitemap = require('../utils/generateSitemap');
const sendEmail = require('../utils/sendEmail');
const { verifyAdmin } = require('../middleware/authMiddleware');
const { validate, createPerfumeSchema, updatePerfumeSchema } = require('../middleware/validate');

// Helper — write activity log silently
const writeLog = async (req, action, target, detail) => {
  try {
    await Log.create({
      adminId:   req.admin?.id   || null,
      adminName: req.admin?.name || 'Admin',
      action, target, detail,
      ip: req.ip || ''
    });
  } catch (e) {
    console.error('Log write failed:', e.message);
  }
};

// GET all perfumes with search support (public) — #19 server-side pagination, #20 cache
router.get('/', async (req, res) => {
  try {
    const { search, page, limit: lim } = req.query;
    let query = { isDeleted: { $ne: true } };
    if (search && search.trim() !== '') {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    // Server-side pagination when ?page= is provided
    if (page) {
      const pageNum = parseInt(page);
      const limit = parseInt(lim) || 12;
      const skip = (pageNum - 1) * limit;
      const cacheKey = `perfumes:${search || ''}:${pageNum}:${limit}`;
      const cached = req.app.cacheGet?.(cacheKey);
      if (cached) return res.json(cached);

      const [perfumes, total] = await Promise.all([
        Perfume.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Perfume.countDocuments(query),
      ]);
      const result = { perfumes, total, page: pageNum, pages: Math.ceil(total / limit) };
      req.app.cacheSet?.(cacheKey, result);
      return res.json(result);
    }

    // Flat array (backward-compatible)
    const cacheKey = `perfumes:all:${search || ''}`;
    const cached = req.app.cacheGet?.(cacheKey);
    if (cached) return res.json(cached);

    const perfumes = await Perfume.find(query);
    req.app.cacheSet?.(cacheKey, perfumes);
    res.json(perfumes);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// RESTORE STOCK
router.put('/restore-stock', verifyAdmin, async (req, res) => {
  try {
    const { id, quantity } = req.body;
    const perfume = await Perfume.findById(id);
    if (!perfume) return res.status(404).json({ message: 'Perfume not found' });

    perfume.stock = (Number(perfume.stock) || 0) + Number(quantity);
    await perfume.save();

    await writeLog(req, 'RESTORE_STOCK', 'Perfume',
      `Restored ${quantity} units of "${perfume.name}" (new stock: ${perfume.stock})`);

    res.json({ message: 'Stock successfully restored', newStock: perfume.stock });
  } catch (err) {
    res.status(500).json({ message: 'Error restoring stock', error: err.message });
  }
});


// GET single perfume by slug (public) — used by ProductDetails page
router.get('/slug/:slug', async (req, res) => {
  try {
    const perfume = await Perfume.findOne({ slug: req.params.slug, isDeleted: { $ne: true } });
    if (!perfume) return res.status(404).json({ success: false, message: 'Elixir not found' });
    res.json(perfume);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET best sellers — top 4 products by units sold
router.get('/best-sellers', async (req, res) => {
  try {
    const cached = req.app.cacheGet?.('perfumes:best-sellers');
    if (cached) return res.json(cached);

    const delivered = await Order.find({ status: 'Delivered', paymentStatus: 'Paid' });
    const map = {};
    delivered.forEach(o => o.items?.forEach(item => {
      if (!map[item.name]) map[item.name] = { name: item.name, units: 0 };
      map[item.name].units += item.quantity;
    }));
    const topNames = Object.values(map)
      .sort((a, b) => b.units - a.units)
      .slice(0, 4)
      .map(x => x.name);
    if (topNames.length === 0) return res.json([]);
    const perfumes = await Perfume.find({ name: { $in: topNames }, isDeleted: { $ne: true } });
    const sorted = topNames.map(name => perfumes.find(p => p.name === name)).filter(Boolean);
    req.app.cacheSet?.('perfumes:best-sellers', sorted);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// #8 Search autocomplete — GET /api/perfumes/search?q=
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);
    const results = await Perfume.find(
      { $text: { $search: q.trim() }, isDeleted: { $ne: true } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } }).limit(5).select('name slug image price');
    res.json(results);
  } catch {
    try {
      const results = await Perfume.find({
        name: { $regex: req.query.q?.trim(), $options: 'i' },
        isDeleted: { $ne: true }
      }).limit(5).select('name slug image price');
      res.json(results);
    } catch { res.json([]); }
  }
});

// #12 Low stock alert — GET /api/perfumes/low-stock?threshold=5
router.get('/low-stock', verifyAdmin, async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5;
    const products = await Perfume.find({ stock: { $lte: threshold }, isDeleted: { $ne: true } })
      .select('name stock image')
      .sort({ stock: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch low stock products' });
  }
});

// #9 Review aggregation — GET /api/perfumes/ratings
router.get('/ratings', async (req, res) => {
  try {
    const cached = req.app.cacheGet?.('perfumes:ratings');
    if (cached) return res.json(cached);
    const ratings = await Review.aggregate([
      { $group: { _id: '$perfumeId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const map = {};
    ratings.forEach(r => { map[r._id] = { avgRating: Math.round(r.avgRating * 10) / 10, count: r.count }; });
    req.app.cacheSet?.('perfumes:ratings', map);
    res.json(map);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch ratings' });
  }
});

// GET single perfume by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const perfume = await Perfume.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!perfume) return res.status(404).json({ success: false, message: 'Elixir not found' });
    res.json(perfume);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST new perfume
router.post('/', verifyAdmin, validate(createPerfumeSchema), async (req, res) => {
  const perfume = new Perfume({
    name:         req.body.name,
    price:        req.body.price,
    description:  req.body.description,
    scentProfile: req.body.scentProfile,
    image:        req.body.image,
    images:       req.body.images || [],
    stock:        req.body.stock || 0,
    variants:     req.body.variants || [],
    // ── Flash Sale ──────────────────────────────────────────
    flashSale: {
      active:    req.body.flashSale?.active    || false,
      salePrice: req.body.flashSale?.salePrice || null,
      endsAt:    req.body.flashSale?.endsAt    || null,
    },
  });
  try {
    const newPerfume = await perfume.save();
    await writeLog(req, 'CREATE_PRODUCT', 'Perfume',
      `Added new perfume "${newPerfume.name}" at ${newPerfume.price} TK (stock: ${newPerfume.stock})`);
    res.status(201).json(newPerfume);
    req.app.cacheDel?.('perfumes:');
    generateSitemap(Perfume).catch(() => {});
  } catch (err) {
    res.status(400).json({ success: false, message: 'Failed to create product' });
  }
});

// #13 SOFT DELETE perfume
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const perfume = await Perfume.findById(req.params.id);
    if (!perfume) return res.status(404).json({ success: false, message: 'Perfume not found' });

    perfume.isDeleted = true;
    perfume.deletedAt = new Date();
    await perfume.save();
    await Review.deleteMany({ perfumeId: req.params.id });
    await writeLog(req, 'DELETE_PRODUCT', 'Perfume',
      `Soft-deleted perfume "${perfume.name}" and its reviews`);

    res.json({ success: true, message: 'Product removed' });
    req.app.cacheDel?.('perfumes:');
    generateSitemap(Perfume).catch(() => {});
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

// UPDATE perfume
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const before = await Perfume.findById(req.params.id);
    const updatedPerfume = await Perfume.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // Build a specific detail message about what changed
    const changes = [];
    if (req.body.price !== undefined && before.price !== req.body.price)
      changes.push(`price ${before.price} → ${req.body.price} TK`);
    if (req.body.stock !== undefined && before.stock !== req.body.stock)
      changes.push(`stock ${before.stock} → ${req.body.stock}`);
    if (req.body.name !== undefined && before.name !== req.body.name)
      changes.push(`name "${before.name}" → "${req.body.name}"`);
    // ── Flash Sale log ──────────────────────────────────────
    if (req.body.flashSale?.active === true)
      changes.push(`flash sale activated at ${req.body.flashSale.salePrice} TK`);
    if (req.body.flashSale?.active === false)
      changes.push(`flash sale ended`);

    const detail = changes.length
      ? `Updated "${before.name}": ${changes.join(', ')}`
      : `Updated "${before.name}"`;

    await writeLog(req, 'UPDATE_PRODUCT', 'Perfume', detail);
    req.app.cacheDel?.('perfumes:');
    res.json(updatedPerfume);
  } catch (err) {
    res.status(400).json({ success: false, message: 'Failed to update product' });
  }
});

module.exports = router;