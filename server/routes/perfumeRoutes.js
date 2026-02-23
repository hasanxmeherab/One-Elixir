const express = require('express');
const router = express.Router();
const Perfume = require('../models/Perfume');
const Log = require('../models/Log');
const jwt = require('jsonwebtoken');

// Optional auth — extracts admin from token if present, doesn't block if absent
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) req.admin = jwt.verify(token, process.env.JWT_SECRET);
  } catch {}
  next();
};

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
router.put('/restore-stock', optionalAuth, async (req, res) => {
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

// GET single perfume (public)
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
router.post('/', optionalAuth, async (req, res) => {
  const perfume = new Perfume({
    name: req.body.name,
    price: req.body.price,
    description: req.body.description,
    scentProfile: req.body.scentProfile,
    image: req.body.image,
    stock: req.body.stock || 0
  });
  try {
    const newPerfume = await perfume.save();
    await writeLog(req, 'CREATE_PRODUCT', 'Perfume',
      `Added new perfume "${newPerfume.name}" at ${newPerfume.price} TK (stock: ${newPerfume.stock})`);
    res.status(201).json(newPerfume);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE perfume
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const perfume = await Perfume.findById(req.params.id);
    if (!perfume) return res.status(404).json({ message: 'Perfume not found' });

    await Perfume.findByIdAndDelete(req.params.id);
    await writeLog(req, 'DELETE_PRODUCT', 'Perfume',
      `Deleted perfume "${perfume.name}"`);

    res.json({ message: 'Product removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE perfume
router.put('/:id', optionalAuth, async (req, res) => {
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