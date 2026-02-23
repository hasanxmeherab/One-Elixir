const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

// GET /api/reviews/:perfumeId — get all reviews for a product
router.get('/:perfumeId', async (req, res) => {
  try {
    const reviews = await Review.find({ perfumeId: req.params.perfumeId })
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/reviews — submit a new review
router.post('/', async (req, res) => {
  try {
    const { perfumeId, userId, userName, rating, comment } = req.body;
    if (!perfumeId || !userName || !rating || !comment) {
      return res.status(400).json({ message: 'All fields required' });
    }

    // One review per user per product
    if (userId) {
      const existing = await Review.findOne({ perfumeId, userId });
      if (existing) {
        return res.status(409).json({ message: 'You have already reviewed this product' });
      }
    }

    const review = new Review({ perfumeId, userId, userName, rating, comment });
    await review.save();
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/reviews/:id — admin delete a review
router.delete('/:id', async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;