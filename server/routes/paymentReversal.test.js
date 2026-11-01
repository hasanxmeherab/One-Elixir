const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
process.env.RESEND_API_KEY ||= 're_local_test_placeholder';
const router = require('./orderRoutes');
const Order = require('../models/Order');
const Admin = require('../models/Admin');
const Ledger = require('../models/PaymentLedger');
const Settlement = require('../models/Settlement');
const Log = require('../models/Log');

function fixture(t, role = 'superadmin') {
  const receiver = { _id: new mongoose.Types.ObjectId(), name: 'Receiver', role };
  const order = { _id: new mongoose.Types.ObjectId(), totalAmount: 1000, amountPaid: 1000, amountDue: 0,
    status: 'Pending', paymentStatus: 'Paid', partialPayments: [],
    paymentReceivedAt: new Date(), paymentReceivedBy: { adminId: receiver._id, adminName: receiver.name },
    settlementStatus: role === 'superadmin' ? 'settled' : 'unsettled',
    paymentDetails: { amountPaid: 1000 }, markModified() {},
  };
  const entries = [{ _id: new mongoose.Types.ObjectId(), orderId: order._id, adminId: receiver._id, amount: 1000, type: 'collection' }];
  const session = { startTransaction() {}, commitTransaction: t.mock.fn(async () => {}), abortTransaction: t.mock.fn(async () => {}), endSession() {} };
  const saved = t.mock.fn(async () => order); order.save = saved;
  const inSession = data => ({ session: async token => { assert.equal(token, session); return data; } });
  t.mock.method(mongoose, 'startSession', async () => session);
  t.mock.method(Order, 'findById', () => inSession(order));
  t.mock.method(Order, 'find', () => inSession([order]));
  t.mock.method(Admin, 'findById', () => inSession(receiver));
  t.mock.method(Log, 'create', async () => ({}));
  const matches = (entry, query) => Object.entries(query).every(([key, value]) => String(entry[key]) === String(value));
  t.mock.method(Ledger, 'find', query => inSession(entries.filter(entry => matches(entry, query))));
  t.mock.method(Ledger, 'findOne', query => inSession(entries.find(entry => matches(entry, query)) || null));
  t.mock.method(Ledger, 'create', async docs => { const created = docs.map(doc => ({ ...doc, _id: new mongoose.Types.ObjectId() })); entries.push(...created); return created; });
  t.mock.method(Ledger, 'aggregate', pipeline => {
    const own = entries.filter(entry => String(entry.adminId) === String(pipeline[0].$match.adminId));
    const incomingTypes = role === 'superadmin' ? ['collection', 'received_from_admin'] : ['collection', 'adjustment'];
    const outgoingType = role === 'superadmin' ? 'vault_transfer' : 'settlement';
    return inSession([{ incoming: own.filter(e => incomingTypes.includes(e.type)).reduce((s, e) => s + e.amount, 0), outgoing: own.filter(e => e.type === outgoingType).reduce((s, e) => s + e.amount, 0) }]);
  });
  let pending = 0;
  t.mock.method(Settlement, 'aggregate', () => inSession(pending ? [{ amount: pending }] : []));
  const deletion = t.mock.method(Ledger, 'deleteMany', query => ({ session: async token => {
    assert.equal(token, session);
    for (let i = entries.length - 1; i >= 0; i--) if (matches(entries[i], query)) entries.splice(i, 1);
  } }));
  const invoke = (body = { paymentStatus: 'Unpaid' }, bulk = false) => new Promise((resolve, reject) => {
    const route = router.stack.find(layer => layer.route?.path === (bulk ? '/bulk-update' : '/:id') && layer.route.methods.put).route;
    const response = { code: 200, status(code) { this.code = code; return this; }, json(data) { resolve({ code: this.code, data }); } };
    route.stack.at(-1).handle({ body: bulk ? { ...body, orderIds: [String(order._id)] } : body, params: { id: String(order._id) }, admin: { id: String(receiver._id), name: receiver.name } }, response, reject);
  });
  return { order, receiver, entries, session, saved, deletion, invoke, setPending(amount) { pending = amount; } };
}

