const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const Settlement    = require('../models/Settlement');
const PaymentLedger = require('../models/PaymentLedger');
const Order         = require('../models/Order');
const Admin         = require('../models/Admin');
const writeLog      = require('../utils/writeLog');

const { verifyAdmin, verifySuperadmin } = require('../middleware/authMiddleware');

// ✅ Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ══════════════════════════════════════════════════════════════
// 1. GET /balances — outstanding balance per admin
//    Superadmin sees all, normal admin sees only self
// ══════════════════════════════════════════════════════════════
router.get('/balances', verifyAdmin, asyncHandler(async (req, res) => {
  const isSuperadmin = req.admin.role === 'superadmin';

  const matchStage = isSuperadmin
    ? {}
    : { adminId: new mongoose.Types.ObjectId(req.admin.id) };

  // Aggregate ledger: collections increase balance, settlements decrease
  const balances = await PaymentLedger.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$adminId',
        adminName: { $first: '$adminName' },
        totalCollected: {
          $sum: { $cond: [{ $eq: ['$type', 'collection'] }, '$amount', 0] }
        },
        totalSettled: {
          $sum: { $cond: [{ $eq: ['$type', 'settlement'] }, '$amount', 0] }
        },
        totalAdjustments: {
          $sum: { $cond: [{ $eq: ['$type', 'adjustment'] }, '$amount', 0] }
        },
        transactionCount: {
          $sum: { $cond: [{ $eq: ['$type', 'collection'] }, 1, 0] }
        }
      }
    },
    {
      $addFields: {
        outstandingBalance: {
          $subtract: [
            { $add: ['$totalCollected', '$totalAdjustments'] },
            '$totalSettled'
          ]
        }
      }
    },
    { $sort: { outstandingBalance: -1 } }
  ]);

  res.json(balances);
}));

