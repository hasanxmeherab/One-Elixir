const express    = require('express');
const router     = express.Router();
const Order      = require('../models/Order');
const Perfume    = require('../models/Perfume');
const Log        = require('../models/Log');
const { Resend } = require('resend');

const { verifyAdmin } = require('../middleware/authMiddleware');

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

// 1. GET customer history
router.get('/customer/:email', async (req, res) => {
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
      const limit = parseInt(req.query.limit) || 50;
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
router.post('/', async (req, res) => {
  const order = new Order(req.body);
  try {
    const newOrder = await order.save();

    if (newOrder.customerEmail) {
      try {
        await resend.emails.send({
          from: 'OneElixir <onboarding@resend.dev>',
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
router.post('/manual', verifyAdmin, async (req, res) => {
  const order = new Order({ ...req.body, isManual: true });
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

// 5. PUT user cancellation
router.put('/:id/cancel', async (req, res) => {
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