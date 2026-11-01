const test = require('node:test');
const assert = require('node:assert/strict');
const sync = require('./syncPaymentLedger');

const installment = (amount, adminId = 'admin-a', paidAt = '2026-11-01T10:00:00Z') => ({ amount, recordedBy: { adminId, adminName: adminId }, paidAt });
function fixture({ payments, entries = [], resetAt = null, paid = false }) {
  const ledger = [...entries];
  const order = { _id: 'order-123456', totalAmount: 1000, amountPaid: payments.reduce((sum, payment) => sum + payment.amount, 0), partialPayments: payments };
  let paidQuery;
  const dependencies = {
    PaymentLedger: {
      distinct: async () => ledger.map(entry => entry.orderId),
      find: async () => ledger.filter(entry => entry.orderId === order._id && entry.type === 'collection'),
      insertMany: async entries => { ledger.push(...entries); },
    },
    SystemConfig: { findOne: async () => resetAt ? { value: resetAt } : null },
    Admin: { find: () => ({ select: async () => ['admin-a', 'admin-b'].map(id => ({ _id: id, name: id, role: 'admin' })) }) },
    Order: { find: async filter => {
      if (filter.paymentStatus) { paidQuery = filter; return paid && !filter['partialPayments.0'] ? [order] : []; }
      return [order];
    } },
  };
  return { dependencies, ledger, getPaidQuery: () => paidQuery };
}

test('missing installments sync even when there are no unsynced fully paid orders', async () => {
  const f = fixture({ payments: [installment(300)] });
  await sync(f.dependencies);
  assert.equal(f.ledger.length, 1);
  assert.equal(f.ledger[0].amount, 300);
  assert.equal(f.ledger[0].adminId, 'admin-a');
});

test('refreshes only recover the missing amount and do not duplicate collections', async () => {
  const f = fixture({ payments: [installment(200), installment(300)], entries: [{ orderId: 'order-123456', type: 'collection', adminId: 'admin-a', amount: 200 }] });
  await sync(f.dependencies);
  await sync(f.dependencies);
  assert.deepEqual(f.ledger.map(entry => entry.amount), [200, 300]);
});

test('fully paid installment orders are excluded from full-order backfill', async () => {
  const f = fixture({ paid: true, payments: [installment(400), installment(600)] });
  await sync(f.dependencies);
  assert.deepEqual(f.getPaidQuery()['partialPayments.0'], { $exists: false });
  assert.equal(f.ledger.reduce((sum, entry) => sum + entry.amount, 0), 1000);
});

test('collections remain attributed to each collecting admin', async () => {
  const f = fixture({ payments: [installment(200, 'admin-a'), installment(300, 'admin-b')] });
  await sync(f.dependencies);
  assert.deepEqual(f.ledger.map(entry => [entry.adminId, entry.amount]), [['admin-a', 200], ['admin-b', 300]]);
});

test('ledger resets do not restore pre-reset installments', async () => {
  const f = fixture({ resetAt: '2026-11-01T00:00:00Z', payments: [installment(200, 'admin-a', '2026-10-31T10:00:00Z'), installment(300)] });
  await sync(f.dependencies);
  assert.equal(f.ledger.length, 1);
  assert.equal(f.ledger[0].amount, 300);
});

test('simultaneous dashboard and balance requests share reconciliation', async () => {
  const f = fixture({ payments: [installment(300)] });
  await Promise.all([sync(f.dependencies), sync(f.dependencies)]);
  assert.equal(f.ledger.length, 1);
});

test('selected receiver gets the collection even when another admin recorded it', async () => {
  const payment = installment(300, 'admin-a');
  payment.receivedBy = { adminId: 'admin-b', adminName: 'Receiving Admin' };
  const f = fixture({ payments: [payment] });
  await sync(f.dependencies);
  assert.equal(f.ledger[0].adminId, 'admin-b');
  assert.equal(f.ledger[0].adminName, 'Receiving Admin');
  await sync(f.dependencies);
  assert.equal(f.ledger.length, 1);
});

test('receiver metadata and exact collection reference survive order schema casting', () => {
  const mongoose = require('mongoose');
  const Order = require('../models/Order');
  const recorderId = new mongoose.Types.ObjectId();
  const receiverId = new mongoose.Types.ObjectId();
  const ledgerId = new mongoose.Types.ObjectId();
  const order = new Order({ partialPayments: [{ amount: 300,
    recordedBy: { adminId: recorderId, adminName: 'Recorder' },
    receivedBy: { adminId: receiverId, adminName: 'Receiver' },
    ledgerEntryId: ledgerId,
  }] });
  const payment = order.partialPayments[0];
  assert.equal(payment.receivedBy.adminId.toString(), receiverId.toString());
  assert.equal(payment.recordedBy.adminId.toString(), recorderId.toString());
  assert.equal(payment.ledgerEntryId.toString(), ledgerId.toString());
});
