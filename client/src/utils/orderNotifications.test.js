import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notificationKey, readNotifications, saveNotifications, unreadOrderNotifications, notificationOrderPath } from './orderNotifications.js';

const storage = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
test('notification read state belongs to one admin and survives reloading', () => {
  const store = storage();
  const first = notificationKey('admin-a');
  const second = notificationKey('admin-b');
  saveNotifications(store, first, new Set(['order-1']));
  assert.deepEqual([...readNotifications(store, first)], ['order-1']);
  assert.equal(readNotifications(store, second).size, 0);
  store.setItem('admin_seen_order_ids', '["order-2"]');
  assert.equal(readNotifications(store, second).size, 0);
});
test('empty or removed orders cannot leave ghost notifications', () => {
  const seen = new Set();
  assert.equal(unreadOrderNotifications([{ _id: 'old' }], seen).length, 1);
  assert.deepEqual(unreadOrderNotifications([], seen), []);
});
test('new unread orders sort newest first without mutating the order list', () => {
  const orders = [
    { _id: 'old', createdAt: '2026-10-01' }, { _id: 'read', createdAt: '2026-11-01' },
    { _id: 'new', createdAt: '2026-10-31' }, { _id: 'cancelled', status: 'Cancelled' },
    { _id: 'archived', status: 'Archived' },
  ];
  const before = structuredClone(orders);
  assert.deepEqual(unreadOrderNotifications(orders, new Set(['read'])).map(o => o._id), ['new', 'old']);
  assert.deepEqual(orders, before);
});
test('malformed local storage does not break the bell', () => {
  const store = storage();
  for (const value of ['wrong', '{}', 'null', '5']) {
    store.setItem('key', value);
    assert.equal(readNotifications(store, 'key').size, 0);
  }
  store.setItem('key', '["valid", null, 5, "valid"]');
  assert.deepEqual([...readNotifications(store, 'key')], ['valid']);
  assert.equal(saveNotifications({ setItem() { throw new Error('Quota exceeded'); } }, 'key', new Set()), false);
});
test('mark all read includes notifications beyond the visible dropdown limit and preserves future arrivals', () => {
  const store = storage();
  const orders = Array.from({ length: 45 }, (_, i) => ({ _id: `order-${i}` }));
  saveNotifications(store, 'key', new Set(orders.map(o => o._id)));
  const seen = readNotifications(store, 'key');
  assert.equal(unreadOrderNotifications(orders, seen).length, 0);
  assert.deepEqual(unreadOrderNotifications([...orders, { _id: 'new-arrival' }], seen).map(o => o._id), ['new-arrival']);
});
test('notification links open the exact order details', () => {
  assert.equal(notificationOrderPath('abc123'), '/admin/order-list?order=abc123');
  assert.equal(notificationOrderPath('a&b'), '/admin/order-list?order=a%26b');
});
