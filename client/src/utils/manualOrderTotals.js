const money = value => Math.round((Math.max(0, Number(value) || 0) + Number.EPSILON) * 100) / 100;

export const discountAmount = (amount, type, value) => {
  const base = money(amount);
  const discount = type === 'percentage' ? base * Math.min(100, money(value)) / 100
    : type === 'fixed' ? money(value) : 0;
  return money(Math.min(base, discount));
};

export const itemUnitPrice = (price, type, value) => money(money(price) - discountAmount(price, type, value));

export const manualOrderTotals = (lines, coupon, type, value, shipping = 0) => {
  const productsTotal = money(lines.reduce((sum, line) => sum + money(line.price) * (Number(line.quantity) || 0), 0));
  const subtotal = money(lines.reduce((sum, line) => sum + itemUnitPrice(line.price, line.discountType, line.discountValue) * (Number(line.quantity) || 0), 0));
  const couponDiscount = discountAmount(subtotal, coupon?.discountType, coupon?.discountValue);
  const afterCoupon = money(subtotal - couponDiscount);
  const totalDiscountAmount = discountAmount(afterCoupon, type, value);
  return { productsTotal, subtotal, itemDiscount: money(productsTotal - subtotal), couponDiscount, totalDiscountAmount,
    grandTotal: money(afterCoupon - totalDiscountAmount + money(shipping)) };
};
