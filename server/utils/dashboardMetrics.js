const round = value => Math.round((Number(value) || 0) * 100) / 100;
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' });
const day = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dayFormatter.format(date);
};
const shift = (value, amount) => new Date(Date.parse(`${value}T00:00:00Z`) + amount * 86400000).toISOString().slice(0, 10);
const canceled = order => ['canceled', 'cancelled', 'archived'].includes(String(order.status).toLowerCase());
const paid = order => String(order.paymentStatus).toLowerCase() === 'paid';
const collected = order => paid(order) ? Number(order.totalAmount) || 0 : Number(order.amountPaid) || (order.partialPayments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
const sum = (items, get = item => item.amount) => round(items.reduce((total, item) => total + Number(get(item) || 0), 0));
const normalizePhone = phone => String(phone || '').replace(/\D/g, '').replace(/^(?:0088|88)(?=01\d{9}$)/, '');

function dashboardRange(query = {}, now = new Date()) {
  const to = query.to || day(now);
  const from = query.from || shift(to, -29);
  for (const value of [from, to]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error('Enter valid start and end dates.');
  }
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  if (days < 1 || days > 366) throw new Error('Select a date range of 1 to 366 days.');
  return { from, to, days, previousFrom: shift(from, -days), previousTo: shift(from, -1) };
}

function dashboardMetrics({ orders = [], products = [], expenses = [], investors = [], ledger = [], settlements = [], admins = [], viewer, range, now = new Date(), resetAt = null }) {
  const isSuperadmin = viewer.role === 'superadmin';
  const id = String(viewer.id);
  const dateCache = new Map();
  const inRange = (date, from, to) => {
    const key = String(date);
    if (!dateCache.has(key)) dateCache.set(key, day(date));
    const value = dateCache.get(key);
    return value && value >= from && value <= to;
  };
  const active = orders.filter(order => !canceled(order));
  const scopedLedger = isSuperadmin ? ledger : ledger.filter(entry => String(entry.adminId) === id);
  const collections = scopedLedger.filter(entry => entry.type === 'collection');
  const expensesVisible = isSuperadmin ? expenses : [];
  const metricsFor = (from, to) => {
    const periodOrders = active.filter(order => inRange(order.createdAt, from, to));
    const completed = periodOrders.filter(order => String(order.status).toLowerCase() === 'delivered' && paid(order));
    return { orders: periodOrders.length, collections: sum(collections.filter(entry => inRange(entry.createdAt, from, to))),
      completedSales: sum(completed, order => order.totalAmount), completedOrders: completed.length, expenses: sum(expensesVisible.filter(entry => inRange(entry.date, from, to))),
      deliveredRate: periodOrders.length ? round(periodOrders.filter(order => String(order.status).toLowerCase() === 'delivered').length / periodOrders.length * 100) : 0 };
  };
  const current = metricsFor(range.from, range.to);
  const previous = metricsFor(range.previousFrom, range.previousTo);
  const trend = Array.from({ length: range.days }, (_, index) => {
    const date = shift(range.from, index);
    return { date, ...metricsFor(date, date) };
  });
  const balances = admins.map(admin => {
    const entries = ledger.filter(entry => String(entry.adminId) === String(admin._id));
    return { id: String(admin._id), name: admin.name, role: admin.role,
      outstanding: admin.role === 'superadmin' ? 0 : round(sum(entries.filter(entry => ['collection', 'adjustment'].includes(entry.type))) - sum(entries.filter(entry => entry.type === 'settlement'))),
      holding: admin.role === 'superadmin' ? round(sum(entries.filter(entry => ['collection', 'received_from_admin'].includes(entry.type))) - sum(entries.filter(entry => entry.type === 'vault_transfer'))) : null,
    };
  });
  const ownLedger = ledger.filter(entry => String(entry.adminId) === id);
  const ownBalance = round(sum(ownLedger.filter(entry => ['collection', 'adjustment'].includes(entry.type))) - sum(ownLedger.filter(entry => entry.type === 'settlement')));
  const stock = products.filter(product => product.isDeleted !== true).flatMap(product => product.variants?.length ? product.variants.map(variant => ({ id: String(product._id), name: product.name, size: variant.label, stock: Number(variant.stock) || 0, price: Number(variant.price) || 0 })) : [{ id: String(product._id), name: product.name, size: '', stock: Number(product.stock) || 0, price: Number(product.price) || 0 }]);
  const low = stock.filter(item => item.stock > 0 && item.stock < 5);
  const out = stock.filter(item => item.stock <= 0);
  const due = active.filter(order => Math.max(0, Number(order.totalAmount) - collected(order)) > 0);
  const pendingSettlements = settlements.filter(settlement => settlement.status === 'pending' && (isSuperadmin || String(settlement.adminId) === id));
  const customers = new Set(active.map(order => normalizePhone(order.phone) || String(order.customerEmail || '').trim().toLowerCase() || String(order._id)));
  const productMap = new Map();
  for (const order of active.filter(order => inRange(order.createdAt, range.from, range.to) && String(order.status).toLowerCase() === 'delivered' && paid(order))) {
    const lines = (order.items || []).map(item => {
      let unitPrice = item.finalItemPrice;
      if (unitPrice == null) {
        const base = Number(item.price) || 0;
        unitPrice = Math.max(0, base - (item.discountType === 'percentage' ? base * Math.min(100, Number(item.discountValue) || 0) / 100 : item.discountType === 'fixed' ? Number(item.discountValue) || 0 : 0));
      }
      return { ...item, lineTotal: Math.max(0, Number(unitPrice)) * Number(item.quantity || 0) };
    });
    const subtotal = sum(lines, line => line.lineTotal);
    const discount = Math.min(subtotal, Math.max(0, Number(order.discountApplied) || 0));
    for (const item of lines) {
      const key = String(item.perfumeId || item.name);
      const entry = productMap.get(key) || { id: key, name: item.name, units: 0, revenue: 0 };
      entry.units += Number(item.quantity || 0);
      entry.revenue += subtotal ? item.lineTotal * (subtotal - discount) / subtotal : 0;
      productMap.set(key, entry);
    }
  }
  const activity = [
    ...orders.filter(order => inRange(order.createdAt, range.from, range.to)).map(order => ({ key: `order-${order._id}`, type: 'Order', text: `${order.customerName} · #${String(order._id).slice(-6).toUpperCase()}`, amount: Number(order.totalAmount), date: order.createdAt, path: `/admin/order-list?order=${order._id}` })),
    ...collections.filter(entry => inRange(entry.createdAt, range.from, range.to)).map(entry => ({ key: `payment-${entry._id}`, type: 'Collection', text: `${entry.adminName || 'Admin'} · ${entry.paymentMethod || 'Payment'}`, amount: entry.amount, date: entry.createdAt, path: entry.orderId ? `/admin/order-list?order=${entry.orderId}` : '/admin/settlements' })),
    ...expensesVisible.filter(entry => inRange(entry.date, range.from, range.to)).map(entry => ({ key: `expense-${entry._id}`, type: 'Expense', text: entry.title, amount: entry.amount, date: entry.date, path: `/admin/expenses?search=${encodeURIComponent(entry.title)}` })),
    ...(isSuperadmin ? investors.flatMap(investor => (investor.transactions || []).filter(entry => inRange(entry.date, range.from, range.to) && entry.amount !== 0).map(entry => ({ key: `investment-${entry._id}`, type: entry.amount < 0 ? 'Withdrawal' : 'Investment', text: investor.investorName, amount: entry.amount, date: entry.date, path: `/admin/investment?investor=${investor._id}` }))) : []),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 12);
  const collectionOrderIds = new Set(ledger.filter(entry => entry.type === 'collection').map(entry => String(entry.orderId)));
  return { range, isSuperadmin, current, previous, trend, activity, generatedAt: now, resetAt,
    attention: [
      { label: 'Pending orders', count: active.filter(order => String(order.status).toLowerCase() === 'pending').length, path: '/admin/order-list?status=Pending' },
      { label: 'Payments to verify', count: active.filter(order => String(order.paymentStatus).toLowerCase() === 'pending verification').length, path: '/admin/order-list?payment=Pending%20Verification' },
      { label: 'Delivered with balance due', count: due.filter(order => String(order.status).toLowerCase() === 'delivered').length, path: '/admin/order-list?status=Delivered&due=1' },
      { label: 'Low-stock products / sizes', count: low.length, path: '/admin/inventory?stock=low' },
      { label: 'Sold-out products / sizes', count: out.length, path: '/admin/inventory?stock=out' },
      { label: isSuperadmin ? 'Pending settlements' : 'My pending settlements', count: pendingSettlements.length, path: isSuperadmin ? '/admin/settlements?tab=pending' : '/admin/settlements?tab=history' },
    ],
    snapshot: { customers: customers.size, customerDue: sum(due, order => Math.max(0, Number(order.totalAmount) - collected(order))),
      recordedCustomerPayments: isSuperadmin ? sum(active, collected) : null,
      currentBalance: isSuperadmin ? round(sum(active, collected) + sum(investors, investor => investor.totalAmount) - sum(expenses)) : null,
      myOutstanding: ownBalance, myCollected: sum(ownLedger.filter(entry => entry.type === 'collection')),
      adminHeld: isSuperadmin ? sum(balances.filter(admin => admin.role !== 'superadmin'), admin => Math.max(0, admin.outstanding)) : null,
      myHolding: isSuperadmin ? balances.find(admin => admin.id === id)?.holding || 0 : null,
      vault: isSuperadmin ? sum(ledger.filter(entry => entry.type === 'vault_transfer')) : null,
      netCapital: isSuperadmin ? sum(investors, investor => investor.totalAmount) : null,
      allExpenses: isSuperadmin ? sum(expenses) : null,
      stockUnits: sum(stock, item => item.stock), retailStockValue: sum(stock, item => item.stock * item.price),
      lowStock: low, outOfStock: out,
    },
    adminBalances: isSuperadmin ? balances : [],
    topProducts: [...productMap.values()].map(product => ({ ...product, revenue: round(product.revenue) })).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    collectionCoverage: isSuperadmin ? active.filter(order => collected(order) > 0 && !collectionOrderIds.has(String(order._id))).length : 0,
  };
}
module.exports = { dashboardRange, dashboardMetrics };
