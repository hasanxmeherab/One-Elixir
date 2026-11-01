const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dashboardRange, dashboardMetrics } = require('./dashboardMetrics');
const range = dashboardRange({ from: '2026-11-01', to: '2026-11-07' });
const viewer = { id: 'owner', role: 'superadmin' };
const order = (id, extra = {}) => ({ _id: id, customerName: 'Customer', phone: '01712345678', status: 'Pending', paymentStatus: 'Unpaid', createdAt: '2026-11-01T10:00:00Z', totalAmount: 1000, items: [], ...extra });
const build = data => dashboardMetrics({ viewer, range, ...data });

test('equal comparison periods use Bangladesh calendar days', () => {
  assert.equal(range.previousFrom, '2026-10-25');
  assert.equal(range.previousTo, '2026-10-31');
  assert.equal(dashboardRange({ from: '2026-11-01', to: '2026-11-01' }).days, 1);
  assert.equal(dashboardRange({}, new Date('2026-10-31T20:00:00Z')).to, '2026-11-01');
  for (const query of [{ from: '2026-02-30', to: '2026-03-01' }, { from: '2026-11-07', to: '2026-11-01' }, { from: '2024-01-01', to: '2026-01-01' }]) assert.throws(() => dashboardRange(query));
});
test('collections follow payment ledger dates, not the order creation date', () => {
  const result = build({ orders: [order('old', { createdAt: '2026-10-01', paymentStatus: 'Partial', amountPaid: 300 })], ledger: [{ _id: 'payment', orderId: 'old', adminId: 'owner', amount: 300, type: 'collection', createdAt: '2026-11-03T20:00:00Z' }] });
  assert.equal(result.current.orders, 0);
  assert.equal(result.current.collections, 300);
  assert.equal(result.trend.find(point => point.date === '2026-11-04').collections, 300);
  assert.equal(result.previous.collections, 0);
  assert.equal(result.activity[0].type, 'Collection');
});
test('completed sales and collections are separate; canceled orders do not inflate sales', () => {
  const result = build({ orders: [order('delivered', { status: 'Delivered', paymentStatus: 'Paid' }), order('paidPending', { paymentStatus: 'Paid' }), order('canceled', { status: 'Canceled', paymentStatus: 'Paid' })], ledger: [{ type: 'collection', adminId: 'owner', amount: 300, createdAt: '2026-11-01' }] });
  assert.equal(result.current.completedSales, 1000);
  assert.equal(result.current.orders, 2);
  assert.equal(result.current.collections, 300);
  assert.equal(result.current.deliveredRate, 50);
});
test('discounted product revenue allocates order discounts and excludes shipping', () => {
  const result = build({ orders: [order('a', { status: 'Delivered', paymentStatus: 'Paid', shippingCost: 120, totalAmount: 840, discountApplied: 80, items: [{ name: 'Oud', price: 500, finalItemPrice: 400, quantity: 2 }] })] });
  assert.equal(result.topProducts[0].revenue, 720);
  assert.equal(result.topProducts[0].units, 2);
});
test('legacy item discounts are used when final unit prices are absent', () => {
  const result = build({ orders: [order('a', { status: 'Delivered', paymentStatus: 'Paid', items: [{ name: 'Oud', price: 500, discountType: 'percentage', discountValue: 20, quantity: 2 }] })] });
  assert.equal(result.topProducts[0].revenue, 800);
});
test('stock alerts detect individual sizes even when the product total is high', () => {
  const result = build({ products: [{ _id: 'p', name: 'Oud', stock: 102, variants: [{ label: '3ml', price: 200, stock: 2 }, { label: '6ml', price: 400, stock: 0 }, { label: '12ml', price: 700, stock: 100 }] }] });
  assert.equal(result.snapshot.lowStock.length, 1);
  assert.equal(result.snapshot.outOfStock.length, 1);
  assert.equal(result.snapshot.stockUnits, 102);
  assert.equal(result.snapshot.retailStockValue, 70400);
});

