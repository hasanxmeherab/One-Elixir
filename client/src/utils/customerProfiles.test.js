import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCustomerPhone, buildCustomerProfiles, outstandingAmount } from './customerProfiles.js';

const order = (id, extra = {}) => ({ _id: id, customerName: 'Customer', phone: '01712345678', createdAt: '2026-11-01T08:00:00Z', totalAmount: 1000, paymentStatus: 'Unpaid', status: 'Pending', ...extra });
test('Bangladesh phone formats group together without altering other international numbers', () => {
  for (const phone of ['01712-345678', '+880 1712 345678', '00880 1712 345678']) assert.equal(normalizeCustomerPhone(phone), '01712345678');
  assert.equal(normalizeCustomerPhone('+44 7123 456789'), '447123456789');
  const profiles = buildCustomerProfiles([order('a'), order('b', { phone: '+8801712345678' })]);
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].repeatBuyer, true);
});
test('missing contacts do not merge unrelated orders', () => {
  assert.equal(buildCustomerProfiles([order('a', { phone: '' }), order('b', { phone: '' })]).length, 2);
});
test('completed spend, partial collections, and canceled balances remain separate', () => {
  const [profile] = buildCustomerProfiles([
    order('paid', { paymentStatus: 'Paid', status: 'Delivered', amountPaid: 1000 }),
    order('partial', { paymentStatus: 'Partial', amountPaid: 300 }),
    order('canceled', { status: 'Canceled', amountPaid: 100 }),
    order('cancelled', { status: 'Cancelled' }),
  ]);
  assert.equal(profile.totalSpent, 1000);
  assert.equal(profile.partialCollected, 300);
  assert.equal(profile.outstanding, 700);
  assert.equal(profile.orders.length, 4);
});
test('profile metadata uses newest available information without mutating input', () => {
  const orders = [order('old', { createdAt: '2026-10-01', address: 'Old address', customerEmail: 'customer@example.com' }), order('new', { customerName: 'New name', address: 'New address' })];
  const [profile] = buildCustomerProfiles(orders);
  assert.equal(profile.name, 'New name');
  assert.equal(profile.address, 'New address');
  assert.equal(profile.email, 'customer@example.com');
  assert.equal(profile.orders[0]._id, 'new');
  assert.equal(orders[0]._id, 'old');
});
test('installment history supplies missing collection totals and never creates negative due', () => {
  assert.equal(outstandingAmount(order('a', { amountPaid: 0, partialPayments: [{ amount: 300 }] })), 700);
  assert.equal(outstandingAmount(order('b', { amountPaid: 1200 })), 0);
});
test('a canceled second order does not classify someone as a repeat buyer', () => {
  const [profile] = buildCustomerProfiles([order('a'), order('b', { status: 'Canceled' })]);
  assert.equal(profile.repeatBuyer, false);
});
