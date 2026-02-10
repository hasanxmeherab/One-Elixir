const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');

// 1. VALIDATE COUPON (For Customers at Checkout)
router.post('/validate', async (req, res) => {
  const { code } = req.body;
  try {
    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(), 
      isActive: true 
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

// 2. GET ALL COUPONS (For Admin Panel)
router.get('/', async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ _id: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. CREATE NEW COUPON (For Admin Panel)
router.post('/', async (req, res) => {
  const { code, discountValue, discountType } = req.body;
  try {
    const newCoupon = new Coupon({
      code: code.toUpperCase(),
      discountValue: Number(discountValue),
      discountType
    });
    const saved = await newCoupon.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: "Coupon code already exists or data is invalid." });
  }
});

// 4. DELETE COUPON (For Admin Panel)
router.delete('/:id', async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: "Coupon successfully removed." });
  } catch (err) {
    res.status(500).json({ message: "Error deleting coupon." });
  }
});

module.exports = router;