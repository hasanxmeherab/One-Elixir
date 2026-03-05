const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const { verifyAdmin } = require('../middleware/authMiddleware');

// 1. GET all active banners for the homepage
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. POST a new banner (admin only)
router.post('/', verifyAdmin, async (req, res) => {
  const { imageUrl, title, subtitle, link } = req.body;

  const banner = new Banner({
    imageUrl,
    title,
    subtitle,
    link: link || "/shop",
    isActive: true
  });

  try {
    const newBanner = await banner.save();
    res.status(201).json(newBanner);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 3. DELETE a banner (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: "Banner not found" });

    await Banner.findByIdAndDelete(req.params.id);
    res.json({ message: "Banner deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;