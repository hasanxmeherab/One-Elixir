import test from 'node:test';
import assert from 'node:assert/strict';
import { filterCollection, getCollectionPrice } from './collectionProducts.js';

const now = new Date('2026-11-02T10:00:00Z');
const products = [
  { _id: 'variant', name: 'Amber', price: 3000, variants: [{ price: 1500 }, { price: 2500 }], scentProfile: ['Amber', 'Wood'] },
  { _id: 'sale', name: 'Rose', price: 2000, flashSale: { active: true, salePrice: 900, endsAt: '2026-11-03T10:00:00Z' }, scentProfile: ['Floral'] },
  { _id: 'regular', name: 'Oud', price: 1200, scentProfile: ['Wood'] },
];
const options = { search: '', priceRange: [0, 5000], scents: [], sortBy: 'default', ratings: {}, now };
const ids = result => result.map(p => p._id);

test('price filtering and sorting use displayed sale and starting variant prices', () => {
  assert.deepEqual(ids(filterCollection(products, { ...options, sortBy: 'price-asc' })), ['sale', 'regular', 'variant']);
  assert.deepEqual(ids(filterCollection(products, { ...options, sortBy: 'price-desc' })), ['variant', 'regular', 'sale']);
  assert.deepEqual(ids(filterCollection(products, { ...options, priceRange: [900, 1500] })), ['variant', 'sale', 'regular']);
  assert.equal(getCollectionPrice(products[0], now).price, 1500);
  assert.deepEqual(ids(products), ['variant', 'sale', 'regular']);
});

test('expired and disabled sales revert to the regular price', () => {
  const expired = new Date('2026-11-03T10:00:00Z');
  assert.deepEqual(getCollectionPrice(products[1], expired), { basePrice: 2000, salePrice: null, price: 2000 });
  const disabled = { ...products[1], flashSale: { ...products[1].flashSale, active: false } };
  assert.equal(getCollectionPrice(disabled, now).price, 2000);
  assert.deepEqual(ids(filterCollection(products, { ...options, now: expired, priceRange: [0, 1000] })), []);
});

test('best rated uses fetched aggregates, including unrated products', () => {
  const ratings = { variant: { avgRating: 4.2 }, regular: { avgRating: 4.9 } };
  assert.deepEqual(ids(filterCollection(products, { ...options, sortBy: 'rating', ratings })), ['regular', 'variant', 'sale']);
});

test('search, inclusive price bounds and all selected scent notes combine', () => {
  assert.deepEqual(ids(filterCollection(products, { ...options, search: ' AMB ', priceRange: [1500, 1500], scents: ['Amber', 'Wood'] })), ['variant']);
  assert.deepEqual(filterCollection(products, { ...options, scents: ['Floral', 'Wood'] }), []);
});
