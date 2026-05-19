const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const { verifyAdmin } = require('../middleware/authMiddleware');
const { validate, createBannerSchema } = require('../middleware/validate');

// 1. GET all active banners for the homepage — #20 Cached
router.get('/', async (req, res) => {
  try {
    const cached = req.app.cacheGet?.('banners:active');
    if (cached) {
      console.log(`[${req.id}] Banners served from cache`);
      return res.json(cached);
    }
    
    const banners = await Banner.find({ isActive: true });
    req.app.cacheSet?.('banners:active', banners);
    console.log(`[${req.id}] Fetched ${banners.length} active banners from DB`);
    res.json(banners);
  } catch (err) {
    console.error(`[${req.id}] Banner fetch error:`, {
      message: err.message,
      stack: err.stack,
      mongoState: require('mongoose').connection.readyState
    });
    res.status(500).json({ success: false, message: 'Failed to fetch banners', error: err.message });
  }
});

// 2. POST a new banner (admin only)
router.post('/', verifyAdmin, validate(createBannerSchema), async (req, res) => {
  const { imageUrl, title, subtitle, link } = req.body;

  const banner = new Banner({
    imageUrl,
    title,
    subtitle,
    link: link || "/collection",
    isActive: true
  });

  try {
    const newBanner = await banner.save();
    req.app.cacheDel?.('banners:');
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
    req.app.cacheDel?.('banners:');
    res.json({ message: "Banner deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;