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

function fixture(t, role = 'admin') {
  const recorder = { id: new mongoose.Types.ObjectId().toString(), name: 'Recording admin' };
  const receiver = { _id: new mongoose.Types.ObjectId(), name: 'Selected receiver', role };
  const entries = [];
  const order = { _id: new mongoose.Types.ObjectId(), totalAmount: 1000, amountPaid: 0,
    paymentStatus: 'Unpaid', status: 'Pending', partialPayments: [],
    save: async () => order, markModified: () => {},
  };
  t.mock.method(mongoose, 'startSession', async () => ({ startTransaction() {}, abortTransaction: async () => {}, commitTransaction: async () => {}, endSession() {} }));
  t.mock.method(Order, 'findById', () => ({ session: async () => order }));
  t.mock.method(Admin, 'findById', id => ({ session: async () => id.toString() === receiver._id.toString() ? receiver : null }));
  t.mock.method(Ledger, 'findOne', () => ({ session: async () => null }));
  t.mock.method(Ledger, 'create', async items => { const created = items.map(item => ({ ...item, _id: new mongoose.Types.ObjectId() })); entries.push(...created); return created; });
  t.mock.method(Log, 'create', async () => {});
  const settlements = t.mock.method(Settlement, 'create', async () => { throw new Error('Unexpected settlement request'); });
  return { recorder, receiver, entries, order, settlements };
}

function invoke(path, method, body, recorder, order) {
  const route = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route;
  return new Promise((resolve, reject) => {
    const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { resolve({ code: this.statusCode, data }); } };
    route.stack.at(-1).handle({ body, params: { id: order._id.toString() }, admin: recorder }, response, reject);
  });
}

for (const role of ['admin', 'superadmin']) {
  test(`partial collection credits selected ${role}, not recording admin`, async t => {
    const f = fixture(t, role);
    const result = await invoke('/:id/partial-payment', 'post', { amount: 300, receiverAdminId: f.receiver._id.toString(), method: 'Cash' }, f.recorder, f.order);
    assert.equal(result.code, 200, JSON.stringify(result.data));
    assert.equal(f.entries.length, 1);
    assert.equal(f.entries[0].adminId.toString(), f.receiver._id.toString());
    assert.notEqual(f.entries[0].adminId.toString(), f.recorder.id);
    assert.equal(f.entries[0].amount, 300);
    assert.equal(f.order.partialPayments[0].receivedBy.adminName, f.receiver.name);
    assert.equal(f.order.partialPayments[0].recordedBy.adminId, f.recorder.id);
    assert.equal(f.settlements.mock.callCount(), 0);
  });
}

test('marking paid credits superadmin directly without charging recording admin', async t => {
  const f = fixture(t, 'superadmin');
  const result = await invoke('/:id', 'put', { paymentStatus: 'Paid', paymentReceivedBy: { adminId: f.receiver._id.toString(), adminName: f.receiver.name } }, f.recorder, f.order);
  assert.equal(result.code, 200, JSON.stringify(result.data));
  assert.equal(f.entries.length, 1);
  assert.equal(f.entries[0].adminId.toString(), f.receiver._id.toString());
  assert.equal(f.entries[0].amount, 1000);
  assert.equal(f.settlements.mock.callCount(), 0);
});

test('assigning a receiver to a fully paid installment order does not move installments', async t => {
  const f = fixture(t, 'superadmin');
  f.order.paymentStatus = 'Paid';
  f.order.partialPayments = [{ amount: 1000, receivedBy: { adminId: f.recorder.id } }];
  const result = await invoke('/:id', 'put', { paymentReceivedBy: { adminId: f.receiver._id.toString() } }, f.recorder, f.order);
  assert.equal(result.code, 200);
  assert.equal(f.entries.length, 0);
  assert.equal(f.order.partialPayments[0].receivedBy.adminId, f.recorder.id);
});

test('holding dashboard uses the logged-in superadmin and does not show their collections as payable', async t => {
  const settlementRouter = require('./settlementRoutes');
  const SystemConfig = require('../models/SystemConfig');
  const viewer = { _id: new mongoose.Types.ObjectId(), name: 'Current superadmin', role: 'superadmin' };
  const other = { _id: new mongoose.Types.ObjectId(), name: 'Other superadmin', role: 'superadmin' };
  let holdingAdminId;
  t.mock.method(Admin, 'find', () => ({ select: async () => [other, viewer] }));
  t.mock.method(Order, 'find', async () => []);
  t.mock.method(Ledger, 'distinct', async () => []);
  t.mock.method(SystemConfig, 'findOne', async query => query.key === 'ledgerResetAt' ? null : { value: 0 });
  t.mock.method(Settlement, 'aggregate', async () => []);
  t.mock.method(Settlement, 'countDocuments', async () => 0);
  t.mock.method(Ledger, 'aggregate', async pipeline => {
    if (pipeline[0].$match?.adminId) {
      holdingAdminId = pipeline[0].$match.adminId.toString();
      return [{ totalIn: 300, totalOut: 0 }];
    }
    if (pipeline[0].$group?._id === '$adminId') return [{ _id: viewer._id, totalCollected: 300, totalSettled: 0, totalAdjustments: 0, orderCount: 1 }];
    return [];
  });
  const route = settlementRouter.stack.find(layer => layer.route?.path === '/dashboard').route;
  const data = await new Promise((resolve, reject) => {
    route.stack.at(-1).handle({ admin: { id: viewer._id.toString(), role: viewer.role } }, { json: resolve }, reject);
  });
  assert.equal(holdingAdminId, viewer._id.toString());
  assert.equal(data.superadminHolding, 300);
  assert.equal(data.admins.find(admin => admin.adminId.equals(viewer._id)).outstandingBalance, 0);
});
