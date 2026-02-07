const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// 1. GET orders for a specific customer (Filtered for Web Orders Only)
router.get('/customer/:email', async (req, res) => {
  try {
    const orders = await Order.find({ 
      customerEmail: req.params.email,
      isManual: false // This ensures manual admin entries don't show up here
    }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Error fetching customer history", error: err.message });
  }
});

// 2. GET all orders for the Admin list (Includes everything)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. POST a new manual order (Marked as isManual: true)
router.post('/manual', async (req, res) => {
  const order = new Order({
    ...req.body,
    isManual: true // Explicitly flagged as manual for business tracking
  });
  try {
    const newOrder = await order.save();
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 4. POST a standard website order (Default isManual: false)
router.post('/', async (req, res) => {
  const order = new Order(req.body); // isManual defaults to false in Schema
  try {
    const newOrder = await order.save();
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 5. PUT update order status (Shipped/Delivered)
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

// 6. DELETE an order (Archive)
router.delete('/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Order removed from records" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;