for (const role of ['admin', 'superadmin']) {
  test(`Paid to Unpaid removes the ${role} collection and resets all payment totals`, async t => {
    const f = fixture(t, role);
    const result = await f.invoke();
    assert.equal(result.code, 200, JSON.stringify(result.data));
    assert.equal(f.entries.length, 0);
    assert.equal(f.order.paymentStatus, 'Unpaid');
    assert.equal(f.order.amountPaid, 0); assert.equal(f.order.amountDue, 1000);
    assert.equal(f.order.paymentDetails.amountPaid, 0);
    assert.equal(f.order.paymentReceivedBy, undefined); assert.equal(f.order.paymentReceivedAt, null);
    assert.equal(f.order.settlementStatus, null);
    assert.equal(f.session.commitTransaction.mock.callCount(), 1);
  });
}
test('re-saving a legacy unpaid order removes stale collections and is idempotent', async t => {
  const f = fixture(t); f.order.paymentStatus = 'Unpaid';
  f.entries.push({ ...f.entries[0], _id: new mongoose.Types.ObjectId() });
  assert.equal((await f.invoke()).code, 200);
  assert.equal(f.entries.length, 0);
  assert.equal((await f.invoke()).code, 200);
  assert.equal(f.entries.length, 0);
});
test('reversal preserves unrelated collections and vault movements', async t => {
  const f = fixture(t);
  const other = { orderId: new mongoose.Types.ObjectId(), adminId: f.receiver._id, type: 'collection', amount: 500 };
  const vault = { adminId: f.receiver._id, type: 'vault_transfer', amount: 500 };
  f.entries.push(other, vault);
  assert.equal((await f.invoke()).code, 200);
  assert.deepEqual(f.entries, [other, vault]);
});
test('actual confirmed settlements and insufficient holding block reversal without deleting money records', async t => {
  const f = fixture(t);
  f.order.settlementRef = new mongoose.Types.ObjectId();
  assert.equal((await f.invoke()).code, 400);
  f.order.settlementRef = null; f.order.paymentStatus = 'Paid';
  f.entries.push({ adminId: f.receiver._id, type: 'vault_transfer', amount: 1000 });
  const result = await f.invoke();
  assert.equal(result.code, 400); assert.match(result.data.message, /vault transfers/);
  assert.equal(f.deletion.mock.callCount(), 0);
  assert.equal(f.saved.mock.callCount(), 0);
  assert.equal(f.session.abortTransaction.mock.callCount(), 2);
});
test('recorded installments require explicit payment history corrections', async t => {
  const f = fixture(t); f.order.partialPayments = [{ amount: 1000 }];
  const result = await f.invoke();
  assert.equal(result.code, 400); assert.match(result.data.message, /installments/);
  assert.equal(f.deletion.mock.callCount(), 0);
});
test('a pending request cannot be left overdrawn by a collection correction', async t => {
  const f = fixture(t, 'admin'); f.setPending(500);
  const result = await f.invoke();
  assert.equal(result.code, 400); assert.match(result.data.message, /pending settlement/);
  assert.equal(f.deletion.mock.callCount(), 0);
});
test('bulk Unpaid uses the same collection reversal and transaction', async t => {
  const f = fixture(t);
  assert.equal((await f.invoke({ paymentStatus: 'Unpaid' }, true)).code, 200);
  assert.equal(f.entries.length, 0);
  assert.equal(f.order.amountPaid, 0);
  assert.equal(f.session.commitTransaction.mock.callCount(), 1);
});
test('Paid, Unpaid, then Paid again creates one fresh collection', async t => {
  const f = fixture(t);
  assert.equal((await f.invoke()).code, 200);
  const result = await f.invoke({ paymentStatus: 'Paid', paymentReceivedBy: { adminId: String(f.receiver._id) } });
  assert.equal(result.code, 200, JSON.stringify(result.data));
  assert.equal(f.entries.length, 1);
  assert.equal(f.entries[0].amount, 1000);
  assert.equal(f.order.amountPaid, 1000);
  assert.equal(f.order.amountDue, 0);
});

test('explicit legacy correction reports the exact amount removed and zero on retry', async t => {
  const f = fixture(t); f.order.paymentStatus = 'Unpaid';
  const body = { paymentStatus: 'Unpaid', correctUnpaidCollection: true };
  const first = await f.invoke(body);
  assert.equal(first.code, 200);
  assert.deepEqual(first.data.collectionCorrection, { entryCount: 1, amount: 1000 });
  assert.equal(first.data.order.paymentStatus, 'Unpaid');
  const second = await f.invoke(body);
  assert.deepEqual(second.data.collectionCorrection, { entryCount: 0, amount: 0 });
});
