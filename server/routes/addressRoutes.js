const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const jwt     = require('jsonwebtoken');

// Auth middleware — extract user from token
const authUser = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    req.userId = jwt.verify(token, process.env.JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// GET /api/addresses — get all addresses for logged-in user
router.get('/', authUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('addresses');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.addresses || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/addresses — add new address
router.post('/', authUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const newAddr = req.body;
    if (newAddr.isDefault) user.addresses.forEach(a => { a.isDefault = false; });
    if (user.addresses.length === 0) newAddr.isDefault = true;

    user.addresses.push(newAddr);
    await user.save();
    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/addresses/:addressId/default — set default
router.put('/:addressId/default', authUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.addresses.forEach(a => {
      a.isDefault = a._id.toString() === req.params.addressId;
    });
    await user.save();
    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/addresses/:addressId — remove address
router.delete('/:addressId', authUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const wasDefault = user.addresses.find(
      a => a._id.toString() === req.params.addressId
    )?.isDefault;

    user.addresses = user.addresses.filter(
      a => a._id.toString() !== req.params.addressId
    );

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;