const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Perfume = require('../models/Perfume');
const { Resend } = require('resend'); // Import Resend

// Initialize Resend with your API Key
const resend = new Resend(process.env.RESEND_API_KEY);

// 1. GET customer history (Web orders only, Case-Insensitive)
router.get('/customer/:email', async (req, res) => {
  try {
    const orders = await Order.find({ 
      customerEmail: { $regex: new RegExp("^" + req.params.email + "$", "i") },
      isManual: false 
    }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Error fetching customer history", error: err.message });
  }
});

// 2. GET all orders (Admin List)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. POST standard website order (UPDATED WITH EMAIL NOTIFICATION)
router.post('/', async (req, res) => {
  const order = new Order(req.body); 
  try {
    const newOrder = await order.save();

    // --- NEW: SEND ORDER CONFIRMATION EMAIL ---
    if (newOrder.customerEmail) {
      try {
        await resend.emails.send({
          from: 'OneElixir <onboarding@resend.dev>', // Update to your domain once verified
          to: newOrder.customerEmail,
          subject: `Order Confirmed - #${newOrder._id.toString().slice(-6).toUpperCase()}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
              <h2 style="text-align: center; letter-spacing: 2px;">ONEELIXIR</h2>
              <p>Hi ${newOrder.customerName},</p>
              <p>Your order has been placed successfully! We are getting your fragrances ready for shipment.</p>
              <hr />
              <h4>Order Summary:</h4>
              <p><strong>Order ID:</strong> #${newOrder._id}</p>
              <ul>
                ${newOrder.items.map(item => `
                  <li>${item.quantity}x ${item.name} - ${item.price} TK</li>
                `).join('')}
              </ul>
              <p><strong>Total Amount:</strong> ${newOrder.totalAmount} TK</p>
              <p><strong>Shipping Address:</strong> ${newOrder.address}</p>
              <hr />
              <p style="font-size: 12px; color: #888;">If you have any questions, contact us at +880 1690-272870.</p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error("Email failed to send, but order was saved:", emailErr);
      }
    }

    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 4. POST manual admin order
router.post('/manual', async (req, res) => {
  const order = new Order({ ...req.body, isManual: true });
  try {
    const newOrder = await order.save();
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 5. PUT user cancellation (Only if Pending)
router.put('/:id/cancel', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status.toLowerCase() !== 'pending') {
      return res.status(400).json({ message: "Cannot cancel order once processed." });
    }

    order.status = 'Cancelled';
    await order.save();
    res.json({ message: "Order cancelled by user", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. PUT update status & payment status (Admin Action)
router.put('/:id', async (req, res) => {
  const { status, paymentStatus } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // --- STOCK LOGIC (Existing) ---
    const oldStatus = order.status.toLowerCase();
    const newStatus = status?.toLowerCase();

    if (newStatus === 'delivered' && oldStatus !== 'delivered') {
      const updatePromises = order.items.map(item => 
        Perfume.findByIdAndUpdate(
          item.perfumeId, 
          { $inc: { stock: -item.quantity } }
        )
      );
      await Promise.all(updatePromises);
    }
    else if (oldStatus === 'delivered' && newStatus !== 'delivered') {
      const updatePromises = order.items.map(item => 
        Perfume.findByIdAndUpdate(
          item.perfumeId, 
          { $inc: { stock: item.quantity } }
        )
      );
      await Promise.all(updatePromises);
    }

    // --- UPDATE FIELDS ---
    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    const updatedOrder = await order.save();
    res.json(updatedOrder);

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 7. GET single order by ID (for Order Tracking page) --- NEW
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 8. DELETE (Admin Archive)
router.delete('/:id', async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id, 
      { status: 'Cancelled' },
      { new: true }
    );
    res.json({ message: "Order archived as Cancelled", updatedOrder });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;