import test from 'node:test';
import assert from 'node:assert/strict';
import { editItemStockLimit, editStockAvailable, editStockError } from './editOrderStock.js';
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

test('quantity limits account for other rows and reserved units', () => {
  assert.equal(editItemStockLimit(order, perfumes, [item(1), item(2)], 0), 2);
  assert.equal(editItemStockLimit(order, perfumes, [item(4), item(1)], 1), 0);
  assert.equal(editItemStockLimit({ ...order, items: [] }, perfumes, [item(1)], 0), 3);
  assert.equal(editItemStockLimit(order, [], [item(1)], 0), 0);
});

test('unknown stock cannot bypass stock validation', () => {
  for (const stock of [undefined, 'invalid', -1, 1.5]) {
    const products = [{ _id: 'p', stock }];
    assert.equal(editStockAvailable(order, products, 'p'), 1);
    assert.match(editStockError(order, products, [item(2)]), /only has 1/);
  }
});
