const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const { verifyAdmin } = require('../middleware/authMiddleware');

// GET all logs — admin only, newest first, optional limit
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
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
router.delete('/', async (req, res) => {
  try {
    await Log.deleteMany({});
    res.json({ message: 'Logs cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;