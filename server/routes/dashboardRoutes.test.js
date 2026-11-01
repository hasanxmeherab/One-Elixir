const { test } = require('node:test');
const assert = require('node:assert/strict');
const router = require('./dashboardRoutes');
const Order = require('../models/Order');
const Perfume = require('../models/Perfume');
const Expense = require('../models/Expense');
const Investment = require('../models/Investment');
const Ledger = require('../models/PaymentLedger');
const Settlement = require('../models/Settlement');
const Admin = require('../models/Admin');
const SystemConfig = require('../models/SystemConfig');
const handler = router.stack.find(layer => layer.route?.path === '/').route.stack.at(-1).handle;
function invoke(viewer, query = { from: '2026-11-01', to: '2026-11-07' }) {
  return new Promise((resolve, reject) => {
    const res = { code: 200, set() {}, status(code) { this.code = code; return this; }, json(data) { resolve({ code: this.code, data }); } };
    Promise.resolve(handler({ admin: viewer, query }, res)).catch(reject);
  });
}
test('dashboard shares business summary while keeping ledger and settlements scoped to the viewer', async t => {
  const lean = () => ({ lean: async () => [] });
  t.mock.method(Order, 'find', lean); const productQuery = t.mock.method(Perfume, 'find', lean);
  let expenseProjection, investmentProjection;
  t.mock.method(Expense, 'find', () => ({ select(fields) { expenseProjection = fields; return { lean: async () => [{ amount: 200 }] }; } }));
  t.mock.method(Investment, 'find', () => ({ select(fields) { investmentProjection = fields; return { lean: async () => [{ totalAmount: 100 }] }; } }));
  const ledger = t.mock.method(Ledger, 'find', lean); const settlement = t.mock.method(Settlement, 'find', lean);
  t.mock.method(SystemConfig, 'findOne', () => ({ lean: async () => null }));
  const response = await invoke({ id: 'admin-a', role: 'admin' });
  assert.equal(response.code, 200);
  assert.deepEqual(productQuery.mock.calls[0].arguments[0], { isDeleted: { $ne: true } });
  assert.deepEqual(ledger.mock.calls[0].arguments[0], { adminId: 'admin-a' });
  assert.deepEqual(settlement.mock.calls[0].arguments[0], { status: 'pending', adminId: 'admin-a' });
  assert.equal(expenseProjection, 'amount'); assert.equal(investmentProjection, 'totalAmount');
  assert.equal(response.data.snapshot.currentBalance, -100);
  assert.equal(response.data.snapshot.allExpenses, 200);
  assert.equal(response.data.snapshot.netCapital, 100);
  assert.equal(response.data.current.expenses, 0);
  assert.deepEqual(response.data.adminBalances, []);
  assert.equal(response.data.snapshot.vault, null);
});
test('invalid ranges fail before any database queries', async t => {
  const find = t.mock.method(Order, 'find', () => { throw new Error('Unexpected query'); });
  assert.equal((await invoke({ id: 'a', role: 'admin' }, { from: '2026-11-07', to: '2026-11-01' })).code, 400);
  assert.equal(find.mock.callCount(), 0);
});
test('superadmin dashboard loads business data without exposing administrator credentials', async t => {
  const lean = () => ({ lean: async () => [] });
  for (const model of [Order, Perfume, Expense, Investment, Ledger, Settlement]) t.mock.method(model, 'find', lean);
  let projection;
  t.mock.method(Admin, 'find', () => ({ select(fields) { projection = fields; return { lean: async () => [] }; } }));
  t.mock.method(SystemConfig, 'findOne', () => ({ lean: async () => null }));
  const response = await invoke({ id: 'owner', role: 'superadmin' });
  assert.equal(response.code, 200);
  assert.equal(projection, '_id name role');
  assert.equal(response.data.isSuperadmin, true);
});
