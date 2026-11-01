const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Coupon = require('../models/Coupon');
const { verifyAdmin } = require('../middleware/authMiddleware');
const { validate, createCouponSchema } = require('../middleware/validate');
const writeLog = require('../utils/writeLog');

const couponLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many coupon attempts, please try again later.' }
});

// 1. VALIDATE COUPON (For Customers at Checkout)
router.post('/validate', couponLimiter, async (req, res) => {
  const { code } = req.body;
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ message: "Coupon code is required." });
  }
  try {
    // 🔒 Reject expired coupons (coupons without an expiryDate never expire)
    const coupon = await Coupon.findOne({ 
      code: code.trim().toUpperCase(), 
      isActive: true,
      $or: [
        { expiryDate: null },
        { expiryDate: { $exists: false } },
        { expiryDate: { $gt: new Date() } },
      ],
    });
    
    if (!coupon) {
      return res.status(404).json({ message: "Invalid or expired coupon code." });
    }

    res.json({ 
      discountValue: coupon.discountValue, 
      discountType: coupon.discountType 
    });
  } catch (err) {
    res.status(500).json({ message: "Server error during validation." });
  }
});

// 2. GET ALL COUPONS (admin only)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ _id: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. CREATE NEW COUPON (admin only)
router.post('/', verifyAdmin, validate(createCouponSchema), async (req, res) => {
  const { code, discountValue, discountType, expiryDate, isActive } = req.body;
  try {
    const newCoupon = new Coupon({
      code: code.toUpperCase(),
      discountValue: Number(discountValue),
      discountType,
      expiryDate: expiryDate || null,
      isActive: isActive ?? true,
    });
    const saved = await newCoupon.save();
    await writeLog(req, 'CREATE_COUPON', 'Coupon', `Created coupon ${saved.code}`);
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: "Coupon code already exists or data is invalid." });
  }
});

router.put('/:id', verifyAdmin, validate(createCouponSchema), async (req, res) => {
  try {
    const { code, discountValue, discountType, expiryDate, isActive } = req.body;
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, {
      code: code.toUpperCase(), discountValue, discountType,
      expiryDate: expiryDate || null, isActive: isActive ?? true,
    }, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });
    await writeLog(req, 'UPDATE_COUPON', 'Coupon', `Updated coupon ${coupon.code}`);
    res.json(coupon);
  } catch (err) {
    res.status(400).json({ message: err.code === 11000 ? 'Coupon code already exists.' : 'Could not update coupon.' });
  }
});

// 4. DELETE COUPON (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });
    await writeLog(req, 'DELETE_COUPON', 'Coupon', `Deleted coupon ${coupon.code}`);
    res.json({ message: "Coupon successfully removed." });
  } catch (err) {
    res.status(500).json({ message: "Error deleting coupon." });
  }
});

module.exports = router;
