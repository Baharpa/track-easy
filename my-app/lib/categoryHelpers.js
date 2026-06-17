const CATEGORY_DATA = [
  { name: 'Dairy', emoji: '🥛', description: 'Milk, yogurt, cheese', color: '#6f9fd8' },
  { name: 'Vegetables', emoji: '🥦', description: 'Fresh and cooked vegetables', color: '#5f8f5f' },
  { name: 'Protein', emoji: '🍗', description: 'Meat, eggs, tofu, beans', color: '#b66b54' },
  { name: 'Carbs', emoji: '🍚', description: 'Rice, potatoes, pasta', color: '#d59b45' },
  { name: 'Sauces', emoji: '🥣', description: 'Dressings, dips, sauces', color: '#d48755' },
  { name: 'Fruit', emoji: '🍎', description: 'Fruit and berries', color: '#d97964' },
  { name: 'Grains', emoji: '🌾', description: 'Bread, oats, cereal', color: '#b58a4a' },
  { name: 'Nuts and Seeds', emoji: '🥜', description: 'Nuts, seeds, nut butters', color: '#9b7b4f' },
  { name: 'Spices', emoji: '🧂', description: 'Seasonings and herbs', color: '#c06c45' },
  { name: 'Other', emoji: '🍽️', description: 'Anything else', color: '#7f8b78' }
];

function normalizeCategory(category = 'Other') {
  const cleanCategory = String(category || 'Other').trim().toLowerCase();
  if (cleanCategory === 'sauce') return 'sauces';
  return cleanCategory;
}

export function getCategoryInfo(category) {
  const normalized = normalizeCategory(category);
  return CATEGORY_DATA.find(item => item.name.toLowerCase() === normalized) || CATEGORY_DATA[CATEGORY_DATA.length - 1];
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
