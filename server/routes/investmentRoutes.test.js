const { test } = require('node:test');
const assert = require('node:assert/strict');
const router = require('./investmentRoutes');
const Investment = require('../models/Investment');
const Log = require('../models/Log');
const input = require('../utils/investmentInput');

function add(body) {
  const route = router.stack.find(layer => layer.route?.path === '/add').route;
  return new Promise((resolve, reject) => {
    const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { resolve({ code: this.code, data }); } };
    const req = { body, admin: {} };
    route.stack[1].handle(req, res, () => { Promise.resolve(route.stack[2].handle(req, res)).catch(reject); });
  });
}
test('names are trimmed and regex symbols are treated literally', () => {
  const result = input({ investorName: ' A+B (Partners) ', amount: 100, date: '2026-11-01' });
  assert.equal(result.investorName, 'A+B (Partners)');
  assert.ok(result.namePattern.test('a+b (partners)'));
  assert.equal(result.namePattern.test('AAAB Partners'), false);
});
test('blank names, invalid dates, and non-finite or sub-cent amounts are rejected', () => {
  for (const body of [{ investorName: ' ', amount: 100 }, { investorName: 'A', amount: Infinity }, { investorName: 'A', amount: 0.001 }, { investorName: 'A', amount: 100, date: 'invalid' }]) assert.throws(() => input(body));
});
test('a new investor is created without a zero-value transaction', async t => {
  t.mock.method(Investment, 'findOne', async () => null);
  t.mock.method(Investment.prototype, 'save', async function () { return this; });
  t.mock.method(Log, 'create', async () => {});
  const response = await add({ investorName: 'Amina', amount: 0 });
  assert.equal(response.code, 201);
  assert.equal(response.data.totalAmount, 0);
  assert.equal(response.data.transactions.length, 0);
});
test('creating an existing account does not add a fake transaction', async t => {
  const investor = { transactions: [] };
  t.mock.method(Investment, 'findOne', async () => investor);
  const response = await add({ investorName: 'Amina', amount: 0 });
  assert.equal(response.code, 409);
  assert.equal(investor.transactions.length, 0);
});
test('a withdrawal keeps its sign and reduces recorded capital', async t => {
  const investor = { transactions: [], totalAmount: 1000, save: async () => {} };
  t.mock.method(Investment, 'findOne', async () => investor);
  t.mock.method(Log, 'create', async () => {});
  const response = await add({ investorName: 'Amina', amount: -200, note: 'Capital returned', date: '2026-11-01' });
  assert.equal(response.code, 200);
  assert.equal(investor.totalAmount, 800);
  assert.equal(investor.transactions[0].amount, -200);
  assert.equal(investor.transactions[0].note, 'Capital returned');
});

test('removing a withdrawal restores its amount to the investor balance', async t => {
  let removed;
  const investor = { investorName: 'Amina', totalAmount: 800,
    transactions: { id: () => ({ amount: -200 }), pull: id => { removed = id; } }, save: async () => {},
  };
  t.mock.method(Investment, 'findById', async () => investor);
  t.mock.method(Log, 'create', async () => {});
  const route = router.stack.find(layer => layer.route?.path === '/:investorId/transaction/:transactionId').route;
  const response = await new Promise((resolve, reject) => {
    const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { resolve({ code: this.code, data }); } };
    Promise.resolve(route.stack[1].handle({ params: { investorId: 'a', transactionId: 't' }, admin: {} }, res)).catch(reject);
  });
  assert.equal(response.code, 200);
  assert.equal(investor.totalAmount, 1000);
  assert.equal(removed, 't');
});
