export const notificationKey = adminId => `admin_seen_order_ids:${adminId || 'unknown'}`;
export function readNotifications(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key) || '[]');
    return new Set(Array.isArray(value) ? value.filter(id => typeof id === 'string') : []);
  } catch { return new Set(); }
}
export function saveNotifications(storage, key, seen) {
  try { storage.setItem(key, JSON.stringify([...seen])); return true; }
  catch { return false; }
}
export function unreadOrderNotifications(orders, seen) {
  return orders.filter(order => order._id && !seen.has(order._id) && !['canceled', 'cancelled', 'archived'].includes(String(order.status).toLowerCase()))
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}
export const notificationOrderPath = id => `/admin/order-list?order=${encodeURIComponent(id)}`;
