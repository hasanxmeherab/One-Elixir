const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
process.env.RESEND_API_KEY ||= 're_local_test_placeholder';
const router = require('./orderRoutes');
const Order = require('../models/Order');
const Perfume = require('../models/Perfume');
const CostRecord = require('../models/CostRecord');
const Log = require('../models/Log');

function fixture(t, status = 'Pending') {
  const id = new mongoose.Types.ObjectId().toString();
  const otherId = new mongoose.Types.ObjectId().toString();
  const stocks = { [id]: 3, [otherId]: 3 };
  const batch = { _id: new mongoose.Types.ObjectId(), remainingBottles: 3, save: async () => {} };
  const order = { _id: new mongoose.Types.ObjectId(), status, paymentStatus: 'Unpaid',
    items: [{ perfumeId: id, name: 'Original', quantity: 1 }], batchDeductions: [],
    markModified() {}, save: async () => order };
  const initial = structuredClone(stocks);
  const abort = t.mock.fn(async () => { Object.assign(stocks, initial); batch.remainingBottles = 3; });
  const commit = t.mock.fn(async () => {});
  t.mock.method(mongoose, 'startSession', async () => ({ startTransaction() {}, abortTransaction: abort, commitTransaction: commit, endSession() {} }));
  t.mock.method(Order, 'findById', () => ({ session: async () => order }));
  t.mock.method(Perfume, 'find', query => ({ session: async () => query._id.$in.filter(pid => stocks[pid] !== undefined).map(pid => ({ _id: pid, name: 'Fragrance', stock: stocks[pid] })) }));
  t.mock.method(Perfume, 'bulkWrite', async ops => {
    let matchedCount = 0;
    for (const { updateOne: { filter, update } } of ops) {
      if (stocks[filter._id] !== undefined && (!filter.stock || stocks[filter._id] >= filter.stock.$gte)) {
        stocks[filter._id] += update.$inc.stock;
        matchedCount++;
      }
    }
    return { matchedCount };
  });
  t.mock.method(CostRecord, 'find', () => ({ sort: async () => [batch] }));
  t.mock.method(CostRecord, 'findByIdAndUpdate', async (_id, update) => { batch.remainingBottles += update.$inc.remainingBottles; });
  t.mock.method(Log, 'create', async () => {});
  const cacheDel = t.mock.fn();
  const invoke = body => new Promise((resolve, reject) => {
    const route = router.stack.find(layer => layer.route?.path === '/:id' && layer.route.methods.put).route;
    const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { resolve({ code: this.code, data }); } };
    route.stack.at(-1).handle({ body, params: { id: order._id.toString() }, admin: { name: 'Admin' }, app: { cacheDel } }, res, reject);
  });
  const item = (quantity, perfumeId = otherId) => ({ perfumeId, name: 'Fragrance', quantity });
  return { id, otherId, stocks, batch, order, abort, commit, cacheDel, invoke, item };
}

test('adding an item deducts product inventory and FIFO batches and invalidates cached stock', async t => {
  const f = fixture(t);
  const result = await f.invoke({ items: [...f.order.items, f.item(2)] });
  assert.equal(result.code, 200, JSON.stringify(result.data));
  assert.equal(f.stocks[f.id], 3);
  assert.equal(f.stocks[f.otherId], 1);
  assert.equal(f.order.batchDeductions.reduce((sum, d) => sum + d.qty, 0), 3);
  assert.equal(f.cacheDel.mock.calls[0].arguments[0], 'perfumes:');
});

for (const quantities of [[4], [2, 2]]) {
  test(`rejects ordering ${quantities.join('+')} units when only 3 remain`, async t => {
    const f = fixture(t);
    const result = await f.invoke({ items: [...f.order.items, ...quantities.map(q => f.item(q))] });
    assert.equal(result.code, 400);
    assert.match(result.data.message, /only has 3 units/);
    assert.equal(f.stocks[f.otherId], 3);
    assert.equal(f.stocks[f.id], 3);
    assert.equal(f.commit.mock.callCount(), 0);
    assert.equal(f.abort.mock.callCount(), 1);
    assert.equal(f.cacheDel.mock.callCount(), 0);
  });
}

test('existing reserved units are available when increasing quantity', async t => {
  const f = fixture(t);
  const result = await f.invoke({ items: [f.item(4, f.id)] });
  assert.equal(result.code, 200);
  assert.equal(f.stocks[f.id], 0);
});

test('removing an item restores its stock and cost batches', async t => {
  const f = fixture(t);
  f.order.batchDeductions = [{ batchId: f.batch._id, qty: 1 }];
  const result = await f.invoke({ items: [f.item(1)] });
  assert.equal(result.code, 200);
  assert.equal(f.stocks[f.id], 4);
  assert.equal(f.stocks[f.otherId], 2);
  assert.equal(f.batch.remainingBottles, 3);
});

test('unchanged items sent with cancellation restore inventory', async t => {
  const f = fixture(t);
  const result = await f.invoke({ items: f.order.items, status: 'Cancelled' });
  assert.equal(result.code, 200);
  assert.equal(f.stocks[f.id], 4);
  assert.deepEqual(f.order.batchDeductions, []);
});

test('reactivating a cancelled order enforces stock even when items are supplied', async t => {
  const f = fixture(t, 'Cancelled');
  const result = await f.invoke({ items: [f.item(4)], status: 'Pending' });
  assert.equal(result.code, 400);
  assert.equal(f.stocks[f.otherId], 3);
});

test('editing a cancelled order does not reserve inventory', async t => {
  const f = fixture(t, 'Cancelled');
  const result = await f.invoke({ items: [f.item(4)] });
  assert.equal(result.code, 200);
  assert.equal(f.stocks[f.otherId], 3);
});

for (const quantity of [0, -1, 1.5]) {
  test(`rejects invalid quantity ${quantity}`, async t => {
    const f = fixture(t);
    assert.equal((await f.invoke({ items: [f.item(quantity)] })).code, 400);
    assert.equal(f.stocks[f.otherId], 3);
  });
}

test('missing products cannot silently bypass stock deduction', async t => {
  const f = fixture(t);
  const result = await f.invoke({ items: [f.item(1, new mongoose.Types.ObjectId().toString())] });
  assert.equal(result.code, 400);
  assert.match(result.data.message, /no longer exists/);
});

test('stock writes that no longer match abort the entire order update', async t => {
  const f = fixture(t);
  t.mock.method(Perfume, 'bulkWrite', async () => ({ matchedCount: 0 }));
  const result = await f.invoke({ items: [f.item(2)] });
  assert.equal(result.code, 400);
  assert.match(result.data.message, /Stock changed/);
  assert.equal(f.commit.mock.callCount(), 0);
  assert.equal(f.abort.mock.callCount(), 1);
});
