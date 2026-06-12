import {
  getCategoryEmoji,
  getCategoryInfo,
  getCategoryLibrary,
  getDisplayImage,
  safeImageUrl
} from './categoryHelpers';

export const CATEGORY_LIBRARY = getCategoryLibrary().map(category => ({
  name: category.name,
  icon: category.emoji,
  description: category.description,
  color: category.color
}));

export const NUTRITION_ICONS = {
  Calories: '🔥',
  Protein: '💪',
  Carbs: '🍞',
  Fats: '🥑',
  Sugar: '🍬'
};

export { safeImageUrl, getDisplayImage };

export function getCategoryIcon(categoryName) {
  return getCategoryEmoji(categoryName);
}

export function getCategoryColor(categoryName) {
  return getCategoryInfo(categoryName).color;
}

export function getCategoryClass(categoryName) {
  const label = getCategoryInfo(categoryName).name;
  return `category-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export function getFoodImage(food) {
  return safeImageUrl(food?.imageUrl);
}
