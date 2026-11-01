import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCostBatch, costPercentages } from './costBatch.js';
const batch = () => ({ bottlesProduced: 10, sellingPrice: 150, ingredients: [{ name: 'Oil', qty: 50, cost: 1000 }], packaging: [] });
test('margin and markup use different denominators and preserve losses', () => {
  const positive = costPercentages(100, 150);
  assert.ok(Math.abs(positive.margin - 100 / 3) < 0.00001);
  assert.equal(positive.markup, 50);
  assert.deepEqual(costPercentages(100, 80), { margin: -25, markup: -20 });
  assert.equal(costPercentages(0, 100).markup, null);
  assert.equal(costPercentages(100, 0).margin, null);
});
test('batch validation accepts zero item cost and an unused packaging row', () => {
  const data = batch(); data.ingredients[0].cost = 0;
  data.packaging = [{ name: '', qty: '', cost: '' }];
  assert.equal(validateCostBatch(data), '');
});
test('batch validation rejects fractional bottles and invalid money or quantities', () => {
  for (const value of [0, 1.5, Infinity, 'wrong']) assert.ok(validateCostBatch({ ...batch(), bottlesProduced: value }));
  for (const value of [-1, Infinity, NaN]) assert.ok(validateCostBatch({ ...batch(), ingredients: [{ name: 'Oil', qty: 1, cost: value }] }));
  assert.ok(validateCostBatch({ ...batch(), packaging: [{ name: '', qty: 1, cost: 5 }] }));
});
