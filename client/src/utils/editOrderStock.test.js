import test from 'node:test';
import assert from 'node:assert/strict';
import { editStockAvailable, editStockError } from './editOrderStock.js';
const perfumes = [{ _id: 'p', stock: 3 }];
const item = quantity => ({ perfumeId: 'p', name: 'Fragrance', quantity });
const order = { status: 'Pending', items: [item(1)] };

test('allows existing reserved stock plus remaining inventory', () => {
  assert.equal(editStockAvailable(order, perfumes, 'p'), 4);
  assert.equal(editStockError(order, perfumes, [item(4)]), null);
  assert.match(editStockError(order, perfumes, [item(5)]), /only has 4/);
});
test('new items cannot exceed three remaining units, including duplicate rows', () => {
  const emptyOrder = { status: 'Pending', items: [] };
  assert.equal(editStockError(emptyOrder, perfumes, [item(3)]), null);
  assert.match(editStockError(emptyOrder, perfumes, [item(4)]), /only has 3/);
  assert.match(editStockError(emptyOrder, perfumes, [item(2), item(2)]), /only has 3/);
});
test('cancelled orders have no reserved inventory', () => {
  assert.equal(editStockAvailable({ ...order, status: 'Cancelled' }, perfumes, 'p'), 3);
});
test('rejects invalid quantities and missing products', () => {
  for (const quantity of [0, -1, 1.5]) assert.match(editStockError(order, perfumes, [item(quantity)]), /whole numbers/);
  assert.match(editStockError(order, [], [item(1)]), /available product/);
});
