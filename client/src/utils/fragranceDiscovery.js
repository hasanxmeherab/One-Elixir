export const SUPPORT_URL = 'https://wa.me/8801636400363';

export const SCENT_FAMILIES = [
  { id: 'fresh', name: 'Fresh & Citrus', mood: 'A little sunlight, bottled.', description: 'Bright citrus, green leaves and airy, clean notes.', notes: ['fresh', 'citrus', 'bergamot', 'lemon', 'lime', 'orange', 'grapefruit', 'aquatic', 'marine', 'green', 'mint', 'tea', 'neroli'], color: '#c3ce9e', symbol: 'sun' },
  { id: 'floral', name: 'Soft & Floral', mood: 'Leave a softer impression.', description: 'Petals, delicate blossoms and romantic floral notes.', notes: ['floral', 'rose', 'jasmine', 'lavender', 'iris', 'violet', 'tuberose', 'peony', 'lily', 'ylang', 'blossom'], color: '#d7abb6', symbol: 'flower' },
  { id: 'woody', name: 'Woody & Earthy', mood: 'Quiet confidence. Lasting character.', description: 'Grounded woods, earthy roots and resinous depth.', notes: ['woody', 'wood', 'oud', 'cedar', 'sandalwood', 'vetiver', 'patchouli', 'moss', 'earth', 'resin'], color: '#bda07f', symbol: 'wood' },
  { id: 'warm', name: 'Warm & Spiced', mood: 'For moments after dark.', description: 'Amber, soft sweetness and a touch of spice.', notes: ['warm', 'spicy', 'spice', 'amber', 'vanilla', 'gourmand', 'sweet', 'tonka', 'cinnamon', 'pepper', 'cardamom', 'leather', 'tobacco', 'musk'], color: '#cc9272', symbol: 'spark' },
];

export function matchesFamily(product, familyId) {
  const family = SCENT_FAMILIES.find(item => item.id === familyId);
  if (!family) return true;
  return (product.scentProfile || []).some(note => family.notes.some(term => note.toLowerCase().includes(term)));
}

// Suggestions reflect catalog notes and the customer's budget, not wear-time claims.
export function recommendFragrances(products, { family, budget }, getPrice) {
  return products.filter(product => product.stock > 0 && matchesFamily(product, family)
    && (budget === 'any' || getPrice(product) <= Number(budget)))
    .map(product => ({ product, score: (product.scentProfile || []).filter(note =>
      SCENT_FAMILIES.find(item => item.id === family)?.notes.some(term => note.toLowerCase().includes(term))).length }))
    .sort((a, b) => b.score - a.score || getPrice(a.product) - getPrice(b.product))
    .slice(0, 3).map(item => item.product);
}