test('deleted products cannot inflate available units, retail value, or stock alerts', () => {
  const result = build({ products: [
    { _id: 'active', name: 'Active fragrance', stock: 4, price: 200 },
    { _id: 'deleted', name: 'Removed fragrance', isDeleted: true, stock: 290, price: 500 },
    { _id: 'deleted-sizes', name: 'Removed sizes', isDeleted: true, stock: 100, variants: [{ label: '3ml', stock: 100, price: 100 }, { label: '6ml', stock: 0, price: 200 }] },
  ] });
  assert.equal(result.snapshot.stockUnits, 4);
  assert.equal(result.snapshot.retailStockValue, 800);
  assert.deepEqual(result.snapshot.lowStock.map(item => item.id), ['active']);
  assert.equal(result.snapshot.outOfStock.length, 0);
});

test('variant quantities replace the parent total rather than being counted twice', () => {
  const result = build({ products: [{ _id: 'sizes', name: 'Fragrance', stock: 10, variants: [{ label: '3ml', stock: 4, price: 200 }, { label: '6ml', stock: 6, price: 400 }] }] });
  assert.equal(result.snapshot.stockUnits, 10);
});
test('customers normalize phone formats and outstanding amounts subtract installments', () => {
  const result = build({ orders: [order('a', { paymentStatus: 'Partial', amountPaid: 300, status: 'Delivered' }), order('b', { phone: '+8801712345678', paymentStatus: 'Paid' }), order('c', { status: 'Canceled' })] });
  assert.equal(result.snapshot.customers, 1);
  assert.equal(result.snapshot.customerDue, 700);
  assert.equal(result.attention.find(item => item.path.includes('due=1')).count, 1);
});
test('admin balances, superadmin holding, expenses and invested capital stay distinct', () => {
  const result = build({ admins: [{ _id: 'owner', role: 'superadmin', name: 'Owner' }, { _id: 'admin', role: 'admin', name: 'Admin' }],
    ledger: [{ adminId: 'admin', type: 'collection', amount: 500 }, { adminId: 'admin', type: 'settlement', amount: 200 }, { adminId: 'owner', type: 'collection', amount: 100 }, { adminId: 'owner', type: 'received_from_admin', amount: 200 }, { adminId: 'owner', type: 'vault_transfer', amount: 50 }], expenses: [{ amount: 80 }], investors: [{ totalAmount: 1000 }],
  });
  assert.equal(result.snapshot.adminHeld, 300);
  assert.equal(result.snapshot.myHolding, 250);
  assert.equal(result.snapshot.vault, 50);
  assert.equal(result.snapshot.netCapital, 1000);
  assert.equal(result.snapshot.allExpenses, 80);
});
test('regular admins see their own collection and settlement metrics', () => {
  const result = build({ viewer: { id: 'admin', role: 'admin' }, ledger: [{ adminId: 'admin', type: 'collection', amount: 100, createdAt: '2026-11-01' }, { adminId: 'other', type: 'collection', amount: 500, createdAt: '2026-11-01' }], expenses: [{ amount: 80, date: '2026-11-01' }], investors: [{ totalAmount: 1000 }] });
  assert.equal(result.current.collections, 100);
  assert.equal(result.snapshot.myOutstanding, 100);
  assert.equal(result.snapshot.netCapital, 1000);
  assert.equal(result.current.expenses, 0);
  assert.equal(result.adminBalances.length, 0);
});
test('missing collection records are flagged without inventing payment dates', () => {
  const result = build({ orders: [order('a', { paymentStatus: 'Paid' })] });
  assert.equal(result.collectionCoverage, 1);
  assert.equal(result.current.collections, 0);
});

test('current balance restores all-time payments plus net capital less expenses without counting transfers twice', () => {
  const result = build({ orders: [order('paid', { paymentStatus: 'Paid', createdAt: '2026-01-01' }), order('partial', { paymentStatus: 'Partial', amountPaid: 300 }), order('canceled', { paymentStatus: 'Paid', status: 'Canceled' })],
    investors: [{ totalAmount: 500 }], expenses: [{ amount: 200 }],
    ledger: [{ type: 'received_from_admin', amount: 300 }, { type: 'vault_transfer', amount: 100 }],
  });
  assert.equal(result.snapshot.recordedCustomerPayments, 1300);
  assert.equal(result.snapshot.currentBalance, 1600);
  assert.equal(result.current.collections, 0);
});

