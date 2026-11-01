const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Coupon = require('../models/Coupon');
const Log = require('../models/Log');
const Ledger = require('../models/PaymentLedger');
const Settlement = require('../models/Settlement');
const Order = require('../models/Order');
const SystemConfig = require('../models/SystemConfig');
const { createCouponSchema } = require('../middleware/validate');
const adminRouter = require('./adminRoutes');
const couponRouter = require('./couponRoutes');
const logRouter = require('./logRoutes');
const settlementRouter = require('./settlementRoutes');
const id = '507f1f77bcf86cd799439011';
function invoke(router, path, method, role = 'superadmin', body = {}, query = {}) {
  const route = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route;
  const secret = process.env.JWT_SECRET || 'local-test-secret';
  process.env.JWT_SECRET = secret;
  return new Promise((resolve, reject) => {
    const req = { headers: { authorization: `Bearer ${jwt.sign({ id, role, name: 'Staff' }, secret)}` }, body, query, params: { id }, path, method: method.toUpperCase() };
    const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { resolve({ code: this.code, data }); } };
    let index = 0;
    const next = err => {
      if (err) return reject(err);
      const layer = route.stack[index++];
      if (!layer) return reject(new Error('No response'));
      try { Promise.resolve(layer.handle(req, res, next)).catch(reject); } catch (e) { reject(e); }
    };
    next();
  });
}
test('normal admins cannot register staff, including through a forged superadmin payload', async t => {
  const save = t.mock.method(Admin.prototype, 'save', () => { throw new Error('Unexpected write'); });
  const response = await invoke(adminRouter, '/register', 'post', 'admin', { name: 'New', email: 'new@example.com', password: 'secret1', role: 'superadmin' });
  assert.equal(response.code, 403);
  assert.equal(save.mock.callCount(), 0);
});
test('superadmin registration passes role guard and persists the intended regular account', async t => {
  t.mock.method(Log, 'create', async () => ({}));
  let saved;
  t.mock.method(Admin.prototype, 'save', async function () { saved = this; return this; });
  const response = await invoke(adminRouter, '/register', 'post', 'superadmin', { name: 'New', email: 'new@example.com', password: 'secret1' });
  assert.equal(response.code, 201);
  assert.equal(saved.role, 'admin');
  assert.equal(saved.mustChangePassword, true);
  assert.notEqual(saved.password, 'secret1');
});
test('coupon validation supports expiry/status and rejects discounts above 100 percent', () => {
  const coupon = { code: ' SAVE ', discountType: 'percentage', discountValue: 20, expiryDate: '2026-12-01T00:00:00.000Z', isActive: false };
  assert.equal(createCouponSchema.parse(coupon).code, 'SAVE');
  for (const discountValue of [0, -1, 101, Infinity, NaN]) assert.equal(createCouponSchema.safeParse({ ...coupon, discountValue }).success, false);
  assert.equal(createCouponSchema.safeParse({ ...coupon, discountType: 'fixed', discountValue: 500 }).success, true);
  assert.equal(createCouponSchema.safeParse({ ...coupon, expiryDate: 'invalid' }).success, false);
});
test('coupon update persists expiry, disabled state, and normalized code', async t => {
  t.mock.method(Log, 'create', async () => ({}));
  const update = t.mock.method(Coupon, 'findByIdAndUpdate', async (_, data) => ({ _id: id, ...data }));
  const response = await invoke(couponRouter, '/:id', 'put', 'admin', { code: ' save ', discountType: 'fixed', discountValue: 25, expiryDate: null, isActive: false });
  assert.equal(response.code, 200);
  assert.deepEqual(update.mock.calls[0].arguments[1], { code: 'SAVE', discountType: 'fixed', discountValue: 25, expiryDate: null, isActive: false });
  assert.equal(update.mock.calls[0].arguments[2].runValidators, true);
});
test('coupon editing handles a missing coupon without a write log', async t => {
  t.mock.method(Coupon, 'findByIdAndUpdate', async () => null);
  const log = t.mock.method(Log, 'create', async () => ({}));
  const result = await invoke(couponRouter, '/:id', 'put', 'admin', { code: 'SAVE', discountType: 'fixed', discountValue: 5 });
  assert.equal(result.code, 404);
  assert.equal(log.mock.callCount(), 0);
});
test('paginated logs filter in the database and return matching totals', async t => {
  let query, skipped, limit;
  t.mock.method(Log, 'find', filter => { query = filter; return { sort() { return this; }, skip(n) { skipped = n; return this; }, limit(n) { limit = n; return this; }, lean: async () => [{ action: 'LOGIN' }] }; });
  t.mock.method(Log, 'countDocuments', async () => 51);
  t.mock.method(Log, 'distinct', async () => ['LOGIN']);
  const response = await invoke(logRouter, '/', 'get', 'admin', {}, { page: '2', pageSize: '25', action: 'LOGIN', search: 'Staff' });
  assert.equal(response.data.total, 51); assert.equal(skipped, 25); assert.equal(limit, 25);
  assert.equal(query.action, 'LOGIN'); assert.equal(query.$or.length, 4);
});
test('normal admins cannot clear logs', async t => {
  const remove = t.mock.method(Log, 'deleteMany', () => { throw new Error('Unexpected deletion'); });
  assert.equal((await invoke(logRouter, '/', 'delete', 'admin')).code, 403);
  assert.equal(remove.mock.callCount(), 0);
});
test('money movement endpoints reject non-finite amounts before database access', async t => {
  const ledger = t.mock.method(Ledger, 'aggregate', () => { throw new Error('Unexpected query'); });
  for (const path of ['/request', '/direct-settle', '/vault-transfer']) {
    for (const amount of ['invalid', Infinity, -1, 0]) {
      const response = await invoke(settlementRouter, path, 'post', 'superadmin', { adminId: id, amount, paymentMethod: 'Cash' });
      assert.equal(response.code, 400, `${path} / ${amount}`);
    }
  }
  assert.equal(ledger.mock.callCount(), 0);
});
test('normal-admin balance includes all pending amounts and scopes both aggregations to self', async t => {
  t.mock.method(Ledger, 'distinct', async () => []);
  t.mock.method(Ledger, 'find', () => ({ select() { return this; }, lean: async () => [] }));
  t.mock.method(SystemConfig, 'findOne', async () => null);
  t.mock.method(Order, 'find', async () => []);
  t.mock.method(Admin, 'find', () => ({ select: async () => [] }));
  const ledger = t.mock.method(Ledger, 'aggregate', async () => [{ _id: id, totalCollected: 1000, totalSettled: 100, outstandingBalance: 900 }]);
  const pending = t.mock.method(Settlement, 'aggregate', async () => [{ _id: id, amount: 400 }]);
  const result = await invoke(settlementRouter, '/balances', 'get', 'admin');
  assert.equal(result.data[0].pendingAmount, 400);
  assert.equal(result.data[0].outstandingBalance, 900);
  assert.equal(String(ledger.mock.calls[0].arguments[0][0].$match.adminId), id);
  assert.equal(String(pending.mock.calls[0].arguments[0][0].$match.adminId), id);
  assert.equal(pending.mock.calls[0].arguments[0][0].$match.status, 'pending');
});
