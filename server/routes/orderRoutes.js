const express    = require('express');
const router     = express.Router();
const mongoose   = require('mongoose');
const Order          = require('../models/Order');
const Perfume        = require('../models/Perfume');
const Log            = require('../models/Log');
const PaymentLedger  = require('../models/PaymentLedger');
const Admin          = require('../models/Admin');
const SystemConfig   = require('../models/SystemConfig');
const Settlement     = require('../models/Settlement');
const User           = require('../models/User');
const { Resend } = require('resend');

const { verifyAdmin, verifyUser } = require('../middleware/authMiddleware');
const { validate, createOrderSchema, quoteOrderSchema, createWebOrderSchema } = require('../middleware/validate');
const { priceOrder, PricingError } = require('../utils/pricing');

const resend = new Resend(process.env.RESEND_API_KEY);

const writeLog = require('../utils/writeLog');
const { deductFifoBatches, restoreFifoBatches } = require('../utils/fifoBatchDeduct');
const reverseOrderCollection = require('../utils/reverseOrderCollection');

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escapeHtml  = (str) => String(str ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// 🔒 Resolve the logged-in customer's email from the DB (never trust the URL/body)
const getUserEmail = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;
  const user = await User.findById(userId).select('email');
  return user?.email ? user.email.toLowerCase() : null;
};

// ✅ Async error wrapper for route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ✅ Atomic stock decrement with transaction support — uses bulkWrite (single query)
const decrementStockAtomic = async (items, session = null) => {
  const bulkOps = items
    .filter(item => item.perfumeId)
    .map(item => ({
      updateOne: {
        filter: { _id: item.perfumeId },
        update: { $inc: { stock: -item.quantity } },
      },
    }));
  if (bulkOps.length === 0) return;
  const result = await Perfume.bulkWrite(bulkOps, { session });
  // Verify no stock went negative after the bulk write
  const updatedIds = items.filter(i => i.perfumeId).map(i => i.perfumeId);
  const updated = await Perfume.find({ _id: { $in: updatedIds }, stock: { $lt: 0 } }).session(session);
  if (updated.length > 0) {
    throw new Error(`Insufficient stock for "${updated[0].name}". Transaction rolled back.`);
  }
  return result;
};

// ✅ Restore stock with transaction support — uses bulkWrite (single query)
const restoreStockAtomic = async (items, session = null) => {
  const bulkOps = items
    .filter(item => item.perfumeId)
    .map(item => ({
      updateOne: {
        filter: { _id: item.perfumeId },
        update: { $inc: { stock: item.quantity } },
      },
    }));
  if (bulkOps.length === 0) return;
  return Perfume.bulkWrite(bulkOps, { session });
};

