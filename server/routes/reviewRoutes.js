const express = require('express');
const router  = express.Router();
const rateLimit = require('express-rate-limit');
const Review  = require('../models/Review');
const User = require('../models/User');
const Perfume = require('../models/Perfume');
const mongoose = require('mongoose');
const { verifyAdmin, verifyUser } = require('../middleware/authMiddleware');
const { validate, createReviewSchema } = require('../middleware/validate');

const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many reviews submitted, please try again later.' }
});

// GET all reviews for a product
router.get('/:perfumeId', async (req, res) => {
  try {
    const reviews = await Review.find({ perfumeId: req.params.perfumeId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// POST new review (with optional image URLs)
router.post('/', verifyUser, reviewLimiter, validate(createReviewSchema), async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { perfumeId, rating, comment, images } = req.body;
    let review;
    await session.withTransaction(async () => {
      // The account write makes simultaneous submissions conflict and retry,
      // so both cannot pass the duplicate check. No legacy index migration.
      const account = await User.updateOne({ _id: req.userId }, { $inc: { reviewWriteVersion: 1 } }, { session });
      if (!account.matchedCount) throw Object.assign(new Error('Customer account not found.'), { status: 401 });
      const product = await Perfume.findOne({ _id: perfumeId, isDeleted: { $ne: true } }).session(session);
      if (!product) throw Object.assign(new Error('Product not found.'), { status: 404 });
      const existing = await Review.findOne({ perfumeId, userId: req.userId }).session(session);
      if (existing) throw Object.assign(new Error('You have already reviewed this product.'), { status: 409 });
      review = new Review({ perfumeId, userId: req.userId, userName: req.user.name, rating, comment, images: images || [] });
      await review.save({ session });
    });
    res.status(201).json(review);
  } catch (err) { res.status(err.status || 500).json({ message: err.status ? err.message : 'Could not save review. Please try again.' }); }
  finally { session.endSession(); }
});

// DELETE review (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
