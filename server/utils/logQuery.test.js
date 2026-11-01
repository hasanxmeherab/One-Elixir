const { test } = require('node:test');
const assert = require('node:assert/strict');
const { logQuery } = require('./logQuery');
test('log date boundaries include a whole Bangladesh calendar day', () => {
  const { filter } = logQuery({ from: '2026-11-01', to: '2026-11-01' });
  assert.equal(filter.createdAt.$gte.toISOString(), '2026-10-31T18:00:00.000Z');
  assert.equal(filter.createdAt.$lt.toISOString(), '2026-11-01T18:00:00.000Z');
});
test('log search treats regex punctuation as literal input', () => {
  const { filter } = logQuery({ search: 'a.*[b]$', action: 'UPDATE_COUPON' });
  const regex = new RegExp(filter.$or[0].adminName.$regex, 'i');
  assert.equal(regex.test('a.*[b]$'), true);
  assert.equal(regex.test('ab'), false);
  assert.equal(filter.action, 'UPDATE_COUPON');
});
test('log query rejects impossible and reversed dates', () => {
  for (const query of [{ from: '2026-02-30' }, { from: '2026-11-04', to: '2026-11-01' }, { to: 'invalid' }]) assert.throws(() => logQuery(query));
});
test('log pagination bounds page size and page number', () => {
  assert.equal(logQuery({ page: -2, pageSize: 100000 }).page, 1);
  assert.equal(logQuery({ pageSize: 100000 }).pageSize, 100);
});