// 1. GET customer history (auth required — own orders only)
router.get('/customer/:email', verifyUser, asyncHandler(async (req, res) => {
  const userEmail = await getUserEmail(req.userId);
  if (!userEmail) return res.status(403).json({ message: 'Access denied' });
  if (String(req.params.email).toLowerCase() !== userEmail) {
    return res.status(403).json({ message: 'You can only view your own orders.' });
  }
  const orders = await Order.find({
    customerEmail: { $regex: new RegExp(`^${escapeRegex(userEmail)}$`, 'i') },
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

// 3a. POST checkout quote — server-calculated prices/discount/shipping for display
router.post('/quote', validate(quoteOrderSchema), asyncHandler(async (req, res) => {
  try {
    const quote = await priceOrder(req.body);
    res.json(quote);
  } catch (err) {
    if (err instanceof PricingError) return res.status(err.status).json({ message: err.message });
    throw err;
  }
}));

// 3. POST standard website order (✅ SERVER-SIDE PRICING + ATOMIC STOCK DECREMENT)
router.post('/', validate(createWebOrderSchema), asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const {
      items, couponCode, district, expectedTotal,
      customerName, customerEmail, phone, address,
      paymentMethod, paymentDetails = {},
    } = req.body;

    // 🔒 Price everything from the DB — client-sent prices are never used
    const quote = await priceOrder({ items, couponCode, district }, session);

    // If the customer saw a different total (stale cart / price change), make them review it
    if (expectedTotal !== undefined && Math.abs(expectedTotal - quote.total) > 0.5) {
      await session.abortTransaction();
      return res.status(409).json({
        message: `Prices have changed. Your new total is ${quote.total} TK — please review and confirm again.`,
        quote,
      });
    }

    const isFreeCod  = quote.shippingCost === 0 && paymentMethod === 'Cash on Delivery';
    const amountDue  = isFreeCod ? 0 : (paymentMethod === 'Cash on Delivery' ? quote.shippingCost : quote.total);

    if (!isFreeCod && (!paymentDetails.senderNumber || !paymentDetails.transactionId)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Payment sender number and transaction ID are required.' });
    }

    const order = new Order({
      customerName,
      customerEmail: customerEmail ? customerEmail.toLowerCase() : undefined,
      phone,
      address,
      items: quote.items,
      totalAmount: quote.total,
      shippingCost: quote.shippingCost,
      discountApplied: quote.discount,
      couponCode: quote.couponCode,
      status: 'Pending',
      paymentMethod,
      paymentStatus: isFreeCod ? 'Free Delivery' : 'Pending Verification',
      paymentDetails: isFreeCod
        ? { amountPaid: 0 }
        : {
            senderNumber: paymentDetails.senderNumber,
            transactionId: paymentDetails.transactionId,
            platform: paymentDetails.platform,
            screenshot: paymentDetails.screenshot,
            amountPaid: amountDue,
          },
      isManual: false,
    });

    // ✅ Batch fetch all required perfumes in ONE query (eliminates N+1)
    const perfumeIds = order.items
      .filter(item => item.perfumeId)
      .map(item => item.perfumeId);

    const perfumes = await Perfume.find({ _id: { $in: perfumeIds } }).session(session);
    const perfumeMap = Object.fromEntries(perfumes.map(p => [p._id.toString(), p]));

    // Validate stock availability for all items
    for (const item of order.items) {
      if (!item.perfumeId) continue;
      const perfume = perfumeMap[item.perfumeId.toString()];
      if (!perfume) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Product "${item.name}" not found` });
      }
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

    // ✅ FIFO cost-batch deduction — oldest batch consumed first
    const batchDeductions = await deductFifoBatches(newOrder.items, session);
    if (batchDeductions.length > 0) {
      newOrder.batchDeductions = batchDeductions;
      await newOrder.save({ session });
    }

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
              <p>Hi ${escapeHtml(newOrder.customerName)},</p>
              <p>Your order has been placed successfully!</p>
              <hr/>
              <p><strong>Order ID:</strong> #${newOrder._id}</p>
              <ul>${newOrder.items.map(i => `<li>${i.quantity}x ${escapeHtml(i.name)} - ${i.price} TK</li>`).join('')}</ul>
              <p><strong>Total:</strong> ${newOrder.totalAmount} TK</p>
              <p><strong>Address:</strong> ${escapeHtml(newOrder.address)}</p>
            </div>`
        });
      } catch (emailErr) {
        console.error('Email failed:', emailErr);
      }
    }

    res.status(201).json(newOrder);
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    const status = err instanceof PricingError ? err.status : 400;
    res.status(status).json({ message: err.message });
  } finally {
    session.endSession();
  }
}));

