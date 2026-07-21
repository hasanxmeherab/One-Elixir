const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const Settlement    = require('../models/Settlement');
const PaymentLedger = require('../models/PaymentLedger');
const Order         = require('../models/Order');
const Admin         = require('../models/Admin');
const SystemConfig  = require('../models/SystemConfig');
const writeLog      = require('../utils/writeLog');

const { verifyAdmin, verifySuperadmin } = require('../middleware/authMiddleware');

// ✅ Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ── Helper: Fast bulk-sync missing PaymentLedger collection entries ──
const syncMissingLedgerEntries = async () => {
  try {
    // 1. Get all orderIds already present in PaymentLedger
    const existingLedgerOrderIds = await PaymentLedger.distinct('orderId', { orderId: { $ne: null } });
    const existingSet = new Set(existingLedgerOrderIds.map(id => id.toString()));

    // 1b. Check if a ledger reset has been done — only sync orders AFTER that date
    const resetConfig = await SystemConfig.findOne({ key: 'ledgerResetAt' });
    const resetAt = resetConfig?.value ? new Date(resetConfig.value) : null;

    // 2. Query paid orders that are NOT in PaymentLedger (and paid AFTER reset date if applicable)
    const orderFilter = {
      paymentStatus: { $regex: /^paid$/i },
      _id: { $nin: existingLedgerOrderIds }
    };
    if (resetAt) {
      // Only sync orders that were paid/created after the reset
      orderFilter.createdAt = { $gt: resetAt };
    }
    const unsyncedPaidOrders = await Order.find(orderFilter);

    if (unsyncedPaidOrders.length === 0) return; // Fast exit (0 iterations)!

    const admins = await Admin.find().select('_id name role');
    const adminNameMap = {};
    admins.forEach(a => {
      if (a.name) adminNameMap[a.name.trim().toLowerCase()] = a;
    });

    const newLedgerEntries = [];
    const orderSavePromises = [];

    for (const order of unsyncedPaidOrders) {
      let targetAdminId = order.paymentReceivedBy?.adminId;
      let targetAdminName = order.paymentReceivedBy?.adminName;

      // If paymentReceivedBy is missing, match createdBy to admin
      if (!targetAdminId && order.createdBy) {
        const matchedAdmin = adminNameMap[order.createdBy.trim().toLowerCase()];
        if (matchedAdmin) {
          targetAdminId = matchedAdmin._id;
          targetAdminName = matchedAdmin.name;

          order.paymentReceivedBy = {
            adminId: matchedAdmin._id,
            adminName: matchedAdmin.name
          };
          order.paymentReceivedAt = order.paymentReceivedAt || order.createdAt;
          order.settlementStatus = matchedAdmin.role === 'superadmin' ? 'settled' : 'unsettled';
          orderSavePromises.push(order.save());
        }
      }

      if (targetAdminId) {
        const receiverAdmin = admins.find(a => a._id.toString() === targetAdminId.toString());
        const isSuperadmin = receiverAdmin?.role === 'superadmin';

        newLedgerEntries.push({
          orderId: order._id,
          adminId: targetAdminId,
          adminName: targetAdminName || receiverAdmin?.name || 'Admin',
          amount: order.totalAmount,
          type: 'collection',
          paymentMethod: order.paymentMethod || 'Cash',
          note: `Auto-synced ledger entry for paid order #${order._id.toString().slice(-6).toUpperCase()}`,
          createdAt: order.paymentReceivedAt || order.createdAt
        });

        if (!order.settlementStatus) {
          order.settlementStatus = isSuperadmin ? 'settled' : 'unsettled';
          orderSavePromises.push(order.save());
        }
      }
    }

    if (newLedgerEntries.length > 0) {
      await PaymentLedger.insertMany(newLedgerEntries);
    }
    if (orderSavePromises.length > 0) {
      await Promise.all(orderSavePromises);
    }
  } catch (err) {
    console.error('Error syncing missing ledger entries:', err.message);
  }
};