// ══════════════════════════════════════════════════════════════
// 2. GET /dashboard — full settlement dashboard (superadmin)
// ══════════════════════════════════════════════════════════════
router.get('/dashboard', verifySuperadmin, asyncHandler(async (req, res) => {
  // Get all admins
  const admins = await Admin.find().select('_id name role');

  // Aggregate balances from ledger
  const balanceAgg = await PaymentLedger.aggregate([
    {
      $group: {
        _id: '$adminId',
        adminName: { $first: '$adminName' },
        totalCollected: {
          $sum: { $cond: [{ $eq: ['$type', 'collection'] }, '$amount', 0] }
        },
        totalSettled: {
          $sum: { $cond: [{ $eq: ['$type', 'settlement'] }, '$amount', 0] }
        },
        totalAdjustments: {
          $sum: { $cond: [{ $eq: ['$type', 'adjustment'] }, '$amount', 0] }
        },
        orderCount: {
          $sum: { $cond: [{ $eq: ['$type', 'collection'] }, 1, 0] }
        }
      }
    }
  ]);

  // Get last settlement date per admin
  const lastSettlements = await Settlement.aggregate([
    { $match: { status: 'confirmed' } },
    {
      $group: {
        _id: '$adminId',
        lastSettlementDate: { $max: '$confirmedAt' }
      }
    }
  ]);
  const lastSettlementMap = {};
  lastSettlements.forEach(s => {
    lastSettlementMap[s._id.toString()] = s.lastSettlementDate;
  });

  // Pending settlement count per admin
  const pendingCounts = await Settlement.aggregate([
    { $match: { status: 'pending' } },
    { $group: { _id: '$adminId', pendingCount: { $sum: 1 }, pendingAmount: { $sum: '$amount' } } }
  ]);
  const pendingMap = {};
  pendingCounts.forEach(p => {
    pendingMap[p._id.toString()] = { count: p.pendingCount, amount: p.pendingAmount };
  });

  // Build dashboard data per admin
  const balanceMap = {};
  balanceAgg.forEach(b => { balanceMap[b._id.toString()] = b; });

  const dashboard = admins.map(admin => {
    const aid = admin._id.toString();
    const b = balanceMap[aid] || { totalCollected: 0, totalSettled: 0, totalAdjustments: 0, orderCount: 0 };
    const outstanding = (b.totalCollected + b.totalAdjustments) - b.totalSettled;
    const pending = pendingMap[aid] || { count: 0, amount: 0 };

    return {
      adminId: admin._id,
      adminName: admin.name,
      role: admin.role,
      totalOrdersCollected: b.orderCount,
      totalAmountCollected: b.totalCollected,
      amountSettled: b.totalSettled,
      outstandingBalance: outstanding,
      lastSettlementDate: lastSettlementMap[aid] || null,
      pendingSettlements: pending.count,
      pendingAmount: pending.amount,
      status: outstanding <= 0 ? 'Settled' : (pending.count > 0 ? 'Pending' : 'Unsettled')
    };
  });

  // Today's summary
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayCollected = await PaymentLedger.aggregate([
    { $match: { type: 'collection', createdAt: { $gte: todayStart } } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);

  const todaySettled = await PaymentLedger.aggregate([
    { $match: { type: 'settlement', createdAt: { $gte: todayStart } } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);

  const totalPending = await Settlement.countDocuments({ status: 'pending' });

  res.json({
    admins: dashboard,
    summary: {
      totalCollectedToday: todayCollected[0]?.total || 0,
      collectionsToday: todayCollected[0]?.count || 0,
      totalSettledToday: todaySettled[0]?.total || 0,
      settlementsToday: todaySettled[0]?.count || 0,
      pendingSettlements: totalPending
    }
  });
}));

// ══════════════════════════════════════════════════════════════
// 3. POST /request — admin submits a settlement request
// ══════════════════════════════════════════════════════════════
router.post('/request', verifyAdmin, asyncHandler(async (req, res) => {
  const { amount, paymentMethod, transactionId, note } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be greater than 0' });
  }
  if (!paymentMethod) {
    return res.status(400).json({ message: 'Payment method is required' });
  }

  // Verify admin has sufficient outstanding balance
  const ledgerAgg = await PaymentLedger.aggregate([
    { $match: { adminId: new mongoose.Types.ObjectId(req.admin.id) } },
    {
      $group: {
        _id: null,
        totalCollected: {
          $sum: { $cond: [{ $eq: ['$type', 'collection'] }, '$amount', 0] }
        },
        totalSettled: {
          $sum: { $cond: [{ $eq: ['$type', 'settlement'] }, '$amount', 0] }
        },
        totalAdjustments: {
          $sum: { $cond: [{ $eq: ['$type', 'adjustment'] }, '$amount', 0] }
        }
      }
    }
  ]);

  const balance = ledgerAgg[0]
    ? (ledgerAgg[0].totalCollected + ledgerAgg[0].totalAdjustments) - ledgerAgg[0].totalSettled
    : 0;

  // Check pending settlement amounts too
  const pendingTotal = await Settlement.aggregate([
    { $match: { adminId: new mongoose.Types.ObjectId(req.admin.id), status: 'pending' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const alreadyPending = pendingTotal[0]?.total || 0;

  if (amount > (balance - alreadyPending)) {
    return res.status(400).json({
      message: `Insufficient balance. Outstanding: ৳${balance.toLocaleString()}, Already pending: ৳${alreadyPending.toLocaleString()}, Available: ৳${(balance - alreadyPending).toLocaleString()}`
    });
  }

  const settlement = new Settlement({
    adminId: req.admin.id,
    adminName: req.admin.name,
    amount,
    paymentMethod,
    transactionId: transactionId || '',
    note: note || '',
    status: 'pending'
  });

  await settlement.save();

  await writeLog(req, 'SETTLEMENT_REQUEST', 'Settlement',
    `${req.admin.name} submitted settlement request for ৳${amount.toLocaleString()} via ${paymentMethod}`);

  res.status(201).json(settlement);
}));

// ══════════════════════════════════════════════════════════════
// 4. GET /pending — list all pending settlements (superadmin)
// ══════════════════════════════════════════════════════════════
router.get('/pending', verifySuperadmin, asyncHandler(async (req, res) => {
  const pending = await Settlement.find({ status: 'pending' }).sort({ createdAt: -1 });
  res.json(pending);
}));

// ══════════════════════════════════════════════════════════════
// 5. PUT /:id/confirm — superadmin confirms a settlement
// ══════════════════════════════════════════════════════════════
router.put('/:id/confirm', verifySuperadmin, asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const settlement = await Settlement.findById(req.params.id).session(session);
    if (!settlement) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Settlement not found' });
    }
    if (settlement.status !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({ message: `Settlement is already ${settlement.status}` });
    }

    // Update settlement status
    settlement.status = 'confirmed';
    settlement.confirmedBy = {
      adminId: req.admin.id,
      adminName: req.admin.name
    };
    settlement.confirmedAt = new Date();
    await settlement.save({ session });

    // Create a settlement ledger entry (deducts from admin's balance)
    await PaymentLedger.create([{
      adminId: settlement.adminId,
      adminName: settlement.adminName,
      amount: settlement.amount,
      type: 'settlement',
      paymentMethod: settlement.paymentMethod,
      settlementId: settlement._id,
      note: `Settlement confirmed by ${req.admin.name}`
    }], { session });

    // Update any unsettled orders from this admin to 'settled'
    // up to the settlement amount
    const unsettledOrders = await Order.find({
      'paymentReceivedBy.adminId': settlement.adminId,
      settlementStatus: 'unsettled'
    }).sort({ createdAt: 1 }).session(session);

    let remaining = settlement.amount;
    for (const order of unsettledOrders) {
      if (remaining <= 0) break;
      order.settlementStatus = 'settled';
      order.settlementRef = settlement._id;
      await order.save({ session });
      remaining -= order.totalAmount;
    }

    await session.commitTransaction();

    await writeLog(req, 'SETTLEMENT_CONFIRM', 'Settlement',
      `Confirmed settlement #${settlement._id.toString().slice(-6).toUpperCase()} from ${settlement.adminName} — ৳${settlement.amount.toLocaleString()}`);

    res.json(settlement);
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
}));

// ══════════════════════════════════════════════════════════════
// 6. PUT /:id/reject — superadmin rejects a settlement
// ══════════════════════════════════════════════════════════════
router.put('/:id/reject', verifySuperadmin, asyncHandler(async (req, res) => {
  const settlement = await Settlement.findById(req.params.id);
  if (!settlement) {
    return res.status(404).json({ message: 'Settlement not found' });
  }
  if (settlement.status !== 'pending') {
    return res.status(400).json({ message: `Settlement is already ${settlement.status}` });
  }

  settlement.status = 'rejected';
  settlement.confirmedBy = {
    adminId: req.admin.id,
    adminName: req.admin.name
  };
  settlement.confirmedAt = new Date();
  const { reason } = req.body;
  if (reason) settlement.note = (settlement.note ? settlement.note + ' | ' : '') + `Rejected: ${reason}`;
  await settlement.save();

  await writeLog(req, 'SETTLEMENT_REJECT', 'Settlement',
    `Rejected settlement #${settlement._id.toString().slice(-6).toUpperCase()} from ${settlement.adminName} — ৳${settlement.amount.toLocaleString()}`);

  res.json(settlement);
}));

// ══════════════════════════════════════════════════════════════
// 7. GET /history — settlement history
//    Superadmin sees all, admin sees only own
// ══════════════════════════════════════════════════════════════
router.get('/history', verifyAdmin, asyncHandler(async (req, res) => {
  const isSuperadmin = req.admin.role === 'superadmin';
  const query = isSuperadmin ? {} : { adminId: req.admin.id };

  // Optional filters
  if (req.query.status) query.status = req.query.status;
  if (req.query.adminId && isSuperadmin) query.adminId = req.query.adminId;
  if (req.query.from || req.query.to) {
    query.createdAt = {};
    if (req.query.from) query.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) {
      const to = new Date(req.query.to);
      to.setHours(23, 59, 59, 999);
      query.createdAt.$lte = to;
    }
  }

  const settlements = await Settlement.find(query).sort({ createdAt: -1 }).limit(500);
  res.json(settlements);
}));

// ══════════════════════════════════════════════════════════════
// 8. GET /reports — reporting data (superadmin)
// ══════════════════════════════════════════════════════════════
router.get('/reports', verifySuperadmin, asyncHandler(async (req, res) => {
  const { from, to, adminId, paymentMethod } = req.query;

  // Base match for collections
  const collectionMatch = { type: 'collection' };
  if (adminId) collectionMatch.adminId = new mongoose.Types.ObjectId(adminId);
  if (paymentMethod) collectionMatch.paymentMethod = paymentMethod;
  if (from || to) {
    collectionMatch.createdAt = {};
    if (from) collectionMatch.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      collectionMatch.createdAt.$lte = toDate;
    }
  }

  // Collection by admin
  const collectionByAdmin = await PaymentLedger.aggregate([
    { $match: collectionMatch },
    {
      $group: {
        _id: '$adminId',
        adminName: { $first: '$adminName' },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);

  // Collection by payment method
  const collectionByMethod = await PaymentLedger.aggregate([
    { $match: collectionMatch },
    {
      $group: {
        _id: '$paymentMethod',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);

  // Daily collection trend (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dailyTrend = await PaymentLedger.aggregate([
    { $match: { type: 'collection', createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Ledger entries (for detailed view)
  const ledgerEntries = await PaymentLedger.find(collectionMatch)
    .sort({ createdAt: -1 })
    .limit(200);

  res.json({
    collectionByAdmin,
    collectionByMethod,
    dailyTrend,
    ledgerEntries
  });
}));

module.exports = router;