// 4. POST manual admin order (✅ ATOMIC STOCK DECREMENT + PAYMENT TRACKING)
router.post('/manual', verifyAdmin, validate(createOrderSchema), asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const order = new Order({ ...req.body, isManual: true, createdBy: req.admin.name });
    
    // ── Payment receiver tracking for Paid manual orders ──
    const { paymentReceivedBy } = req.body;
    if (req.body.paymentStatus?.toLowerCase() === 'paid' && paymentReceivedBy?.adminId) {
      order.paymentReceivedBy = {
        adminId: paymentReceivedBy.adminId,
        adminName: paymentReceivedBy.adminName || ''
      };
      order.paymentReceivedAt = new Date();
    }

    const newOrder = await order.save({ session });

    // ✅ Decrement stock atomically within transaction
    await decrementStockAtomic(newOrder.items, session);

    // ✅ FIFO cost-batch deduction — oldest batch consumed first
    const manualBatchDeductions = await deductFifoBatches(newOrder.items, session);
    if (manualBatchDeductions.length > 0) {
      newOrder.batchDeductions = manualBatchDeductions;
      await newOrder.save({ session });
    }

    // ── Create ledger entry for paid manual orders ──
    if (req.body.paymentStatus?.toLowerCase() === 'paid' && paymentReceivedBy?.adminId) {
      const receiverAdmin = await Admin.findById(paymentReceivedBy.adminId).session(session);
      const receiverIsSuperadmin = receiverAdmin?.role === 'superadmin';
      if (!receiverAdmin) throw new Error('Selected payment receiver not found.');
      await PaymentLedger.create([{
        orderId: newOrder._id,
        adminId: receiverAdmin._id,
        adminName: receiverAdmin.name,
        amount: newOrder.totalAmount,
        type: 'collection',
        paymentMethod: newOrder.paymentMethod || 'Cash',
        note: `Manual order payment received by ${receiverAdmin.name} — #${newOrder._id.toString().slice(-6).toUpperCase()}`
      }], { session });
      newOrder.settlementStatus = receiverIsSuperadmin ? 'settled' : 'unsettled';
      await newOrder.save({ session });
    }
    // Commit transaction
    await session.commitTransaction();

    await writeLog(req, 'CREATE_ORDER', 'Order',
      `Manual order created for ${newOrder.customerName} — ${newOrder.totalAmount} TK`);
    
    res.status(201).json(newOrder);
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
}));

// #11 Bulk order status update (Admin)
router.put('/bulk-update', verifyAdmin, asyncHandler(async (req, res) => {
  const { orderIds, status, paymentStatus, paymentReceivedBy } = req.body;
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ success: false, message: 'orderIds array required' });
  }
  // Apply reversals transactionally for bulk edits as well as individual edits.
  if (paymentStatus && paymentStatus.toLowerCase() !== 'paid') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const orders = await Order.find({ _id: { $in: orderIds } }).session(session);
      for (const order of orders) {
        if (order.paymentStatus?.toLowerCase() === 'paid' || paymentStatus.toLowerCase() === 'unpaid') {
          await reverseOrderCollection(order, { PaymentLedger, Admin, Settlement, session });
        }
        order.paymentStatus = paymentStatus;
        if (status) order.status = status;
        await order.save({ session });
      }
      await session.commitTransaction();
      await writeLog(req, 'BULK_UPDATE_ORDER', 'Order', `Updated ${orders.length} orders to ${paymentStatus}; reversed incorrect collections where applicable.`);
      return res.json({ success: true, message: `${orders.length} orders updated` });
    } catch (err) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: err.message });
    } finally { session.endSession(); }
  }
  const update = {};
  if (status) update.status = status;
  if (paymentStatus) update.paymentStatus = paymentStatus;

  // If marking as Paid with a receiver, handle ledger entries per order
  if (paymentStatus?.toLowerCase() === 'paid' && paymentReceivedBy?.adminId) {
    const receiverAdmin = await Admin.findById(paymentReceivedBy.adminId);
    const isSuperadmin = receiverAdmin?.role === 'superadmin';

    update['paymentReceivedBy.adminId'] = paymentReceivedBy.adminId;
    update['paymentReceivedBy.adminName'] = paymentReceivedBy.adminName || receiverAdmin?.name || '';
    update.paymentReceivedAt = new Date();
    update.settlementStatus = isSuperadmin ? 'settled' : 'unsettled';

    // Only create ledger for orders not already paid
    const unpaidOrders = await Order.find({
      _id: { $in: orderIds },
      paymentStatus: { $ne: 'Paid' }
    });

    if (unpaidOrders.length > 0) {
      const ledgerEntries = unpaidOrders.map(order => ({
        orderId: order._id,
        adminId: paymentReceivedBy.adminId,
        adminName: paymentReceivedBy.adminName || receiverAdmin?.name || '',
        amount: order.totalAmount,
        type: 'collection',
        paymentMethod: order.paymentMethod || 'Cash',
        note: `Bulk payment — order #${order._id.toString().slice(-6).toUpperCase()}`
      }));
      await PaymentLedger.insertMany(ledgerEntries);
    }
  }

  const result = await Order.updateMany({ _id: { $in: orderIds } }, { $set: update });
  await writeLog(req, 'BULK_UPDATE_ORDER', 'Order',
    `Bulk updated ${result.modifiedCount} orders — ${JSON.stringify(update)}`);
  res.json({ success: true, message: `${result.modifiedCount} orders updated` });
}));

