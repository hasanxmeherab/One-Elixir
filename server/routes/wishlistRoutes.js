// ============================================================
// wishlistRoutes.js — Add to your Express backend
// Place in: /routes/wishlistRoutes.js
// Register in server.js: app.use('/api/wishlist', require('./routes/wishlistRoutes'));
// 
// Dependencies: npm install resend
// Set env var: RESEND_API_KEY=your_key
// ============================================================

const express = require('express');
const router = express.Router();
const User = require('../models/User');       // your existing User model
const Perfume = require('../models/Perfume'); // your existing Perfume model
const { Resend } = require('resend');
const { verifyUser } = require('../middleware/authMiddleware');

const resend = new Resend(process.env.RESEND_API_KEY);

// GET /api/wishlist/:userId — get user's wishlist
router.get('/:userId', verifyUser, async (req, res) => {
  try {
    if (req.userId !== req.params.userId) return res.status(403).json({ message: 'Access denied' });
    const user = await User.findById(req.params.userId).populate('wishlist');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.wishlist || []);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/wishlist/:userId/add — add item to wishlist
router.post('/:userId/add', verifyUser, async (req, res) => {
  try {
    if (req.userId !== req.params.userId) return res.status(403).json({ message: 'Access denied' });
    const { perfumeId } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.wishlist.includes(perfumeId)) {
      user.wishlist.push(perfumeId);
      await user.save();
    }
    res.json({ message: 'Added to wishlist' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/wishlist/:userId/remove/:perfumeId — remove from wishlist
router.delete('/:userId/remove/:perfumeId', verifyUser, async (req, res) => {
  try {
    if (req.userId !== req.params.userId) return res.status(403).json({ message: 'Access denied' });
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.perfumeId);
    await user.save();
    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// POST /api/wishlist/notify-restock
// Call this from your inventory update route whenever stock
// goes from 0 → positive, or when you create a sale/coupon.
//
// Example: After updating perfume stock in InventoryManager,
// add this call in your PUT /api/perfumes/:id route:
//   const axios = require('axios');
//   if (oldStock === 0 && newStock > 0) {
//     await axios.post(`${BASE_URL}/api/wishlist/notify-restock`, { perfumeId: id, type: 'restock' });
//   }
// ============================================================
router.post('/notify-restock', async (req, res) => {
  try {
    const { perfumeId, type = 'restock' } = req.body; // type: 'restock' | 'sale'

    const perfume = await Perfume.findById(perfumeId);
    if (!perfume) return res.status(404).json({ message: 'Perfume not found' });

    // Find all users who have this item wishlisted
    const users = await User.find({ wishlist: perfumeId });
    if (users.length === 0) return res.json({ message: 'No wishlist users to notify' });

    const isRestock = type === 'restock';
    const subject = isRestock
      ? `${perfume.name} is back in stock — OneElixir`
      : `${perfume.name} is now on sale — OneElixir`;

    const emailPromises = users.map(user =>
      resend.emails.send({
        from: process.env.EMAIL_FROM || 'OneElixir <onboarding@resend.dev>',
        to: user.email,
        subject,
        html: `
          <div style="font-family: Georgia, serif; max-width: 560px; margin: auto; padding: 40px 20px; color: #222;">
            <h1 style="letter-spacing: 8px; font-size: 18px; font-weight: bold; margin-bottom: 4px;">ONEELIXIR</h1>
            <div style="width: 40px; height: 1px; background: #000; margin-bottom: 32px;"></div>

            <p style="font-size: 13px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">
              ${isRestock ? 'Back in Stock' : 'On Sale Now'}
            </p>
            <h2 style="font-size: 22px; letter-spacing: 4px; font-weight: bold; margin-bottom: 16px;">
              ${perfume.name.toUpperCase()}
            </h2>
            <img src="${perfume.image}" alt="${perfume.name}" style="width: 100%; max-height: 280px; object-fit: cover; margin-bottom: 24px;" />

            <p style="font-size: 13px; line-height: 1.8; color: #444; margin-bottom: 24px;">
              ${isRestock
                ? `Good news! <strong>${perfume.name}</strong> is back in stock. You saved this to your wishlist — don't miss out, quantities are limited.`
                : `Your wishlisted fragrance <strong>${perfume.name}</strong> is now available at a special price. Treat yourself today.`
              }
            </p>

            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/product/${perfume._id}"
               style="display: inline-block; background: #000; color: #fff; padding: 14px 36px; text-decoration: none; font-size: 11px; font-weight: bold; letter-spacing: 3px;">
              ${isRestock ? 'SHOP NOW' : 'VIEW OFFER'}
            </a>

            <p style="margin-top: 40px; font-size: 10px; color: #bbb; letter-spacing: 1px;">
              You received this because you wishlisted this item on OneElixir.<br/>
              © OneElixir. All rights reserved.
            </p>
          </div>
        `
      })
    );

    await Promise.all(emailPromises);
    res.json({ message: `Notified ${users.length} user(s)` });
  } catch (err) {
    console.error('Notify error:', err);
    res.status(500).json({ message: 'Failed to send notifications' });
  }
});

module.exports = router;