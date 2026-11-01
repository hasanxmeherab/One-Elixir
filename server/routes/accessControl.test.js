const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
process.env.JWT_SECRET ||= 'access-test-secret';
process.env.JWT_REFRESH_SECRET ||= 'access-test-refresh-secret';
process.env.RESEND_API_KEY ||= 're_test_placeholder';
const Admin = require('../models/Admin');
const User = require('../models/User');
const Order = require('../models/Order');
const Perfume = require('../models/Perfume');
const Review = require('../models/Review');
const CostRecord = require('../models/CostRecord');
const { Resend } = require('resend');
const { verifyAdmin, verifySuperadmin, verifyUser } = require('../middleware/authMiddleware');
const orders = require('./orderRoutes');
const reviews = require('./reviewRoutes');
const admins = require('./adminRoutes');
const id = '507f1f77bcf86cd799439011';
const otherId = '507f1f77bcf86cd799439012';
const productId = '507f1f77bcf86cd799439013';
const token = claims => jwt.sign({ id, ...claims }, process.env.JWT_SECRET, { expiresIn: '15m' });
const query = value => ({ select() { return this; }, lean: async () => value, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
function account(t, model, value) { return t.mock.method(model, 'findById', () => query(value)); }
function run(handlers, { authorization, body = {}, params = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = { headers: authorization ? { authorization: `Bearer ${authorization}` } : {}, body, params, query: {}, method: 'POST', path: '/' };
    const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { resolve({ code: this.code, data, req }); } };
    let i = 0;
    const next = err => {
      if (err) return reject(err);
      const handler = handlers[i++];
      if (!handler) return resolve({ code: 200, req });
      try { Promise.resolve(handler(req, res, next)).catch(reject); } catch (error) { reject(error); }
    };
    next();
  });
}
function stack(router, path, method = 'post') {
  return router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack.map(layer => layer.handle);
}
test('admin access rejects unsigned, expired and customer tokens before querying accounts', async t => {
  const lookup = account(t, Admin, null);
  for (const authorization of [undefined, token({ role: 'superadmin' }) + 'bad', token({}), jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: -1 })]) {
    assert.ok([401, 403].includes((await run([verifyAdmin], { authorization })).code));
  }
  assert.equal(lookup.mock.callCount(), 0);
});
test('deleted admin accounts are denied even with an unexpired signed token', async t => {
  account(t, Admin, null);
  assert.equal((await run([verifyAdmin], { authorization: token({ role: 'superadmin' }) })).code, 401);
});
test('current database role overrides a stale superadmin claim', async t => {
  account(t, Admin, { _id: id, role: 'admin', name: 'Current name' });
  const authorization = token({ role: 'superadmin', name: 'Old name' });
  assert.equal((await run([verifySuperadmin], { authorization })).code, 403);
  const regular = await run([verifyAdmin], { authorization });
  assert.equal(regular.req.admin.role, 'admin');
  assert.equal(regular.req.admin.name, 'Current name');
});
test('revoked admin sessions are rejected and existing version-zero sessions remain compatible', async t => {
  account(t, Admin, { _id: id, role: 'admin', sessionVersion: 1 });
  assert.equal((await run([verifyAdmin], { authorization: token({ role: 'admin' }) })).code, 401);
  assert.equal((await run([verifyAdmin], { authorization: token({ role: 'admin', sessionVersion: 1 }) })).code, 200);
});
test('customer middleware rejects admin tokens, missing customers, and unavailable identity storage', async t => {
  const lookup = account(t, User, null);
  assert.equal((await run([verifyUser], { authorization: token({ role: 'admin' }) })).code, 403);
  assert.equal(lookup.mock.callCount(), 0);
  assert.equal((await run([verifyUser], { authorization: token({}) })).code, 401);
  t.mock.method(User, 'findById', () => { throw new Error('Unavailable'); });
  assert.equal((await run([verifyUser], { authorization: token({}) })).code, 503);
});
test('checkout rejects anonymous requests before starting a transaction', async t => {
  const session = t.mock.method(mongoose, 'startSession', () => { throw new Error('Unexpected transaction'); });
  assert.equal((await run(stack(orders, '/'))).code, 401);
  assert.equal(session.mock.callCount(), 0);
});
test('checkout ignores forged customer email, account ID and payment status', async t => {
  account(t, User, { _id: id, email: 'actual@example.com', name: 'Actual customer', role: 'customer' });
  const session = { startTransaction() {}, commitTransaction: async () => {}, abortTransaction: async () => {}, inTransaction: () => true, endSession() {} };
  t.mock.method(mongoose, 'startSession', async () => session);
  t.mock.method(Perfume, 'find', filter => ({ session: async () => filter.stock ? [] : [{ _id: new mongoose.Types.ObjectId(productId), name: 'Oil', price: 300, stock: 5, variants: [] }] }));
  t.mock.method(Perfume, 'bulkWrite', async () => ({}));
  t.mock.method(CostRecord, 'find', () => ({ sort: async () => [] }));
  t.mock.method(Order.prototype, 'save', async function () { return this; });
  let email;
  t.mock.method(Object.getPrototypeOf(new Resend('re_test').emails), 'send', async data => { email = data.to; return {}; });
  const result = await run(stack(orders, '/'), { authorization: token({}), body: {
    customerName: 'Gift recipient', customerEmail: 'victim@example.com', customerId: otherId,
    phone: '01712345678', address: 'Address', district: 'Ashulia (Daffodil Area)', paymentMethod: 'Cash on Delivery',
    paymentStatus: 'Paid', items: [{ perfumeId: productId, quantity: 1 }],
  } });
  assert.equal(result.code, 201, JSON.stringify(result.data));
  assert.equal(result.data.customerEmail, 'actual@example.com');
  assert.equal(String(result.data.customerId), id);
  assert.equal(result.data.paymentStatus, 'Free Delivery');
  assert.equal(result.data.totalAmount, 300);
  assert.equal(email, 'actual@example.com');
});
// Rate limiting is unchanged; these tests exercise auth, validation and writes.
const reviewStack = () => stack(reviews, '/').filter((_, index) => index !== 1);
test('anonymous reviews are rejected before any review writes', async t => {
  const save = t.mock.method(Review.prototype, 'save', async () => { throw new Error('Unexpected write'); });
  assert.equal((await run(reviewStack())).code, 401);
  assert.equal(save.mock.callCount(), 0);
});
function reviewFixture(t, { duplicate = false, missingProduct = false } = {}) {
  account(t, User, { _id: id, name: 'Actual customer', email: 'actual@example.com', role: 'customer' });
  const session = { withTransaction: async task => task(), endSession() {} };
  t.mock.method(mongoose, 'startSession', async () => session);
  const lock = t.mock.method(User, 'updateOne', async (filter, update, options) => {
    assert.equal(filter._id, id); assert.equal(update.$inc.reviewWriteVersion, 1); assert.equal(options.session, session);
    return { matchedCount: 1 };
  });
  t.mock.method(Perfume, 'findOne', filter => ({ session: async () => { assert.equal(filter.isDeleted.$ne, true); return missingProduct ? null : { _id: productId }; } }));
  t.mock.method(Review, 'findOne', filter => ({ session: async () => { assert.deepEqual(filter, { perfumeId: productId, userId: id }); return duplicate ? {} : null; } }));
  const save = t.mock.method(Review.prototype, 'save', async function ({ session: token }) { assert.equal(token, session); return this; });
  return { lock, save };
}
test('reviews derive customer ID and name from the authenticated account', async t => {
  const { lock } = reviewFixture(t);
  const result = await run(reviewStack(), { authorization: token({}), body: { perfumeId: productId, userId: otherId, userName: 'Forged identity', rating: 5, comment: ' Great oil ' } });
  assert.equal(result.code, 201, JSON.stringify(result.data));
  assert.equal(String(result.data.userId), id); assert.equal(result.data.userName, 'Actual customer');
  assert.equal(result.data.comment, 'Great oil'); assert.equal(lock.mock.callCount(), 1);
});
test('duplicate reviews cannot bypass checks by omitting or changing submitted identity', async t => {
  const { save } = reviewFixture(t, { duplicate: true });
  for (const identity of [{}, { userId: otherId, userName: 'Someone else' }]) {
    assert.equal((await run(reviewStack(), { authorization: token({}), body: { ...identity, perfumeId: productId, rating: 5, comment: 'Nice' } })).code, 409);
  }
  assert.equal(save.mock.callCount(), 0);
});
test('reviews for deleted or missing products cannot be created', async t => {
  const { save } = reviewFixture(t, { missingProduct: true });
  assert.equal((await run(reviewStack(), { authorization: token({}), body: { perfumeId: productId, rating: 4, comment: 'Nice' } })).code, 404);
  assert.equal(save.mock.callCount(), 0);
});
test('logout invalidates admin access and refresh sessions', async t => {
  account(t, Admin, { _id: id, role: 'admin', sessionVersion: 0 });
  const update = t.mock.method(Admin, 'findByIdAndUpdate', async () => ({}));
  assert.equal((await run(stack(admins, '/logout'), { authorization: token({ role: 'admin' }) })).code, 200);
  assert.deepEqual(update.mock.calls[0].arguments[1], { $set: { refreshToken: null }, $inc: { sessionVersion: 1 } });
});
test('refresh rejects a token from before admin session revocation', async t => {
  t.mock.method(Admin, 'findById', async () => ({ _id: id, role: 'admin', refreshToken: 'present', sessionVersion: 1 }));
  const refreshToken = jwt.sign({ id, role: 'admin', sessionVersion: 0 }, process.env.JWT_REFRESH_SECRET);
  assert.equal((await run(stack(admins, '/refresh'), { body: { refreshToken } })).code, 403);
});

