const express = require('express');
const router = express.Router();
const CartAbandonment = require('../models/CartAbandonment');
const Coupon = require('../models/Coupon');
const { verifyUser, verifyAdmin } = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ FEATURE #5: POST track abandoned cart (client sends this when user leaves)
router.post('/track', verifyUser, async (req, res) => {
  try {
    const { userEmail, userName, cartItems, cartTotal } = req.body;

    if (!userEmail || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: 'Email and cart items required' });
    }

    // ✅ Generate unique recovery token
    const recoveryToken = uuidv4();

    // Check if user already has an active abandoned cart
    const existing = await CartAbandonment.findOne({
      userEmail,
      status: 'active'
    });

    if (existing) {
      // Update existing record
      existing.cartItems = cartItems;
      existing.cartTotal = cartTotal;
      existing.lastActivityAt = new Date();
      existing.reminderCount = 0;  // Reset reminder count
      await existing.save();
      return res.json({ message: 'Cart abandonment tracked', abandonmentId: existing._id });
    }

    // Create new abandonment record
    const abandonment = new CartAbandonment({
      userEmail,
      userName,
      cartItems,
      cartTotal,
      recoveryToken,
      status: 'active',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await abandonment.save();

    res.status(201).json({
      message: 'Cart abandonment tracked',
      abandonmentId: abandonment._id
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ FEATURE #5: GET abandoned cart for user
router.get('/user/:email', verifyUser, async (req, res) => {
  try {
    const abandonment = await CartAbandonment.findOne({
      userEmail: req.params.email,
      status: 'active'
    }).sort({ lastActivityAt: -1 });

    res.json(abandonment || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ FEATURE #5: PUT mark cart as recovered (when user completes purchase)
router.put('/:id/recover', async (req, res) => {
  try {
    const { orderId } = req.body;
    const abandonment = await CartAbandonment.findById(req.params.id);

    if (!abandonment) {
      return res.status(404).json({ message: 'Abandonment record not found' });
    }

    abandonment.status = 'recovered';
    abandonment.recoveredAt = new Date();
    abandonment.recoveredOrderId = orderId;
    await abandonment.save();

    res.json({ message: 'Cart marked as recovered', abandonment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ FEATURE #5: POST send recovery email (triggered by cron job or admin)
router.post('/:id/send-recovery-email', async (req, res) => {
  try {
    const abandonment = await CartAbandonment.findById(req.params.id);

    if (!abandonment) {
      return res.status(404).json({ message: 'Abandonment record not found' });
    }

    if (abandonment.status === 'recovered' || abandonment.status === 'expired') {
      return res.status(400).json({ message: 'Cart already recovered or expired' });
    }

    // Check if max reminders reached
    if (abandonment.reminderCount >= abandonment.maxReminders) {
      abandonment.status = 'expired';
      await abandonment.save();
      return res.status(400).json({ message: 'Max reminder emails reached' });
    }

    // ✅ Create or get recovery coupon
    let couponCode = abandonment.couponCode;
    if (!couponCode) {
      couponCode = `COMEBACK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      abandonment.couponCode = couponCode;
      abandonment.couponDiscount = 10;

      // Create coupon if it doesn't exist
      const existingCoupon = await Coupon.findOne({ code: couponCode });
      if (!existingCoupon) {
        await Coupon.create({
          code: couponCode,
          discountType: 'percentage',
          discountValue: 10,
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          isActive: true,
          usageLimit: 1,  // One-time use
          usedCount: 0
        });
      }
    }

    // ✅ Calculate potential savings
    const discount = (abandonment.cartTotal * abandonment.couponDiscount) / 100;
    const finalTotal = abandonment.cartTotal - discount;

    // ✅ Build cart summary HTML
    const cartSummary = abandonment.cartItems
      .map(
        item => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 8px; text-align: left;">${item.quantity}x ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ''}</td>
        <td style="padding: 8px; text-align: right;">৳ ${(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `
      )
      .join('');

    // ✅ Send recovery email via Resend
    const recoveryLink = `${process.env.CLIENT_URL || 'https://oneelixir.live'}/recover?recovery=${abandonment.recoveryToken}`;

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'OneElixir <onboarding@resend.dev>',
      to: abandonment.userEmail,
      subject: `🌹 Your cart is waiting! Get 10% off inside 🌹`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 28px; letter-spacing: 2px;">ONEELIXIR</h2>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Premium Handcrafted Fragrances</p>
          </div>

          <!-- Body -->
          <div style="padding: 30px 20px;">
            <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
              Hi ${abandonment.userName || 'Valued Customer'},
            </p>

            <p style="font-size: 14px; color: #666; line-height: 1.6; margin: 0 0 20px 0;">
              We noticed you left something special in your cart. Don't miss out on these exquisite fragrances!
            </p>

            <!-- Cart Summary -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Cart</h3>
              <table style="width: 100%;">
                ${cartSummary}
                <tr style="font-weight: 600; border-top: 2px solid #ddd;">
                  <td style="padding: 10px; text-align: left;">Subtotal</td>
                  <td style="padding: 10px; text-align: right;">৳ ${abandonment.cartTotal.toLocaleString()}</td>
                </tr>
              </table>
            </div>

            <!-- Discount Offer -->
            <div style="background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0; color: #333;">
              <p style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Exclusive Offer</p>
              <p style="margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">Save 10% Today</p>
              <p style="margin: 0; font-size: 14px;">Use code: <strong style="font-family: 'Courier New', monospace; font-size: 16px;">${couponCode}</strong></p>
              <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">With your discount, your cart will be just <strong>৳ ${Math.round(finalTotal).toLocaleString()}</strong></p>
            </div>

            <!-- CTA Button -->
            <div style="margin: 30px 0; text-align: center;">
              <a href="${recoveryLink}" style="display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">Complete Your Order</a>
            </div>

            <p style="font-size: 12px; color: #999; text-align: center; margin: 20px 0 0 0;">
              Offer expires in 7 days. This is reminder ${abandonment.reminderCount + 1} of ${abandonment.maxReminders}.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0; font-size: 11px; color: #999; letter-spacing: 0.5px;">
              © 2026 ONEELIXIR FRAGRANCES. All rights reserved.<br/>
              Don't want these reminders? <a href="${process.env.CLIENT_URL || 'https://oneelixir.live'}/cart" style="color: #667eea; text-decoration: none;">View your cart</a>
            </p>
          </div>
        </div>
      `
    });

    // ✅ Update abandonment record
    abandonment.emailSentAt = new Date();
    abandonment.reminderCount += 1;
    if (abandonment.reminderCount >= abandonment.maxReminders) {
      abandonment.status = 'recovery_email_sent';
    }
    await abandonment.save();

    res.json({
      message: 'Recovery email sent successfully',
      reminderCount: abandonment.reminderCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ FEATURE #5: GET admin dashboard stats
router.get('/stats/dashboard', verifyAdmin, async (req, res) => {
  try {
    const totalAbandoned = await CartAbandonment.countDocuments();
    const activeAbandoned = await CartAbandonment.countDocuments({ status: 'active' });
    const recovered = await CartAbandonment.countDocuments({ status: 'recovered' });
    const emailsSent = await CartAbandonment.countDocuments({ status: 'recovery_email_sent' });

    const totalValue = await CartAbandonment.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$cartTotal' } } }
    ]);

    const recoveryValue = await CartAbandonment.aggregate([
      { $match: { status: 'recovered' } },
      { $group: { _id: null, total: { $sum: '$cartTotal' } } }
    ]);

    res.json({
      totalAbandoned,
      activeAbandoned,
      recovered,
      emailsSent,
      potentialRevenue: totalValue[0]?.total || 0,
      recoveredRevenue: recoveryValue[0]?.total || 0,
      recoveryRate: totalAbandoned > 0 ? Math.round((recovered / totalAbandoned) * 100) : 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ FEATURE #5: GET list of abandoned carts (admin)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'active' } = req.query;
    const skip = (page - 1) * limit;

    const query = status ? { status } : {};

    const abandonments = await CartAbandonment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CartAbandonment.countDocuments(query);

    res.json({
      abandonments,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        perPage: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ FEATURE #5: GET abandoned cart by recovery token
router.get('/recover/:recoveryToken', async (req, res) => {
  try {
    const { recoveryToken } = req.params;

    const abandonment = await CartAbandonment.findOne({
      recoveryToken,
      status: { $in: ['active', 'recovery_email_sent'] }
    });

    if (!abandonment) {
      return res.status(404).json({ message: 'Cart recovery link is invalid or expired' });
    }

    res.json({
      abandonment,
      couponCode: abandonment.couponCode,
      discount: abandonment.couponDiscount,
      cartItems: abandonment.cartItems
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
