const express = require('express');
const router = express.Router();
const Perfume = require('../models/Perfume');
const Log = require('../models/Log');
const Order = require('../models/Order');
const Review = require('../models/Review');
const generateSitemap = require('../utils/generateSitemap');
const { verifyAdmin } = require('../middleware/authMiddleware');

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

// GET all perfumes with search support (public)
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search && search.trim() !== '') {
      query.name = { $regex: search.trim(), $options: 'i' };
    }
    const perfumes = await Perfume.find(query);
    res.json(perfumes);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    const perfume = await Perfume.findOne({ slug: req.params.slug });
    if (!perfume) return res.status(404).json({ message: 'Elixir not found' });
    res.json(perfume);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET best sellers — top 4 products by units sold
router.get('/best-sellers', async (req, res) => {
  try {
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
    const perfumes = await Perfume.find({ name: { $in: topNames } });
    const sorted = topNames.map(name => perfumes.find(p => p.name === name)).filter(Boolean);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single perfume by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const perfume = await Perfume.findById(req.params.id);
    if (!perfume) return res.status(404).json({ message: 'Elixir not found' });
    res.json(perfume);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new perfume
router.post('/', verifyAdmin, async (req, res) => {
  const perfume = new Perfume({
    name:         req.body.name,
    price:        req.body.price,
    description:  req.body.description,
    scentProfile: req.body.scentProfile,
    image:        req.body.image,
    images:       req.body.images || [],
    stock:        req.body.stock || 0,
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
    generateSitemap(Perfume).catch(() => {});
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE perfume
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const perfume = await Perfume.findById(req.params.id);
    if (!perfume) return res.status(404).json({ message: 'Perfume not found' });

    await Perfume.findByIdAndDelete(req.params.id);
    await Review.deleteMany({ perfumeId: req.params.id });
    await writeLog(req, 'DELETE_PRODUCT', 'Perfume',
      `Deleted perfume "${perfume.name}" and its reviews`);

    res.json({ message: 'Product removed' });
    generateSitemap(Perfume).catch(() => {});
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    res.json(updatedPerfume);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;