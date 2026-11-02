import { matchesFamily } from './fragranceDiscovery.js';

export function getCollectionPrice(product, now = new Date()) {
  const variantPrices = (product.variants || []).map(v => Number(v.price)).filter(Number.isFinite);
  const basePrice = variantPrices.length ? Math.min(...variantPrices) : Number(product.price);
  const sale = product.flashSale;
  const salePrice = sale?.active && Number(sale.salePrice) > 0 && new Date(sale.endsAt) > now
    ? Number(sale.salePrice) : null;
  return { basePrice, salePrice, price: salePrice ?? basePrice };
}

export function filterCollection(products, { search, priceRange, scents, family, sortBy, ratings, now }) {
  const query = search.trim().toLowerCase();
  const result = products.filter(product => {
    const { price } = getCollectionPrice(product, now);
    return product.name.toLowerCase().includes(query)
      && price >= priceRange[0] && price <= priceRange[1]
      && scents.every(scent => product.scentProfile?.includes(scent))
      && matchesFamily(product, family);
  });
  if (sortBy === 'price-asc' || sortBy === 'price-desc') {
    const direction = sortBy === 'price-asc' ? 1 : -1;
    result.sort((a, b) => direction * (getCollectionPrice(a, now).price - getCollectionPrice(b, now).price));
  }
  if (sortBy === 'newest') result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sortBy === 'rating') result.sort((a, b) => (ratings[b._id]?.avgRating || 0) - (ratings[a._id]?.avgRating || 0));
  return result;
}
