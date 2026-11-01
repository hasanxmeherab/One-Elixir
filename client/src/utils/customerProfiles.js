export const normalizeCustomerPhone = phone => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (/^008801\d{9}$/.test(digits)) return digits.slice(4);
  if (/^8801\d{9}$/.test(digits)) return digits.slice(2);
  return digits;
};
const money = amount => Math.round(Math.max(0, Number(amount) || 0) * 100) / 100;
export const isCanceledOrder = order => ['canceled', 'cancelled'].includes(String(order.status || '').toLowerCase());
export const collectedAmount = order => String(order.paymentStatus || '').toLowerCase() === 'paid'
  ? money(order.totalAmount)
  : money(Number(order.amountPaid) || order.partialPayments?.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0) || 0);
export const outstandingAmount = order => isCanceledOrder(order) ? 0 : money(Number(order.totalAmount || 0) - collectedAmount(order));

export const buildCustomerProfiles = orders => {
  const grouped = new Map();
  for (const order of orders) {
    const phone = normalizeCustomerPhone(order.phone);
    const email = String(order.customerEmail || '').trim().toLowerCase();
    const key = phone ? `phone:${phone}` : email ? `email:${email}` : `order:${order._id}`;
    if (!grouped.has(key)) grouped.set(key, { key, phone, orders: [] });
    grouped.get(key).orders.push(order);
  }
  return [...grouped.values()].map(customer => {
    const history = [...customer.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const active = history.filter(order => !isCanceledOrder(order));
    return { ...customer, orders: history,
      name: history.find(order => order.customerName?.trim())?.customerName || 'Unnamed customer',
      email: history.find(order => order.customerEmail?.trim())?.customerEmail || '',
      address: history.find(order => order.address?.trim())?.address || '',
      firstOrder: history.at(-1)?.createdAt, lastOrder: history[0]?.createdAt,
      repeatBuyer: active.length >= 2,
      totalSpent: money(active.filter(order => String(order.status || '').toLowerCase() === 'delivered' && String(order.paymentStatus || '').toLowerCase() === 'paid').reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)),
      partialCollected: money(active.filter(order => String(order.paymentStatus || '').toLowerCase() !== 'paid').reduce((sum, order) => sum + collectedAmount(order), 0)),
      outstanding: money(active.reduce((sum, order) => sum + outstandingAmount(order), 0)),
    };
  });
};
