// ─────────────────────────────────────────────────────────────
// Server-side order pricing
// The client must never be trusted for prices, discounts or shipping.
// Every web order (and the checkout quote) is priced here from the DB.
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');
const Perfume  = require('../models/Perfume');
const Bundle   = require('../models/Bundle');
const Coupon   = require('../models/Coupon');

class PricingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Keep in sync with the district list in client/src/data/locationData.json
const getShippingCost = (district) => {
  if (!district) return 0;
  if (district === 'Ashulia (Daffodil Area)') return 0;
  if (district === 'Ashulia (Other)') return 80;
  return district === 'Dhaka' ? 80 : 120;
};

const isFlashSaleActive = (perfume, now = new Date()) =>
  !!(perfume.flashSale?.active &&
     perfume.flashSale?.salePrice &&
     perfume.flashSale?.endsAt &&
     new Date(perfume.flashSale.endsAt) > now);

// Mirrors ProductDetails.jsx: flash-sale price wins, else variant price, else base price
const getUnitPrice = (perfume, variant) => {
  if (isFlashSaleActive(perfume)) return perfume.flashSale.salePrice;
  return variant ? variant.price : perfume.price;
};

const findValidCoupon = async (code, session = null) => {
  if (!code || typeof code !== 'string' || !code.trim()) return null;
  const coupon = await Coupon.findOne({
    code: code.trim().toUpperCase(),
    isActive: true,
    $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }],
  }).session(session);
  if (!coupon) throw new PricingError('Invalid or expired coupon code.');
  return coupon;
};

const isValidId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);

/**
 * Price a cart entirely from the database.
 * @param {Object}   input
 * @param {Array}    input.items       [{ perfumeId, variantLabel?, quantity } | { bundleId, quantity }]
 * @param {string}   [input.couponCode]
 * @param {string}   [input.district]
 * @param {Object}   [session]         mongoose session (optional)
 * @returns {Promise<{ items, subtotal, discount, shippingCost, total, couponCode }>}
 */
const priceOrder = async ({ items, couponCode, district }, session = null) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new PricingError('Your cart is empty.');
  }

  // ── Batch load bundles + perfumes ──
  const bundleIds = [...new Set(items.filter(i => i.bundleId).map(i => i.bundleId))];
  if (bundleIds.some(id => !isValidId(id))) throw new PricingError('Invalid bundle in cart.');

  const bundles = bundleIds.length
    ? await Bundle.find({ _id: { $in: bundleIds }, active: true }).session(session)
    : [];
  const bundleMap = Object.fromEntries(bundles.map(b => [b._id.toString(), b]));

  const perfumeIds = new Set(items.filter(i => i.perfumeId).map(i => i.perfumeId));
  bundles.forEach(b => b.products.forEach(p => perfumeIds.add(p.toString())));
  if ([...perfumeIds].some(id => !isValidId(id))) throw new PricingError('Invalid product in cart.');

  const perfumes = await Perfume.find({ _id: { $in: [...perfumeIds] }, isDeleted: { $ne: true } }).session(session);
  const perfumeMap = Object.fromEntries(perfumes.map(p => [p._id.toString(), p]));

  // ── Build priced order lines ──
  const orderItems = [];
  const lines = []; // one entry per requested cart line, same order as `items`
  let subtotal = 0;

  for (const line of items) {
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new PricingError('Invalid quantity in cart.');
    }

    if (line.bundleId) {
      const bundle = bundleMap[line.bundleId];
      if (!bundle) throw new PricingError('A bundle in your cart is no longer available.');

      const products = bundle.products.map(id => perfumeMap[id.toString()]);
      if (products.length === 0 || products.some(p => !p)) {
        throw new PricingError(`Bundle "${bundle.name}" is no longer available.`);
      }

      // Split bundle price across its products; last product absorbs rounding remainder
      const share = Math.floor(bundle.bundlePrice / products.length);
      products.forEach((p, idx) => {
        const price = idx === products.length - 1
          ? bundle.bundlePrice - share * (products.length - 1)
          : share;
        orderItems.push({
          perfumeId: p._id,
          name: `${p.name} (${bundle.name})`,
          quantity,
          price,
          finalItemPrice: price,
        });
      });
      subtotal += bundle.bundlePrice * quantity;
      lines.push({ unitPrice: bundle.bundlePrice, quantity, lineTotal: bundle.bundlePrice * quantity });
      continue;
    }

    const perfume = perfumeMap[line.perfumeId];
    if (!perfume) throw new PricingError('A product in your cart is no longer available.');

    let variant = null;
    if (line.variantLabel) {
      variant = (perfume.variants || []).find(v => v.label === line.variantLabel);
      if (!variant) throw new PricingError(`Size "${line.variantLabel}" is no longer available for "${perfume.name}".`);
    }

    const price = getUnitPrice(perfume, variant);
    orderItems.push({
      perfumeId: perfume._id,
      name: variant ? `${perfume.name} (${variant.label})` : perfume.name,
      quantity,
      price,
      variantLabel: variant ? variant.label : null,
      variantPrice: variant ? variant.price : null,
      finalItemPrice: price,
    });
    subtotal += price * quantity;
    lines.push({ unitPrice: price, quantity, lineTotal: price * quantity });
  }

  // ── Coupon ──
  let discount = 0;
  const coupon = await findValidCoupon(couponCode, session);
  if (coupon) {
    discount = coupon.discountType === 'percentage'
      ? Math.round((subtotal * coupon.discountValue) / 100)
      : coupon.discountValue;
    discount = Math.min(Math.max(discount, 0), subtotal);
  }

  const shippingCost = getShippingCost(district);
  const total = subtotal - discount + shippingCost;

  return {
    items: orderItems,
    lines,
    subtotal,
    discount,
    shippingCost,
    total,
    couponCode: coupon ? coupon.code : null,
  };
};

module.exports = { priceOrder, getShippingCost, PricingError };
