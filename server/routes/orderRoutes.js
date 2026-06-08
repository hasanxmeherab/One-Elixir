const express    = require('express');
const router     = express.Router();
const mongoose   = require('mongoose');
const Order      = require('../models/Order');
const Perfume    = require('../models/Perfume');
const Log        = require('../models/Log');
const { Resend } = require('resend');

const { verifyAdmin, verifyUser } = require('../middleware/authMiddleware');
const { validate, createOrderSchema, updateOrderSchema } = require('../middleware/validate');

const resend = new Resend(process.env.RESEND_API_KEY);

const writeLog = require('../utils/writeLog');

// ✅ Async error wrapper for route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ✅ Atomic stock decrement with transaction support
const decrementStockAtomic = async (items, session = null) => {
  for (const item of items) {
    if (!item.perfumeId) continue;
    
    // Decrement base product stock
    const result = await Perfume.findByIdAndUpdate(
      item.perfumeId,
      { $inc: { stock: -item.quantity } },
      { new: true, session }
    );
    if (!result || result.stock < 0) {
      throw new Error(`Insufficient stock for "${item.name}". Transaction rolled back.`);
    }
  }
};

// ✅ Restore stock with transaction support
const restoreStockAtomic = async (items, session = null) => {
  for (const item of items) {
    if (!item.perfumeId) continue;
    
    // Restore base product stock
    await Perfume.findByIdAndUpdate(
      item.perfumeId,
      { $inc: { stock: item.quantity } },
      { session }
    );
  }
};

// 1. GET customer history (auth required)
router.get('/customer/:email', verifyUser, asyncHandler(async (req, res) => {
  const orders = await Order.find({
    customerEmail: { $regex: new RegExp(`^${req.params.email}$`, 'i') },
    isManual: false
  }).sort({ createdAt: -1 });
  res.json(orders);
}));

// 2. GET all orders (Admin)
router.get('/', verifyAdmin, asyncHandler(async (req, res) => {
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
}));

// 3. POST standard website order (✅ ATOMIC STOCK DECREMENT)
router.post('/', validate(createOrderSchema), asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const order = new Order(req.body);

    // Validate and reserve stock (base products only)
    for (const item of order.items) {
      if (!item.perfumeId) continue;
      const perfume = await Perfume.findById(item.perfumeId).session(session);
      if (!perfume) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Product "${item.name}" not found` });
      }
      
      // Check base product stock
      if (perfume.stock < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({ 
          message: `"${item.name}" only has ${perfume.stock} units available (you requested ${item.quantity})` 
        });
      }
    }

    // ✅ Create order and decrement stock atomically
    const newOrder = await order.save({ session });
    await decrementStockAtomic(newOrder.items, session);

    // Commit transaction
    await session.commitTransaction();

    // Send confirmation email (outside transaction)
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
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
}));

// 4. POST manual admin order (✅ ATOMIC STOCK DECREMENT)
router.post('/manual', verifyAdmin, validate(createOrderSchema), asyncHandler(async (req, res) => {
  console.log('📝 Manual order route hit');
  console.log('Request body after validation:', JSON.stringify(req.body, null, 2));
  console.log('Admin info:', req.admin);
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const order = new Order({ ...req.body, isManual: true, createdBy: req.admin.name });
    console.log('📦 Order object created:', { _id: order._id, items: order.items.length });
    
    const newOrder = await order.save({ session });
    console.log('✅ Order saved to DB:', { _id: newOrder._id, totalAmount: newOrder.totalAmount });

    // ✅ Decrement stock atomically within transaction
    console.log('🔄 Starting stock decrement...');
    await decrementStockAtomic(newOrder.items, session);
    console.log('✅ Stock decremented');

    // Commit transaction
    console.log('🔄 Committing transaction...');
    await session.commitTransaction();
    console.log('✅ Transaction committed');

    console.log('🔄 Writing activity log...');
    await writeLog(req, 'CREATE_ORDER', 'Order',
      `Manual order created for ${newOrder.customerName} — ${newOrder.totalAmount} TK`);
    console.log('✅ Log written');
    
    res.status(201).json(newOrder);
  } catch (err) {
    console.error('❌ Manual order error:', err.message);
    console.error('Error stack:', err.stack);
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
}));

// #11 Bulk order status update (Admin)
router.put('/bulk-update', verifyAdmin, asyncHandler(async (req, res) => {
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
}));

// 5. PUT user cancellation (auth required) (✅ ATOMIC STOCK RESTORATION)
router.put('/:id/cancel', verifyUser, asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.status.toLowerCase() !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Cannot cancel order once processed.' });
    }
    
    order.status = 'Cancelled';
    
    // ✅ Save cancellation and restore stock atomically
    const savedOrder = await order.save({ session });
    await restoreStockAtomic(order.items, session);
    
    await session.commitTransaction();
    
    res.json({ message: 'Order cancelled and stock restored', order: savedOrder });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
}));

// 6. PUT update status & payment status (Admin) (✅ ATOMIC STOCK MANAGEMENT)
router.put('/:id', verifyAdmin, asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  const { status, paymentStatus } = req.body;
  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Order not found' });
    }

    const oldStatus = order.status?.toLowerCase();
    const newStatus = status?.toLowerCase();

    // ✅ Restore stock only if order is being CANCELLED (refund stock)
    if ((newStatus === 'canceled' || newStatus === 'cancelled') &&
        oldStatus !== 'canceled' && oldStatus !== 'cancelled') {
      await restoreStockAtomic(order.items, session);
    }
    // ✅ If restoring a cancelled order back to active — deduct stock again atomically
    else if ((oldStatus === 'canceled' || oldStatus === 'cancelled') &&
             newStatus && newStatus !== 'canceled' && newStatus !== 'cancelled') {
      await decrementStockAtomic(order.items, session);
    }

    // Update order fields
    if (status)        order.status        = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (req.body.paymentDetails) {
      order.paymentDetails = req.body.paymentDetails;
      order.markModified('paymentDetails');
    }

    const updatedOrder = await order.save({ session });
    await session.commitTransaction();

    // Log what changed (outside transaction)
    if (status && status !== order.status) {
      await writeLog(req, 'UPDATE_ORDER', 'Order',
        `Order #${order._id.toString().slice(-6).toUpperCase()} status: ${order.status} → ${status}`);
    }
    if (paymentStatus && paymentStatus !== order.paymentStatus) {
      await writeLog(req, 'UPDATE_ORDER', 'Order',
        `Order #${order._id.toString().slice(-6).toUpperCase()} payment: ${order.paymentStatus || 'N/A'} → ${paymentStatus}`);
    }

    // #6 Order status email notification (outside transaction)
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
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
}));

// 7. DELETE (Admin Archive)
router.delete('/:id', verifyAdmin, asyncHandler(async (req, res) => {
  const updatedOrder = await Order.findByIdAndUpdate(
    req.params.id,
    { status: 'Cancelled' },
    { new: true }
  );
  await writeLog(req, 'DELETE_ORDER', 'Order',
    `Archived order #${req.params.id.toString().slice(-6).toUpperCase()}`);
  res.json({ message: 'Order archived as Cancelled', updatedOrder });
}));

// 8. GET single order by ID (for tracking — limited data for public access)
router.get('/:id', asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  // Only return safe fields for public tracking
  res.json({
    _id: order._id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    items: order.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
    totalAmount: order.totalAmount,
    shippingCost: order.shippingCost,
    createdAt: order.createdAt,
    // Mask customer info
    customerName: order.customerName ? order.customerName.split(' ')[0] + ' ***' : '',
  });
}));

module.exports = router;