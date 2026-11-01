// A direct superadmin receipt is marked "settled" but may still be held by
// that superadmin. Check actual fund movements rather than that status flag.
async function reverseOrderCollection(order, { PaymentLedger, Admin, Settlement, session }) {
  if (order.partialPayments?.length) {
    throw new Error('This order has recorded installments. Remove the incorrect payments from payment history before marking it unpaid.');
  }
  if (order.settlementRef) {
    throw new Error('This payment is linked to a confirmed settlement. Correct that settlement before reversing the payment.');
  }
  const entries = await PaymentLedger.find({ orderId: order._id, type: 'collection' }).session(session);
  const amounts = new Map();
  for (const entry of entries) {
    const key = String(entry.adminId);
    amounts.set(key, (amounts.get(key) || 0) + Number(entry.amount || 0));
  }
  for (const [adminId, amount] of amounts) {
    const receiver = await Admin.findById(adminId).session(session);
    if (!receiver) throw new Error('The payment receiver account is missing. Review this collection before reversing it.');
    const isSuperadmin = receiver.role === 'superadmin';
    const totals = await PaymentLedger.aggregate([
      { $match: { adminId: receiver._id } },
      { $group: { _id: null,
        incoming: { $sum: { $cond: [{ $in: ['$type', isSuperadmin ? ['collection', 'received_from_admin'] : ['collection', 'adjustment']] }, '$amount', 0] } },
        outgoing: { $sum: { $cond: [{ $eq: ['$type', isSuperadmin ? 'vault_transfer' : 'settlement'] }, '$amount', 0] } },
      } },
    ]).session(session);
    const available = (totals[0]?.incoming || 0) - (totals[0]?.outgoing || 0);
    if (Math.round((available - amount) * 100) < 0) {
      throw new Error('This collection is no longer fully held by its receiver. Review confirmed settlements or vault transfers before reversing it.');
    }
    const pending = await Settlement.aggregate([
      { $match: { adminId: receiver._id, status: 'pending' } },
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]).session(session);
    if (Math.round((available - amount - (pending[0]?.amount || 0)) * 100) < 0) {
      throw new Error('A pending settlement request includes this balance. Reject or correct that request before reversing the payment.');
    }
  }
  // Remove every matching collection, including duplicate legacy entries.
  // Confirmed handovers, vault transfers, and unrelated orders stay intact.
  await PaymentLedger.deleteMany({ orderId: order._id, type: 'collection' }).session(session);
  order.amountPaid = 0;
  order.amountDue = Number(order.totalAmount) || 0;
  if (order.paymentDetails) order.paymentDetails.amountPaid = 0;
  order.paymentReceivedAt = null;
  order.paymentReceivedBy = undefined;
  order.settlementStatus = null;
  order.settlementRef = null;
  order.markModified('paymentReceivedBy');
}
module.exports = reverseOrderCollection;
