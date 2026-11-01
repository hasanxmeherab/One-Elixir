const literal = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function logQuery(query) {
  const filter = {};
  if (query.action) filter.action = String(query.action).slice(0, 100);
  if (query.search?.trim()) {
    const expression = { $regex: literal(query.search.trim().slice(0, 200)), $options: 'i' };
    filter.$or = ['adminName', 'detail', 'target', 'action'].map(key => ({ [key]: expression }));
  }
  for (const key of ['from', 'to']) {
    const value = query[key];
    if (!value) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('Choose valid dates.');
    filter.createdAt ||= {};
    if (key === 'from') filter.createdAt.$gte = new Date(`${value}T00:00:00+06:00`);
    else filter.createdAt.$lt = new Date(Date.parse(`${value}T00:00:00+06:00`) + 86400000);
  }
  if (query.from && query.to && query.from > query.to) throw new Error('Start date must not follow end date.');
  const page = Math.min(1000000, Math.max(1, Math.floor(Number(query.page) || 1)));
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(query.pageSize) || 25)));
  return { filter, page, pageSize };
}
module.exports = { logQuery };
