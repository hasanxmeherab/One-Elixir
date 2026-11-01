module.exports = function expensePayload(body) {
  const hasQuantity = body.quantity !== undefined;
  const hasUnitPrice = body.unitPrice !== undefined;
  if (hasQuantity !== hasUnitPrice) throw new Error('Provide both quantity and unit price, or enter a total only.');
  if (!String(body.title || '').trim()) throw new Error('Expense description is required.');
  const date = body.date === undefined ? new Date() : new Date(body.date);
  if (Number.isNaN(date.getTime())) throw new Error('Enter a valid expense date.');
  const amount = hasQuantity ? Math.round(body.quantity * body.unitPrice * 100) / 100 : Math.round(body.amount * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Expense amount must be greater than zero.');
  return { title: body.title.trim(), amount, category: body.category || 'Other', date, unit: body.unit || 'pcs',
    ...(hasQuantity ? { quantity: body.quantity, unitPrice: body.unitPrice } : {}) };
};
