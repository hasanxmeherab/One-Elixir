import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesFamily, recommendFragrances } from './fragranceDiscovery.js';
import { getCollectionPrice, filterCollection } from './collectionProducts.js';

const products = [
  { _id: 'rose', name: 'Rose', price: 2000, stock: 4, scentProfile: ['Bulgarian Rose', 'Jasmine'] },
  { _id: 'mixed', name: 'Garden', price: 1800, stock: 3, scentProfile: ['Rose', 'Cedarwood'] },
  { _id: 'sold', name: 'Iris', price: 900, stock: 0, scentProfile: ['Iris', 'Rose', 'Jasmine'] },
  { _id: 'fresh', name: 'Breeze', price: 1000, stock: 2, scentProfile: ['Bergamot', 'Marine'] },
  { _id: 'small', name: 'Petal', price: 3000, stock: 5, variants: [{ price: 700 }], scentProfile: ['Floral'] },
];

test('families match mixed-case compound catalog notes and can overlap', () => {
  assert.equal(matchesFamily(products[0], 'floral'), true);
  assert.equal(matchesFamily(products[1], 'floral'), true);
  assert.equal(matchesFamily(products[1], 'woody'), true);
  assert.equal(matchesFamily(products[3], 'floral'), false);
  assert.equal(matchesFamily({ scentProfile: [] }, 'fresh'), false);
  assert.equal(matchesFamily(products[0], 'unknown'), true);
});

test('quiz respects stock, budget and starting variant prices', () => {
  const price = product => getCollectionPrice(product).price;
  assert.deepEqual(recommendFragrances(products, { family: 'floral', budget: '1000' }, price).map(p => p._id), ['small']);
  assert.deepEqual(recommendFragrances(products, { family: 'floral', budget: 'any' }, price).map(p => p._id), ['rose', 'small', 'mixed']);
  assert.deepEqual(recommendFragrances(products, { family: 'woody', budget: '1000' }, price), []);
});

test('guide links filter by family and exact scent together', () => {
  const options = { search: '', priceRange: [0, 5000], scents: ['Rose'], family: 'woody', sortBy: 'default', ratings: {}, now: new Date() };
  assert.deepEqual(filterCollection(products, options).map(p => p._id), ['mixed']);
  assert.deepEqual(filterCollection(products, { ...options, scents: [], family: 'fresh' }).map(p => p._id), ['fresh']);
});
