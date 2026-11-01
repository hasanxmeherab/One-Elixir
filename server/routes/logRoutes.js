const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const { verifyAdmin, verifySuperadmin } = require('../middleware/authMiddleware');
const { logQuery } = require('../utils/logQuery');

// GET all logs — admin only, newest first, optional limit
router.get('/', verifyAdmin, async (req, res) => {
  try {
    if (req.query.page !== undefined) {
      let options;
      try { options = logQuery(req.query); }
      catch (err) { return res.status(400).json({ message: err.message }); }
      const { filter, page, pageSize } = options;
      const [items, total, actions] = await Promise.all([
        Log.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
        Log.countDocuments(filter), Log.distinct('action'),
      ]);
      return res.json({ items, total, page, pageSize, actions });
    }
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
    const logs = await Log.find().sort({ createdAt: -1 }).limit(limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET logs by admin
router.get('/admin/:adminId', verifyAdmin, async (req, res) => {
  try {
    const logs = await Log.find({ adminId: req.params.adminId })
      .sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE all logs — superadmin only
router.delete('/', verifySuperadmin, async (req, res) => {
  try {
    await Log.deleteMany({});
    res.json({ message: 'Logs cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
