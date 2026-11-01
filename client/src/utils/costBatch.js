export function validateCostBatch({ bottlesProduced, sellingPrice, ingredients, packaging = [] }) {
  if (!Number.isInteger(Number(bottlesProduced)) || Number(bottlesProduced) <= 0) return 'Bottles produced must be a positive whole number.';
  if (sellingPrice !== '' && sellingPrice !== undefined && (!Number.isFinite(Number(sellingPrice)) || Number(sellingPrice) <= 0)) return 'Selling price must be greater than zero.';
  if (!ingredients.length || ingredients.some(row => !row.name.trim())) return 'Enter an ingredient name for every row.';
  const rows = [...ingredients, ...packaging.filter(row => row.name?.trim() || row.qty !== '' || row.cost !== '')];
  if (rows.some(row => !row.name.trim() || !Number.isFinite(Number(row.qty)) || Number(row.qty) <= 0 || row.cost === '' || !Number.isFinite(Number(row.cost)) || Number(row.cost) < 0)) return 'Each item needs a name, positive quantity, and non-negative total cost.';
  return '';
}
export function costPercentages(cost, price) {
  const profit = price - cost;
  return { margin: price > 0 ? profit / price * 100 : null, markup: cost > 0 ? profit / cost * 100 : null };
}