// 5. PUT user cancellation (auth required — own orders only) (✅ ATOMIC STOCK RESTORATION)
router.put('/:id/cancel', verifyUser, asyncHandler(async (req, res) => {
  const userEmail = await getUserEmail(req.userId);
  if (!userEmail) return res.status(403).json({ message: 'Access denied' });

  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Order not found' });
    }
    // 🔒 Only the customer who placed the order may cancel it
    if ((order.customerEmail || '').toLowerCase() !== userEmail) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'You can only cancel your own orders.' });
    }
    if (order.status.toLowerCase() !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Cannot cancel order once processed.' });
    }
    
    order.status = 'Cancelled';
    
    // ✅ Save cancellation and restore stock atomically
    const savedOrder = await order.save({ session });
    await restoreStockAtomic(order.items, session);

    // ✅ Restore FIFO cost-batch deductions (reverse FIFO on cancel)
    await restoreFifoBatches(order.batchDeductions, session);
    
    await session.commitTransaction();
    
    res.json({ message: 'Order cancelled and stock restored', order: savedOrder });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
}));

// 6. PUT update order (Admin — full edit with stock recalculation) (✅ ATOMIC)
router.put('/:id', verifyAdmin, asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  const { status, paymentStatus, items, customerName, phone, address,
          customerEmail, totalAmount, shippingCost, discountApplied,
          paymentMethod, paymentDetails, adminNotes, createdAt } = req.body;
  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Order not found' });
    }

    const oldStatus = order.status?.toLowerCase();
    const newStatus = status?.toLowerCase();
    const oldPaymentStatus = order.paymentStatus?.toLowerCase(); // capture BEFORE any updates

    // ── Handle item changes (stock recalculation) ──────────────
    if (items && JSON.stringify(items) !== JSON.stringify(order.items)) {
      const wasCancelled = oldStatus === 'canceled' || oldStatus === 'cancelled';
      
      // Restore stock for OLD items (unless order was already cancelled)
      if (!wasCancelled) {
        await restoreStockAtomic(order.items, session);
        await restoreFifoBatches(order.batchDeductions, session);
      }
      
      // Decrement stock for NEW items (unless we're keeping it cancelled)
      const keepingCancelled = (newStatus === 'canceled' || newStatus === 'cancelled') ||
                               (!status && wasCancelled);
      if (!keepingCancelled) {
        await decrementStockAtomic(items, session);
        const itemChangedDeductions = await deductFifoBatches(items, session);
        order.batchDeductions = itemChangedDeductions;
      } else {
        order.batchDeductions = [];
      }
      order.markModified('batchDeductions');

      order.items = items;
      order.markModified('items');
    }

    // ── Handle status change (stock restore/decrement) ─────────
    if (status && !items) {
      // Cancel → restore stock + restore FIFO batches
      if ((newStatus === 'canceled' || newStatus === 'cancelled') &&
          oldStatus !== 'canceled' && oldStatus !== 'cancelled') {
        await restoreStockAtomic(order.items, session);
        await restoreFifoBatches(order.batchDeductions, session);
      }
      // Un-cancel → decrement stock + re-deduct FIFO batches
      else if ((oldStatus === 'canceled' || oldStatus === 'cancelled') &&
               newStatus && newStatus !== 'canceled' && newStatus !== 'cancelled') {
        await decrementStockAtomic(order.items, session);
        const reDeductions = await deductFifoBatches(order.items, session);
        order.batchDeductions = reDeductions;
        order.markModified('batchDeductions');
      }
    }

    // ── Update all provided fields ─────────────────────────────
    if (status)           order.status           = status;
    if (paymentStatus)    order.paymentStatus    = paymentStatus;
    if (customerName)     order.customerName     = customerName;
    if (phone)            order.phone            = phone;
    if (address !== undefined) order.address     = address;
    if (customerEmail !== undefined) order.customerEmail = customerEmail;
    if (totalAmount !== undefined)   order.totalAmount   = totalAmount;
    if (shippingCost !== undefined)  order.shippingCost  = shippingCost;
    if (discountApplied !== undefined) order.discountApplied = discountApplied;
    if (paymentMethod)    order.paymentMethod    = paymentMethod;
    if (createdAt)        order.createdAt        = new Date(createdAt);
    if (paymentDetails) {
      order.paymentDetails = paymentDetails;
      order.markModified('paymentDetails');
    }
    if (adminNotes) {
      order.adminNotes = adminNotes;
      order.markModified('adminNotes');
    }

    // ── Payment receiver tracking ──
    const paymentReceivedBy = req.body.paymentReceivedBy;
    const isPaid = (paymentStatus?.toLowerCase() === 'paid') ||
                   (!paymentStatus && oldPaymentStatus === 'paid');

    if (isPaid && paymentReceivedBy?.adminId) {
      order.paymentReceivedBy = {
        adminId: paymentReceivedBy.adminId,
        adminName: paymentReceivedBy.adminName || ''
      };
      order.paymentReceivedAt = order.paymentReceivedAt || new Date();
      order.markModified('paymentReceivedBy');

      const receiverAdmin = await Admin.findById(paymentReceivedBy.adminId).session(session);
      const receiverIsSuperadmin = receiverAdmin?.role === 'superadmin';

      if (!receiverAdmin) throw new Error('Selected payment receiver not found.');
      // Installments retain their individual receiver and collection entries.
      order.paymentReceivedBy = { adminId: receiverAdmin._id, adminName: receiverAdmin.name };
      // Assigning an order receiver must not move a previous installment.
      if (!order.partialPayments?.length) {
        const existingLedger = await PaymentLedger.findOne({ orderId: order._id, type: 'collection' }).session(session);
        if (existingLedger) {
          existingLedger.adminId = receiverAdmin._id;
          existingLedger.adminName = receiverAdmin.name;
          existingLedger.amount = order.totalAmount;
          await existingLedger.save({ session });
        } else {
          await PaymentLedger.create([{
            orderId: order._id, adminId: receiverAdmin._id, adminName: receiverAdmin.name,
            amount: order.totalAmount, type: 'collection', paymentMethod: order.paymentMethod || 'Cash',
            note: `Payment received by ${receiverAdmin.name} for order #${order._id.toString().slice(-6).toUpperCase()}`
          }], { session });
        }
        order.settlementStatus = receiverIsSuperadmin ? 'settled' : 'unsettled';
        order.amountPaid = Number(order.totalAmount) || 0;
        order.amountDue = 0;
      } else if (oldPaymentStatus !== 'paid') {
        throw new Error('Use Record partial payment to collect the remaining balance and select its receiver.');
      }
    }
    // Reverse incorrect full payments, including legacy unpaid orders whose
    // collection was retained by the old settled-status check.
    const wasPaid = oldPaymentStatus === 'paid'; // use OLD status captured before field update
    const nowUnpaid = paymentStatus && paymentStatus.toLowerCase() !== 'paid';
    if ((wasPaid && nowUnpaid) || paymentStatus?.toLowerCase() === 'unpaid') {
      await reverseOrderCollection(order, { PaymentLedger, Admin, Settlement, session });
    }

    const updatedOrder = await order.save({ session });
    await session.commitTransaction();

    // Log what changed (outside transaction)
    const changes = [];
    if (status) changes.push(`status→${status}`);
    if (paymentStatus) changes.push(`payment→${paymentStatus}`);
    if (items) changes.push('items edited');
    if (customerName) changes.push(`customer→${customerName}`);
    if (changes.length > 0) {
      await writeLog(req, 'UPDATE_ORDER', 'Order',
        `Order #${order._id.toString().slice(-6).toUpperCase()} updated: ${changes.join(', ')}`);
    }

    // Order status email notification (outside transaction)
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

