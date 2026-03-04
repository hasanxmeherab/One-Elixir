const express = require('express');
const router  = express.Router();
const Bundle  = require('../models/Bundle');

// GET all active bundles (public)
router.get('/', async (req, res) => {
  try {
    const { admin } = req.query;
    const query = admin === 'true' ? {} : { active: true };
    const bundles = await Bundle.find(query).populate('products').sort({ createdAt: -1 });
    res.json(bundles);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET single bundle
router.get('/:id', async (req, res) => {
  try {
    const bundle = await Bundle.findById(req.params.id).populate('products');
    if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
    res.json(bundle);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create bundle (admin)
router.post('/', async (req, res) => {
  try {
    const bundle = await Bundle.create(req.body);
    const populated = await bundle.populate('products');
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PUT update bundle (admin)
router.put('/:id', async (req, res) => {
  try {
    const bundle = await Bundle.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('products');
    if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
    res.json(bundle);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE bundle (admin)
router.delete('/:id', async (req, res) => {
  try {
    await Bundle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bundle deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;