test('all admins see the same business balance and breakdown, including negative balances', () => {
  assert.equal(build({ expenses: [{ amount: 200 }] }).snapshot.currentBalance, -200);
  const data = { orders: [order('paid', { paymentStatus: 'Paid' }), order('partial', { amountPaid: 300 })], investors: [{ totalAmount: 500 }], expenses: [{ amount: 1900 }] };
  const owner = build(data);
  const admin = build({ ...data, viewer: { id: 'admin', role: 'admin' } });
  for (const key of ['currentBalance', 'recordedCustomerPayments', 'netCapital', 'allExpenses']) assert.equal(admin.snapshot[key], owner.snapshot[key]);
  assert.equal(admin.snapshot.currentBalance, -100);
  assert.equal(admin.snapshot.recordedCustomerPayments, 1300);
  assert.equal(admin.snapshot.netCapital, 500);
  assert.equal(admin.snapshot.allExpenses, 1900);
  assert.equal(admin.snapshot.adminHeld, null);
  assert.equal(admin.snapshot.myHolding, null);
  assert.equal(admin.snapshot.vault, null);
});

test('superadmin collections include dated receipts when the ledger has no collection entry', () => {
  const orders = [order('old-paid', { createdAt: '2026-01-01', paymentStatus: 'Paid', paymentReceivedAt: '2026-11-02T09:00:00Z', paymentReceivedBy: { adminId: 'admin', adminName: 'Staff' } }),
    order('partial', { paymentStatus: 'Partial', amountPaid: 300, partialPayments: [{ amount: 100, paidAt: '2026-11-03T09:00:00Z', receivedBy: { adminId: 'admin' } }, { amount: 200, paidAt: '2026-10-29T09:00:00Z', receivedBy: { adminId: 'other' } }] })];
  const result = build({ orders, resetAt: '2026-11-01T00:00:00Z' });
  assert.equal(result.current.collections, 1100);
  assert.equal(result.previous.collections, 200);
  assert.equal(result.trend.find(point => point.date === '2026-11-02').collections, 1000);
  assert.equal(result.snapshot.myCollected, 0);
  assert.equal(result.snapshot.myOutstanding, 0);
  assert.equal(result.activity.find(entry => entry.type === 'Collection').path, '/admin/order-list?order=partial');
});

test('saved receipts never duplicate existing ledger collections, including partially covered orders', () => {
  const result = build({ orders: [order('a', { paymentStatus: 'Paid', paymentReceivedAt: '2026-11-01', partialPayments: [{ amount: 1000, paidAt: '2026-11-01' }] })],
    ledger: [{ orderId: 'a', type: 'collection', amount: 300, createdAt: '2026-11-02', adminId: 'admin' }] });
  assert.equal(result.current.collections, 300);
});

test('regular admins only receive their own dated receipt fallback', () => {
  const result = build({ viewer: { id: 'admin', role: 'admin' }, orders: [order('a', { partialPayments: [
    { amount: 100, paidAt: '2026-11-01', receivedBy: { adminId: 'admin' }, recordedBy: { adminId: 'other' } },
    { amount: 500, paidAt: '2026-11-01', receivedBy: { adminId: 'other' }, recordedBy: { adminId: 'admin' } },
  ] })] });
  assert.equal(result.current.collections, 100);
  assert.equal(result.snapshot.myOutstanding, 0);
});

test('undated and canceled receipts cannot inflate dated collections', () => {
  const result = build({ orders: [order('undated', { paymentStatus: 'Paid' }), order('invalid', { paymentStatus: 'Paid', paymentReceivedAt: 'invalid' }),
    order('cancel', { status: 'Canceled', paymentStatus: 'Paid', paymentReceivedAt: '2026-11-01' })] });
  assert.equal(result.current.collections, 0);
  assert.equal(result.snapshot.recordedCustomerPayments, 2000);
});
