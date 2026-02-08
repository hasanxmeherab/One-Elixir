const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

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

// 3. POST standard website order
router.post('/', async (req, res) => {
  const order = new Order(req.body); 
  try {
    const newOrder = await order.save();
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

// 6. PUT update status (Admin Action)
router.put('/:id', async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id, 
      { status: req.body.status }, 
      { new: true }
    );
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 7. DELETE (Admin Archive)
// This no longer deletes; it marks as Cancelled so it stays in history
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