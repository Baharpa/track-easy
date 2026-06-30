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
  if (typeof food === 'string') return safeImageUrl(food);
  if (!food || typeof food !== 'object') return '';

  const relatedItems = [
    food,
    food.meal,
    typeof food.mealId === 'object' ? food.mealId : null,
    food.ingredient,
    typeof food.ingredientId === 'object' ? food.ingredientId : null,
    food.food,
    food.item,
    food.populatedFood
  ];

  for (const item of relatedItems) {
    const imageUrl = safeImageUrl(item?.imageUrl || item?.image || item?.photoUrl || '');
    if (imageUrl) return imageUrl;
  }

  return safeImageUrl(
    food.thumbnailUrl || food.mealImageUrl || food.ingredientImageUrl || ''
  );
}