test('customer cancellation uses account ownership even if the email matches', async t => {
  account(t, User, { _id: id, email: 'actual@example.com', name: 'Customer', role: 'customer' });
  const session = { startTransaction() {}, abortTransaction: async () => {}, endSession() {} };
  t.mock.method(mongoose, 'startSession', async () => session);
  t.mock.method(Order, 'findById', () => ({ session: async () => ({ customerId: otherId, customerEmail: 'actual@example.com', status: 'Pending' }) }));
  const result = await run(stack(orders, '/:id/cancel', 'put'), { authorization: token({}), params: { id: productId } });
  assert.equal(result.code, 403);
});

test('an admin password change revokes previous access and refresh sessions', async t => {
  const bcrypt = require('bcryptjs');
  const admin = { _id: id, name: 'Staff', role: 'admin', sessionVersion: 3, password: 'old-hash', refreshToken: 'old-refresh', save: t.mock.fn(async () => {}) };
  account(t, Admin, admin);
  t.mock.method(bcrypt, 'compare', async () => true);
  t.mock.method(bcrypt, 'genSalt', async () => 'salt');
  t.mock.method(bcrypt, 'hash', async () => 'new-hash');
  t.mock.method(require('../models/Log'), 'create', async () => ({}));
  const result = await run(stack(admins, '/change-password'), { authorization: token({ role: 'admin', sessionVersion: 3 }), body: { currentPassword: 'old-password', newPassword: 'new-password' } });
  assert.equal(result.code, 200);
  assert.equal(admin.sessionVersion, 4);
  assert.equal(admin.refreshToken, null);
  assert.equal(admin.password, 'new-hash');
});