// 7a. POST partial payment for an order (Admin)
router.post('/:id/partial-payment', verifyAdmin, asyncHandler(async (req, res) => {
  const { amount, method, note, receiverAdminId } = req.body;
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ message: 'A valid payment amount is required.' });
  }
  if (typeof receiverAdminId !== 'string' || !mongoose.isValidObjectId(receiverAdminId)) {
    return res.status(400).json({ message: 'Select the admin who received this payment.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Order not found' });
    }

    const paymentAmount = Number(amount);
    const receiverAdmin = await Admin.findById(receiverAdminId).session(session);
    if (!receiverAdmin || !['admin', 'superadmin'].includes(receiverAdmin.role)) {
      throw new Error('The selected payment receiver is unavailable.');
    }
    const totalAmount   = Number(order.totalAmount) || 0;
    const currentPaid   = Number(order.amountPaid) || 0;
    if (order.paymentStatus === 'Paid' || paymentAmount > Math.max(0, totalAmount - currentPaid)) {
      throw new Error('Payment amount cannot exceed the remaining due.');
    }
    const newPaid       = currentPaid + paymentAmount;
    const newDue        = Math.max(0, totalAmount - newPaid);

    // ── Push the installment record ──
    const partialEntry = {
      amount: paymentAmount,
      method: method || 'Cash',
      note:   note   || '',
      recordedBy: {
        adminId:   req.admin.id,
        adminName: req.admin.name || '',
      },
      receivedBy: { adminId: receiverAdmin._id, adminName: receiverAdmin.name },
      paidAt: new Date(),
    };

    order.partialPayments.push(partialEntry);
    order.amountPaid = newPaid;
    order.amountDue  = newDue;

    // Auto-mark as Paid when fully settled
    if (newDue <= 0) {
      order.paymentStatus = 'Paid';
      if (!order.paymentReceivedBy?.adminId) {
        order.paymentReceivedBy = { adminId: receiverAdmin._id, adminName: receiverAdmin.name };
        order.paymentReceivedAt = new Date();
      }
    } else {
      if (order.paymentStatus !== 'Paid') {
        order.paymentStatus = 'Partial';
      }
    }

    // ── Payment Receiver logic (mirrors regular "mark as Paid") ──
    // Credit the actual receiver; retain the recording admin in the installment audit trail.
    const receiverIsSuperadmin = receiverAdmin?.role === 'superadmin';

    const [collection] = await PaymentLedger.create([{
      orderId:       order._id,
      adminId:       receiverAdmin._id,
      adminName:     receiverAdmin.name,
      amount:        paymentAmount,
      type:          'collection',
      paymentMethod: method || order.paymentMethod || 'Cash',
      note: `Partial payment ${paymentAmount} TK — order #${order._id.toString().slice(-6).toUpperCase()}${receiverIsSuperadmin ? ' (superadmin collected)' : ''}`
    }], { session });
    order.partialPayments[order.partialPayments.length - 1].ledgerEntryId = collection._id;

    if (receiverIsSuperadmin) {
      // Superadmin collected directly → money is already in superadmin's holding
      if (order.settlementStatus !== 'settled') {
        order.settlementStatus = newDue <= 0 ? 'settled' : 'unsettled';
      }
    } else {
      // Regular admin holds the money → unsettled until settled with superadmin
      order.settlementStatus = 'unsettled';
    }

    await order.save({ session });
    await session.commitTransaction();

    await writeLog(req, 'PARTIAL_PAYMENT', 'Order',
      `Partial payment of ${paymentAmount} TK received by ${receiverAdmin.name} for order #${order._id.toString().slice(-6).toUpperCase()} (paid: ${newPaid}, due: ${newDue})`);

    res.json({ message: 'Partial payment recorded.', order });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
}));

