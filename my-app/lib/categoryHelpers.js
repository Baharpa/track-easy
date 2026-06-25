export const APP_CATEGORIES = [
  'Fruit',
  'Vegetables',
  'Protein',
  'Grains, Seeds & Legumes',
  'Dairy & Eggs',
  'Oils',
  'Condiments',
  'Spices',
  'Sweeteners',
  'Fermented Foods',
  'Drinks',
  'Other'
];

export const CATEGORY_MAP = {
  Fruit: 'Fruit',
  Vegetables: 'Vegetables',
  'Leafy Greens': 'Vegetables',
  Herbs: 'Vegetables',

  Meat: 'Protein',
  Poultry: 'Protein',
  Fish: 'Protein',
  Seafood: 'Protein',
  'Fish & Seafood': 'Protein',
  Protein: 'Protein',

  Grains: 'Grains, Seeds & Legumes',
  Nuts: 'Grains, Seeds & Legumes',
  Seeds: 'Grains, Seeds & Legumes',
  Legumes: 'Grains, Seeds & Legumes',
  Carbs: 'Grains, Seeds & Legumes',
  'Nuts and Seeds': 'Grains, Seeds & Legumes',

  Dairy: 'Dairy & Eggs',
  Eggs: 'Dairy & Eggs',
  'Dairy & Eggs': 'Dairy & Eggs',

  Oils: 'Oils',
  Condiments: 'Condiments',
  Sauces: 'Condiments',
  Sauce: 'Condiments',
  Spices: 'Spices',
  Sweeteners: 'Sweeteners',
  'Fermented Foods': 'Fermented Foods',
  Drinks: 'Drinks',
  Other: 'Other'
};

const CATEGORY_DATA = [
  { name: 'Fruit', emoji: '🍎', description: 'Fruit, berries, citrus, melons', color: '#d97964' },
  { name: 'Vegetables', emoji: '🥦', description: 'Vegetables, leafy greens, herbs', color: '#5f9368' },
  { name: 'Protein', emoji: '🍗', description: 'Meat, poultry, fish, seafood', color: '#b66b54' },
  { name: 'Grains, Seeds & Legumes', emoji: '🌾', description: 'Grains, nuts, seeds, beans', color: '#b58a4a' },
  { name: 'Dairy & Eggs', emoji: '🥛', description: 'Milk, yogurt, cheese, eggs', color: '#6f9fd8' },
  { name: 'Oils', emoji: '🫒', description: 'Cooking and finishing oils', color: '#8f9b54' },
  { name: 'Condiments', emoji: '🧂', description: 'Sauces, vinegars, nut butters', color: '#d48755' },
  { name: 'Spices', emoji: '🌶️', description: 'Spices, blends, dried herbs', color: '#c06c45' },
  { name: 'Sweeteners', emoji: '🍯', description: 'Honey, syrups, natural sweeteners', color: '#d59b45' },
  { name: 'Fermented Foods', emoji: '🥬', description: 'Fermented vegetables, soy, dairy', color: '#6f9b76' },
  { name: 'Drinks', emoji: '💧', description: 'Water, tea, coffee, natural drinks', color: '#5d98c7' },
  { name: 'Other', emoji: '🧺', description: 'Anything else', color: '#7f8b78' }
];

const CATEGORY_LOOKUP = new Map(CATEGORY_DATA.map(item => [item.name, item]));
const CATEGORY_MAP_NORMALIZED = new Map(
  Object.entries(CATEGORY_MAP).map(([from, to]) => [from.trim().toLowerCase(), to])
);

export function normalizeCategory(category = 'Other') {
  const cleanCategory = String(category || 'Other').trim();
  if (!cleanCategory) return 'Other';
  return CATEGORY_MAP_NORMALIZED.get(cleanCategory.toLowerCase()) || (APP_CATEGORIES.includes(cleanCategory) ? cleanCategory : 'Other');
}

export function getCategoryInfo(category) {
  return CATEGORY_LOOKUP.get(normalizeCategory(category)) || CATEGORY_LOOKUP.get('Other');
}

export function getCategoryEmoji(category) {
  return getCategoryInfo(category).emoji;
}

export function getCategoryLabel(category) {
  return getCategoryInfo(category).name;
}

export function getCategoryFallback(category) {
  const info = getCategoryInfo(category);
  return {
    emoji: info.emoji,
    label: info.name,
    color: info.color
  };
}

export function safeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const cleanUrl = url.trim();
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) return cleanUrl;
  if (cleanUrl.startsWith('/uploads/')) {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/+$/, '');
    return `${apiUrl}${cleanUrl}`;
  }
  if (cleanUrl.startsWith('data:image/')) return cleanUrl;
  return '';
}

export function getDisplayImage(imageUrl, category) {
  const cleanUrl = safeImageUrl(imageUrl);
  if (cleanUrl) return { type: 'image', src: cleanUrl };
  return { type: 'fallback', ...getCategoryFallback(category) };
}

export function getCategoryLibrary() {
  return CATEGORY_DATA;
}
