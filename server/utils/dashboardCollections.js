// Read-only fallback for order receipts missing from the settlement ledger.
// Never infer a payment date from the order's creation date.
function dashboardCollections({ orders, ledger, viewer }) {
  const superadmin = viewer.role === 'superadmin';
  const recorded = ledger.filter(entry => entry.type === 'collection');
  const coveredOrders = new Set(recorded.filter(entry => entry.orderId).map(entry => String(entry.orderId)));
  const result = recorded.filter(entry => superadmin || String(entry.adminId) === String(viewer.id));
  const append = (order, receipt, index) => {
    const amount = Number(receipt.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !receipt.date || !Number.isFinite(new Date(receipt.date).getTime())) return;
    if (!superadmin && String(receipt.adminId) !== String(viewer.id)) return;
    result.push({ _id: `receipt-${order._id}-${index}`, orderId: order._id, type: 'collection', amount,
      adminId: receipt.adminId, adminName: receipt.adminName, paymentMethod: receipt.method || order.paymentMethod,
      createdAt: receipt.date, source: 'order-receipt' });
  };
  for (const order of orders) {
    if (coveredOrders.has(String(order._id))) continue;
    if (['canceled', 'cancelled', 'archived'].includes(String(order.status).toLowerCase())) continue;
    if (order.partialPayments?.length) {
      order.partialPayments.forEach((payment, index) => {
        const receiver = payment.receivedBy?.adminId ? payment.receivedBy : payment.recordedBy?.adminId ? payment.recordedBy : order.paymentReceivedBy || {};
        append(order, { amount: payment.amount, date: payment.paidAt, adminId: receiver.adminId, adminName: receiver.adminName, method: payment.method }, index);
      });
    } else {
      const amount = String(order.paymentStatus).toLowerCase() === 'paid' ? order.totalAmount : order.amountPaid;
      append(order, { amount, date: order.paymentReceivedAt, ...order.paymentReceivedBy }, 0);
    }
  }
  return result;
}
module.exports = dashboardCollections;
