const express = require('express');
const router  = express.Router();
const Review  = require('../models/Review');

// GET all reviews for a product
router.get('/:perfumeId', async (req, res) => {
  try {
    const reviews = await Review.find({ perfumeId: req.params.perfumeId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// POST new review (with optional image URLs)
router.post('/', async (req, res) => {
  try {
    const { perfumeId, userId, userName, rating, comment, images } = req.body;
    if (!perfumeId || !userName || !rating || !comment)
      return res.status(400).json({ message: 'All fields required' });

    if (userId) {
      const existing = await Review.findOne({ perfumeId, userId });
      if (existing) return res.status(409).json({ message: 'You have already reviewed this product' });
    }

    const review = new Review({
      perfumeId, userId, userName, rating, comment,
      images: (images || []).slice(0, 3), // max 3 photos
    });
    await review.save();
    res.status(201).json(review);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// DELETE review (admin)
router.delete('/:id', async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;