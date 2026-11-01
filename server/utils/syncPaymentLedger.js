const syncMissingLedgerEntries = async ({ PaymentLedger, SystemConfig, Order, Admin }) => {
  try {
    // 1. Get all orderIds already present in PaymentLedger
    const existingLedgerOrderIds = await PaymentLedger.distinct('orderId', { orderId: { $ne: null } });

    // 1b. Check if a ledger reset has been done — only sync orders AFTER that date
    const resetConfig = await SystemConfig.findOne({ key: 'ledgerResetAt' });
    const resetAt = resetConfig?.value ? new Date(resetConfig.value) : null;

    // 2. Query paid orders that are NOT in PaymentLedger (and paid AFTER reset date if applicable)
    const orderFilter = {
      paymentStatus: { $regex: /^paid$/i },
      _id: { $nin: existingLedgerOrderIds },
      'partialPayments.0': { $exists: false }
    };
    if (resetAt) {
      // Only sync orders that were paid/created after the reset
      orderFilter.createdAt = { $gt: resetAt };
    }
    const unsyncedPaidOrders = await Order.find(orderFilter);



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

    // 3. Query orders with partial payments that might be missing ledger entries
    const partialOrdersFilter = {
      'partialPayments.0': { $exists: true }
    };
    if (resetAt) {
      partialOrdersFilter.partialPayments = { $elemMatch: { paidAt: { $gt: resetAt } } };
    }
    const partialOrders = await Order.find(partialOrdersFilter);

    for (const order of partialOrders) {
      const existingEntries = await PaymentLedger.find({ orderId: order._id, type: 'collection' });
      const existingLedgerTotal = existingEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const installments = order.partialPayments.filter(payment => !resetAt || new Date(payment.paidAt) > resetAt);
      const orderPaidTotal = installments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

      if (orderPaidTotal > existingLedgerTotal) {
        let missingAmount = orderPaidTotal - existingLedgerTotal;
        const collectedByAdmin = new Map();
        for (const payment of installments) {
          const adminId = payment.receivedBy?.adminId || payment.recordedBy?.adminId || order.paymentReceivedBy?.adminId;
          if (!adminId) continue; // Never guess who collected a payment.
          const key = adminId.toString();
          const group = collectedByAdmin.get(key) || { adminId, adminName: payment.receivedBy?.adminName || payment.recordedBy?.adminName || order.paymentReceivedBy?.adminName, amount: 0, method: payment.method, paidAt: payment.paidAt };
          group.amount += Number(payment.amount) || 0;
          collectedByAdmin.set(key, group);
        }
        for (const [key, group] of collectedByAdmin) {
          const recorded = existingEntries.filter(entry => entry.adminId?.toString() === key).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
          const amount = Math.min(missingAmount, Math.max(0, group.amount - recorded));
          if (amount <= 0) continue;
          newLedgerEntries.push({
            orderId: order._id,
            adminId: group.adminId,
            adminName: group.adminName || admins.find(admin => admin._id.toString() === key)?.name || 'Admin',
            amount,
            type: 'collection',
            paymentMethod: group.method || order.paymentMethod || 'Cash',
            note: `Auto-synced ledger entry for partial payment on order #${order._id.toString().slice(-6).toUpperCase()}`,
            createdAt: group.paidAt || new Date()
          });
          missingAmount -= amount;
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


// Balance and dashboard requests run together; share a single reconciliation.
let pendingSync = null;
module.exports = dependencies => {
  if (!pendingSync) pendingSync = syncMissingLedgerEntries(dependencies).finally(() => { pendingSync = null; });
  return pendingSync;
};