// ══════════════════════════════════════════════════════════════
// 1. GET /balances — outstanding balance per admin
//    Superadmin sees all, normal admin sees only self
// ══════════════════════════════════════════════════════════════
router.get('/balances', verifyAdmin, asyncHandler(async (req, res) => {
  await syncMissingLedgerEntries();

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
  await syncMissingLedgerEntries();

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

  // Superadmin's own holding balance (received from admins but not yet vaulted)
  const superadmin = admins.find(a => a.role === 'superadmin');
  const superadminHoldingAgg = superadmin ? await PaymentLedger.aggregate([
    { $match: { adminId: superadmin._id } },
    {
      $group: {
        _id: null,
        totalIn: { $sum: { $cond: [{ $in: ['$type', ['collection', 'received_from_admin']] }, '$amount', 0] } },
        totalOut: { $sum: { $cond: [{ $eq: ['$type', 'vault_transfer'] }, '$amount', 0] } }
      }
    }
  ]) : [];
  const superadminHolding = (superadminHoldingAgg[0]?.totalIn || 0) - (superadminHoldingAgg[0]?.totalOut || 0);

  // Total money confirmed into vault (only explicit vault_transfer entries)
  const vaultAgg = await PaymentLedger.aggregate([
    { $match: { type: 'vault_transfer' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const vaultBalance = vaultAgg[0]?.total || 0;

  // Frozen revenue: a permanent snapshot of revenue at the time the vault chain was introduced.
  // Saved once in DB — never changes from order updates. Only vault transfers add to available money after this.
  let snapshotConfig = await SystemConfig.findOne({ key: 'revenueSnapshot' });
  if (!snapshotConfig) {
    // First time: calculate current revenue from ALL existing delivered+paid orders and freeze it
    const snapshotAgg = await Order.aggregate([
      { $match: { status: { $regex: /^delivered$/i }, paymentStatus: { $regex: /^paid$/i } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const snapshot = snapshotAgg[0]?.total || 0;
    snapshotConfig = await SystemConfig.findOneAndUpdate(
      { key: 'revenueSnapshot' },
      { key: 'revenueSnapshot', value: snapshot, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  }
  const frozenRevenue = snapshotConfig?.value || 0;

  res.json({
    admins: dashboard,
    vaultBalance,
    frozenRevenue,
    superadminHolding,
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

    // Add received_from_admin entry for superadmin (money now in superadmin's holding)
    await PaymentLedger.create([{
      adminId: req.admin.id,
      adminName: req.admin.name,
      amount: settlement.amount,
      type: 'received_from_admin',
      paymentMethod: settlement.paymentMethod,
      settlementId: settlement._id,
      note: `Received ৳${settlement.amount.toLocaleString()} from ${settlement.adminName} (Settlement #${settlement._id.toString().slice(-6).toUpperCase()})`
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

// ══════════════════════════════════════════════════════════════
// POST /vault-transfer — superadmin transfers from holding to main vault
// ══════════════════════════════════════════════════════════════
router.post('/vault-transfer', verifySuperadmin, asyncHandler(async (req, res) => {
  const { amount, note } = req.body;

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Amount must be greater than 0' });
  }

  // Calculate superadmin's current holding balance
  const holdingAgg = await PaymentLedger.aggregate([
    { $match: { adminId: new mongoose.Types.ObjectId(req.admin.id) } },
    {
      $group: {
        _id: null,
        totalIn: { $sum: { $cond: [{ $in: ['$type', ['collection', 'received_from_admin']] }, '$amount', 0] } },
        totalOut: { $sum: { $cond: [{ $eq: ['$type', 'vault_transfer'] }, '$amount', 0] } }
      }
    }
  ]);
  const currentHolding = (holdingAgg[0]?.totalIn || 0) - (holdingAgg[0]?.totalOut || 0);

  if (Number(amount) > currentHolding) {
    return res.status(400).json({
      message: `Insufficient holding balance. You have ৳${currentHolding.toLocaleString()} available.`
    });
  }

  // Create vault_transfer ledger entry (deducts from superadmin's holding, adds to vault)
  const ledgerEntry = await PaymentLedger.create({
    adminId: req.admin.id,
    adminName: req.admin.name,
    amount: Number(amount),
    type: 'vault_transfer',
    paymentMethod: 'Internal Transfer',
    note: note || `Vault transfer by ${req.admin.name}`
  });

  await writeLog(req, 'VAULT_TRANSFER', 'PaymentLedger',
    `${req.admin.name} transferred ৳${Number(amount).toLocaleString()} to vault. Remaining holding: ৳${(currentHolding - Number(amount)).toLocaleString()}`);

  res.json({
    message: `৳${Number(amount).toLocaleString()} transferred to vault successfully.`,
    newHolding: currentHolding - Number(amount),
    ledgerEntry
  });
}));

// ══════════════════════════════════════════════════════════════
// POST /reset-ledger — superadmin resets all balances to 0
//   Clears PaymentLedger + resets order settlement fields
// ══════════════════════════════════════════════════════════════
router.post('/reset-ledger', verifySuperadmin, asyncHandler(async (req, res) => {
  // Snapshot current revenue BEFORE clearing anything (this becomes the new frozen base)
  const snapshotAgg = await Order.aggregate([
    { $match: { status: { $regex: /^delivered$/i }, paymentStatus: { $regex: /^paid$/i } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  const snapshot = snapshotAgg[0]?.total || 0;
  await SystemConfig.findOneAndUpdate(
    { key: 'revenueSnapshot' },
    { key: 'revenueSnapshot', value: snapshot, updatedAt: new Date() },
    { upsert: true, new: true }
  );

  // Delete all PaymentLedger entries
  const deletedLedger = await PaymentLedger.deleteMany({});

  // Save reset timestamp — syncMissingLedgerEntries will skip all orders before this
  const now = new Date();
  await SystemConfig.findOneAndUpdate(
    { key: 'ledgerResetAt' },
    { key: 'ledgerResetAt', value: now, updatedAt: now },
    { upsert: true, new: true }
  );

  // Reset all orders settlement status (optional UX cleanup)
  await Order.updateMany(
    {},
    {
      $set: { settlementStatus: null, paymentReceivedAt: null },
      $unset: { 'paymentReceivedBy.adminId': '', 'paymentReceivedBy.adminName': '' }
    }
  );

  await writeLog(req, 'RESET_LEDGER', 'PaymentLedger',
    `${req.admin.name} reset all admin balances to 0. ${deletedLedger.deletedCount} ledger entries cleared. Revenue snapshot saved: ৳${snapshot.toLocaleString()}`);

  res.json({
    message: `Ledger reset successful. ${deletedLedger.deletedCount} entries cleared. Revenue snapshot: ৳${snapshot.toLocaleString()}. Only new vault transfers will update available money.`,
    deletedCount: deletedLedger.deletedCount,
    frozenRevenue: snapshot,
    resetAt: now
  });
}));

module.exports = router;
