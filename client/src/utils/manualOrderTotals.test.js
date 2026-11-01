import test from 'node:test';
import assert from 'node:assert/strict';
import { discountAmount, itemUnitPrice, manualOrderTotals } from './manualOrderTotals.js';

test('discounts cannot create negative prices', () => {
  assert.equal(itemUnitPrice(650, 'fixed', 1000), 0);
  assert.equal(itemUnitPrice(650, 'percentage', 150), 0);
  assert.equal(itemUnitPrice(650, 'fixed', -100), 650);
});

test('percentage coupons recalculate with quantity and price changes', () => {
  const coupon = { discountType: 'percentage', discountValue: 10 };
  assert.equal(manualOrderTotals([{ price: 650, quantity: 1 }], coupon).couponDiscount, 65);
  assert.equal(manualOrderTotals([{ price: 650, quantity: 3 }], coupon).couponDiscount, 195);
  assert.equal(manualOrderTotals([{ price: 900, quantity: 1 }], coupon).couponDiscount, 90);
});

test('item discounts apply per unit before coupon and order discounts', () => {
  const totals = manualOrderTotals([{ price: 500, quantity: 2, discountType: 'fixed', discountValue: 50 }],
    { discountType: 'percentage', discountValue: 10 }, 'fixed', 100, 120);
  assert.deepEqual(totals, { productsTotal: 1000, subtotal: 900, itemDiscount: 100, couponDiscount: 90, totalDiscountAmount: 100, grandTotal: 830 });
});

test('excessive coupons and order discounts leave shipping intact', () => {
  const totals = manualOrderTotals([{ price: 100, quantity: 1 }], { discountType: 'fixed', discountValue: 500 }, 'fixed', 500, 120);
  assert.equal(totals.couponDiscount, 100);
  assert.equal(totals.totalDiscountAmount, 0);
  assert.equal(totals.grandTotal, 120);
});

test('removing all lines clears a previously applied coupon amount', () => {
  const totals = manualOrderTotals([], { discountType: 'fixed', discountValue: 500 }, 'percentage', 50);
  assert.equal(totals.couponDiscount, 0);
  assert.equal(totals.grandTotal, 0);
});

test('money rounds consistently to two decimal places', () => {
  assert.equal(discountAmount(99.99, 'percentage', 15), 15);
  assert.equal(itemUnitPrice(99.99, 'percentage', 15), 84.99);
  assert.equal(manualOrderTotals([{ price: 0.1, quantity: 3 }]).grandTotal, 0.3);
});