// 7b. DELETE a single partial payment installment (Admin)
router.delete('/:id/partial-payment/:paymentId', verifyAdmin, asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Order not found' });
    }

    // Find the specific partial payment sub-document
    const paymentIndex = order.partialPayments.findIndex(
      p => p._id.toString() === req.params.paymentId
    );
    if (paymentIndex === -1) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Partial payment not found' });
    }

    const removedPayment = order.partialPayments[paymentIndex];
    const removedAmount  = Number(removedPayment.amount) || 0;

    // Remove the sub-document
    order.partialPayments.splice(paymentIndex, 1);

    // Recalculate totals
    const newPaid = Math.max(0, (Number(order.amountPaid) || 0) - removedAmount);
    const newDue  = Math.max(0, (Number(order.totalAmount) || 0) - newPaid);

    order.amountPaid = newPaid;
    order.amountDue  = newDue;

    // If the order was marked Paid (possibly auto-set) but now has remaining due, revert
    if (newDue > 0 && order.paymentStatus === 'Paid') {
      order.paymentStatus = order.partialPayments.length > 0 ? 'Partial' : 'Unpaid';
      // Clear receiver info only if no partial payments remain
      if (order.partialPayments.length === 0) {
        order.paymentReceivedBy  = undefined;
        order.paymentReceivedAt  = null;
        order.settlementStatus   = null;
        order.markModified('paymentReceivedBy');
      }
    }

    // If no partial payments remain at all, reset to Unpaid
    if (order.partialPayments.length === 0 && newDue >= (Number(order.totalAmount) || 0)) {
      order.paymentStatus    = 'Unpaid';
      order.amountPaid       = 0;
      order.amountDue        = null;
      order.settlementStatus = null;
    }

    order.markModified('partialPayments');

    // Reverse the matching PaymentLedger entry for this payment.
    // Match by orderId + amount + type='collection' (most recent first) to avoid over-deleting.
    const ledgerEntry = await PaymentLedger.findOne(removedPayment.ledgerEntryId ? {
      _id: removedPayment.ledgerEntryId,
      orderId: order._id,
      type: 'collection',
    } : {
      orderId: order._id,
      type:    'collection',
      amount:  removedAmount,
      ...((removedPayment.receivedBy?.adminId || removedPayment.recordedBy?.adminId) ? { adminId: removedPayment.receivedBy?.adminId || removedPayment.recordedBy?.adminId } : {}),
    }).sort({ createdAt: -1 }).session(session);

    if (ledgerEntry) {
      await PaymentLedger.deleteOne({ _id: ledgerEntry._id }).session(session);
    }

    // Installments create collection entries, not settlement requests.
    // Never remove an unrelated settlement just because its amount matches.

    // Update settlementStatus: if some payments remain, keep unsettled; if none, null
    if (order.partialPayments.length > 0 && order.settlementStatus !== 'settled') {
      order.settlementStatus = 'unsettled';
    }

    await order.save({ session });
    await session.commitTransaction();

    await writeLog(req, 'DELETE_PARTIAL_PAYMENT', 'Order',
      `Removed partial payment of ${removedAmount} TK from order #${order._id.toString().slice(-6).toUpperCase()} (new paid: ${order.amountPaid}, due: ${order.amountDue})`);

    res.json({ message: 'Partial payment removed.', order });
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
