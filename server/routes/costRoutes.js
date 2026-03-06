const express = require('express');
const router = express.Router();
const CostRecord = require('../models/CostRecord');
const Perfume = require('../models/Perfume');
const { verifyAdmin } = require('../middleware/authMiddleware');
const { validate, createCostRecordSchema } = require('../middleware/validate');

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

// GET WAC summary per perfume (admin only) — must be above /:id
router.get('/summary/wac', verifyAdmin, async (req, res) => {
  try {
    const { perfumeId } = req.query;
    const query = { remainingBottles: { $gt: 0 } };
    if (perfumeId) query.perfumeId = perfumeId;

    const records = await CostRecord.find(query);

    // Group by perfumeId and compute WAC
    const map = {};
    for (const r of records) {
      const pid = r.perfumeId.toString();
      if (!map[pid]) map[pid] = { perfumeId: pid, perfumeName: r.perfumeName, totalValue: 0, totalBottles: 0, sellingPrice: r.sellingPrice, batches: [] };
      const remaining = r.remainingBottles ?? r.bottlesProduced;
      map[pid].totalValue   += r.costPerBottle * remaining;
      map[pid].totalBottles += remaining;
      map[pid].batches.push({ recordId: r._id, date: r.createdAt, costPerBottle: r.costPerBottle, remaining });
    }

    const summaries = Object.values(map).map(s => {
      const wac          = s.totalBottles > 0 ? s.totalValue / s.totalBottles : 0;
      const profitPerBottle = s.sellingPrice - wac;
      const profitMargin = s.sellingPrice > 0 ? (profitPerBottle / s.sellingPrice) * 100 : 0;
      return { ...s, wac: Math.round(wac * 100) / 100, profitPerBottle: Math.round(profitPerBottle * 100) / 100, profitMargin: Math.round(profitMargin * 10) / 10 };
    });

    res.json(summaries);
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
router.post('/', verifyAdmin, validate(createCostRecordSchema), async (req, res) => {
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
      remainingBottles: bottlesProduced,
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

// PATCH update remaining stock for a cost record (admin only)
router.patch('/:id/stock', verifyAdmin, async (req, res) => {
  try {
    const { sold } = req.body;
    const record = await CostRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    const current = record.remainingBottles ?? record.bottlesProduced;
    if (sold > current) return res.status(400).json({ message: `Only ${current} bottles remaining in this batch` });

    record.remainingBottles = current - sold;
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
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