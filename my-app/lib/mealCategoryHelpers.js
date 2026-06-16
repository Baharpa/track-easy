export const MEAL_CATEGORIES = ['Breakfast', 'Lunch/Dinner', 'Snack', 'Beverage', 'Other'];

export function normalizeMealCategory(category) {
  const cleanCategory = String(category || '').trim().toLowerCase();
  const match = MEAL_CATEGORIES.find(item => item.toLowerCase() === cleanCategory);
  return match || 'Other';
}

export function mealCategoryOptions(includeAll = false) {
  return includeAll ? ['All categories', ...MEAL_CATEGORIES] : MEAL_CATEGORIES;
}
