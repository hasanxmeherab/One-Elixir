const express    = require('express');
const router     = express.Router();
const Order      = require('../models/Order');
const Perfume    = require('../models/Perfume');
const Log        = require('../models/Log');
const { Resend } = require('resend');

const { verifyAdmin, verifyUser } = require('../middleware/authMiddleware');
const { validate, createOrderSchema, updateOrderSchema } = require('../middleware/validate');

const resend = new Resend(process.env.RESEND_API_KEY);

const writeLog = async (req, action, target, detail) => {
  try {
    await Log.create({
      adminId:   req.admin?.id   || null,
      adminName: req.admin?.name || 'System',
      action, target, detail,
      ip: req.ip || ''
    });
  } catch (e) { console.error('Log write failed:', e.message); }
};

// 1. GET customer history (auth required — user can only view own orders)
router.get('/customer/:email', verifyUser, async (req, res) => {
  try {
    const orders = await Order.find({
      customerEmail: { $regex: new RegExp('^' + req.params.email + '$', 'i') },
      isManual: false
    }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching customer history' });
  }
});

// 2. GET all orders (Admin)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    if (req.query.page) {
      const page = parseInt(req.query.page);
      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const skip = (page - 1) * limit;
      const total = await Order.countDocuments();
      const orders = await Order.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
      return res.json({ orders, total, page, pages: Math.ceil(total / limit) });
    }
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. POST standard website order
router.post('/', validate(createOrderSchema), async (req, res) => {
  const order = new Order(req.body);
  try {
    const newOrder = await order.save();

    // Deduct stock immediately on order placement
    await Promise.all(newOrder.items.map(item =>
      Perfume.findByIdAndUpdate(item.perfumeId, { $inc: { stock: -item.quantity } })
    ));

    if (newOrder.customerEmail) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'OneElixir <onboarding@resend.dev>',
          to: newOrder.customerEmail,
          subject: `Order Confirmed - #${newOrder._id.toString().slice(-6).toUpperCase()}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;padding:20px;">
              <h2 style="text-align:center;letter-spacing:2px;">ONEELIXIR</h2>
              <p>Hi ${newOrder.customerName},</p>
              <p>Your order has been placed successfully!</p>
              <hr/>
              <p><strong>Order ID:</strong> #${newOrder._id}</p>
              <ul>${newOrder.items.map(i => `<li>${i.quantity}x ${i.name} - ${i.price} TK</li>`).join('')}</ul>
              <p><strong>Total:</strong> ${newOrder.totalAmount} TK</p>
              <p><strong>Address:</strong> ${newOrder.address}</p>
            </div>`
        });
      } catch (emailErr) {
        console.error('Email failed:', emailErr);
      }
    }

    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 4. POST manual admin order
router.post('/manual', verifyAdmin, validate(createOrderSchema), async (req, res) => {
  const order = new Order({ ...req.body, isManual: true, createdBy: req.admin.name });
  try {
    const newOrder = await order.save();

    // Deduct stock immediately on order placement
    await Promise.all(newOrder.items.map(item =>
      Perfume.findByIdAndUpdate(item.perfumeId, { $inc: { stock: -item.quantity } })
    ));

    await writeLog(req, 'CREATE_ORDER', 'Order',
      `Manual order created for ${newOrder.customerName} — ${newOrder.totalAmount} TK`);
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// #11 Bulk order status update (Admin)
router.put('/bulk-update', verifyAdmin, async (req, res) => {
  try {
    const { orderIds, status, paymentStatus } = req.body;
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'orderIds array required' });
    }
    const update = {};
    if (status) update.status = status;
    if (paymentStatus) update.paymentStatus = paymentStatus;
    const result = await Order.updateMany({ _id: { $in: orderIds } }, { $set: update });
    await writeLog(req, 'BULK_UPDATE_ORDER', 'Order',
      `Bulk updated ${result.modifiedCount} orders — ${JSON.stringify(update)}`);
    res.json({ success: true, message: `${result.modifiedCount} orders updated` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Bulk update failed' });
  }
});

// 5. PUT user cancellation (auth required)
router.put('/:id/cancel', verifyUser, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status.toLowerCase() !== 'pending') {
      return res.status(400).json({ message: 'Cannot cancel order once processed.' });
    }
    order.status = 'Cancelled';
    await order.save();
    res.json({ message: 'Order cancelled by user', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. PUT update status & payment status (Admin)
router.put('/:id', verifyAdmin, async (req, res) => {
  const { status, paymentStatus } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const oldStatus = order.status?.toLowerCase();
    const newStatus = status?.toLowerCase();

    // Restore stock only if order is being CANCELLED (refund stock)
    if ((newStatus === 'canceled' || newStatus === 'cancelled') &&
        oldStatus !== 'canceled' && oldStatus !== 'cancelled') {
      await Promise.all(order.items.map(item =>
        Perfume.findByIdAndUpdate(item.perfumeId, { $inc: { stock: item.quantity } })
      ));
    }
    // If restoring a cancelled order back to active — deduct stock again
    else if ((oldStatus === 'canceled' || oldStatus === 'cancelled') &&
             newStatus && newStatus !== 'canceled' && newStatus !== 'cancelled') {
      await Promise.all(order.items.map(item =>
        Perfume.findByIdAndUpdate(item.perfumeId, { $inc: { stock: -item.quantity } })
      ));
    }

    // Log what changed
    if (status && status !== order.status) {
      await writeLog(req, 'UPDATE_ORDER', 'Order',
        `Order #${order._id.toString().slice(-6).toUpperCase()} status: ${order.status} → ${status}`);
    }
    if (paymentStatus && paymentStatus !== order.paymentStatus) {
      await writeLog(req, 'UPDATE_ORDER', 'Order',
        `Order #${order._id.toString().slice(-6).toUpperCase()} payment: ${order.paymentStatus || 'N/A'} → ${paymentStatus}`);
    }

    if (status)        order.status        = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (req.body.paymentDetails) {
      order.paymentDetails = req.body.paymentDetails;
      order.markModified('paymentDetails');
    }

    const updatedOrder = await order.save();

    // #6 Order status email notification
    if (status && updatedOrder.customerEmail) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'OneElixir <onboarding@resend.dev>',
          to: updatedOrder.customerEmail,
          subject: `Order Update - #${updatedOrder._id.toString().slice(-6).toUpperCase()}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #eee;padding:20px;">
              <h2 style="text-align:center;letter-spacing:2px;">ONEELIXIR</h2>
              <p>Hi ${updatedOrder.customerName},</p>
              <p>Your order <strong>#${updatedOrder._id.toString().slice(-6).toUpperCase()}</strong> status has been updated to:</p>
              <h3 style="text-align:center;padding:10px;background:#f5f5f5;">${status}</h3>
              <p style="font-size:10px;color:#999;margin-top:20px;text-align:center;">&copy; 2026 ONEELIXIR FRAGRANCES.</p>
            </div>`
        });
      } catch (emailErr) { console.error('Status email failed:', emailErr); }
    }

    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 7. DELETE (Admin Archive)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'Cancelled' },
      { new: true }
    );
    await writeLog(req, 'DELETE_ORDER', 'Order',
      `Archived order #${req.params.id.toString().slice(-6).toUpperCase()}`);
    res.json({ message: 'Order archived as Cancelled', updatedOrder });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 8. GET single order by ID (for tracking)
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;