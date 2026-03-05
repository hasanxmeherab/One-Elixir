const express = require('express');
const router = express.Router();
const CostRecord = require('../models/CostRecord');
const Perfume = require('../models/Perfume');
const { verifyAdmin } = require('../middleware/authMiddleware');

// GET all cost records (admin only)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const { perfumeId } = req.query;
    const query = perfumeId ? { perfumeId } : {};
    const records = await CostRecord.find(query).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single record (admin only)
router.get('/:id', verifyAdmin, async (req, res) => {
  try {
    const record = await CostRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new cost record (admin only)
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { perfumeId, ingredients, packaging, bottlesProduced, notes } = req.body;

    const perfume = await Perfume.findById(perfumeId);
    if (!perfume) return res.status(404).json({ message: 'Perfume not found' });

    const packagingCost   = (packaging || []).reduce((sum, p) => sum + Number(p.cost || 0), 0);
    const totalCost       = ingredients.reduce((sum, i) => sum + Number(i.cost), 0) + packagingCost;
    const costPerBottle   = totalCost / bottlesProduced;
    const sellingPrice    = perfume.price;
    const profitPerBottle = sellingPrice - costPerBottle;
    const profitMargin    = ((profitPerBottle / sellingPrice) * 100);

    const record = await CostRecord.create({
      perfumeId,
      perfumeName:  perfume.name,
      ingredients,
      packaging: packaging || [],
      bottlesProduced,
      totalCost,
      costPerBottle,
      sellingPrice,
      profitPerBottle,
      profitMargin,
      notes: notes || '',
    });

    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE cost record (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await CostRecord.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;