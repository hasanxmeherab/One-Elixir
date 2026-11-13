export const isCancelledOrder = order => ['canceled', 'cancelled'].includes(order?.status?.toLowerCase());

export function editStockAvailable(order, perfumes, perfumeId) {
  const product = perfumes.find(p => p._id === perfumeId);
  if (!product) return 0;
  const reserved = isCancelledOrder(order) ? 0 : (order.items || [])
    .filter(item => item.perfumeId === perfumeId)
    .reduce((sum, item) => sum + item.quantity, 0);
  return Number(product.stock) + reserved;
}

export function editStockError(order, perfumes, items) {
  const quantities = new Map();
  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) return 'Quantities must be positive whole numbers.';
    if (!item.name?.trim()) return 'Select a product or enter a custom item name.';
    if (!item.perfumeId) continue;
    if (!perfumes.some(p => p._id === item.perfumeId)) return `Select an available product for "${item.name}".`;
    const quantity = (quantities.get(item.perfumeId) || 0) + item.quantity;
    quantities.set(item.perfumeId, quantity);
    const available = editStockAvailable(order, perfumes, item.perfumeId);
    if (!isCancelledOrder(order) && quantity > available) {
      return `"${item.name}" only has ${available} units available for this order (you requested ${quantity}).`;
    }
  }
  return null;
}
