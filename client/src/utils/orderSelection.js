export const isPageSelected = (selected, orders) => orders.length > 0 && orders.every(order => selected.has(order._id));

export const togglePageSelection = (selected, orders) => {
  const next = new Set(selected);
  const remove = isPageSelected(selected, orders);
  for (const order of orders) {
    if (remove) next.delete(order._id);
    else next.add(order._id);
  }
  return next;
};
