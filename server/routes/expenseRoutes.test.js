const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const router = require('./expenseRoutes');
const Expense = require('../models/Expense');
const Log = require('../models/Log');
const payload = require('../utils/expensePayload');
const valid = { title: ' Bottles ', amount: 100, category: 'Packaging', date: '2026-11-01' };

test('itemized expense totals are calculated on the server', () => {
  assert.equal(payload({ ...valid, quantity: 3, unitPrice: 15.5 }).amount, 46.5);
  assert.equal(payload(valid).title, 'Bottles');
});
test('invalid dates, incomplete calculations, zero and non-finite totals are rejected', () => {
  for (const change of [{ date: 'invalid' }, { quantity: 3 }, { amount: 0 }, { amount: Infinity }, { title: '  ' }]) assert.throws(() => payload({ ...valid, ...change }));
});
function update(body, id) {
  const route = router.stack.find(layer => layer.route?.path === '/:id' && layer.route.methods.put).route;
  return new Promise((resolve, reject) => {
    const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { resolve({ code: this.code, data }); } };
    const req = { body, params: { id }, admin: {} };
    route.stack[1].handle(req, res, () => { Promise.resolve(route.stack[2].handle(req, res)).catch(reject); });
  });
}
test('editing to a direct total removes previous quantity metadata and validates the update', async t => {
  const id = new mongoose.Types.ObjectId().toString();
  let savedUpdate;
  t.mock.method(Expense, 'findByIdAndUpdate', async (expenseId, change, options) => {
    assert.equal(expenseId, id); assert.equal(options.runValidators, true);
    savedUpdate = change;
    return { _id: id, ...change.$set };
  });
  t.mock.method(Log, 'create', async () => {});
  const response = await update(valid, id);
  assert.equal(response.code, 200);
  assert.deepEqual(savedUpdate.$unset, { quantity: '', unitPrice: '' });
  assert.equal(response.data.amount, 100);
});
test('invalid updates are rejected before writing', async t => {
  const write = t.mock.method(Expense, 'findByIdAndUpdate', async () => { throw new Error('Unexpected write'); });
  assert.equal((await update({ ...valid, amount: -10 }, new mongoose.Types.ObjectId().toString())).code, 400);
  assert.equal((await update(valid, 'bad-id')).code, 400);
  assert.equal(write.mock.callCount(), 0);
});
test('editing a missing expense returns not found', async t => {
  t.mock.method(Expense, 'findByIdAndUpdate', async () => null);
  assert.equal((await update(valid, new mongoose.Types.ObjectId().toString())).code, 404);
});
