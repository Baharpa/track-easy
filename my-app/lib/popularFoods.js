import library from '../data/popularFoods.json';
import { APP_CATEGORIES, getCategoryInfo, normalizeCategory } from './categoryHelpers';

export const CATEGORY_ORDER = APP_CATEGORIES;

function slugify(value) {
  return String(value || 'other').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'other';
}

function normalizeLibrary(rawLibrary) {
  if (Array.isArray(rawLibrary)) {
    return { foods: rawLibrary, categories: [] };
  }

  return {
    foods: Array.isArray(rawLibrary?.foods) ? rawLibrary.foods : [],
    categories: Array.isArray(rawLibrary?.categories) ? rawLibrary.categories : []
  };
}

function buildCategoryList(foods, configuredCategories) {
  return CATEGORY_ORDER
    .map(name => {
      const configured = configuredCategories.find(category => normalizeCategory(category.name) === name);
      const info = getCategoryInfo(name);
      return {
        id: configured?.id || slugify(name),
        name,
        emoji: configured?.emoji || info.emoji,
        image: configured?.image || null
      };
    });
}

const normalizedLibrary = normalizeLibrary(library);

export const popularFoods = normalizedLibrary.foods.map(food => ({
  ...food,
  originalCategory: food.category || 'Other',
  category: normalizeCategory(food.category)
}));
export const foodLibraryCategories = buildCategoryList(popularFoods, normalizedLibrary.categories);

export function getFoodsByCategory(category) {
  const normalizedCategory = normalizeCategory(category);
  return popularFoods.filter(food => normalizeCategory(food.category) === normalizedCategory);
}

export function findPopularFoods(query = '') {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return popularFoods;

  return popularFoods.filter(food => {
    const searchText = [
      food.name,
      food.category,
      food.originalCategory,
      food.subcategory,
      ...(food.variations || []).map(variation => variation.name),
      ...(food.keywords || [])
    ].join(' ').toLowerCase();
    return searchText.includes(cleanQuery);
  });
}

export function getPopularFoodById(id) {
  return popularFoods.find(food => food.id === id) || null;
}

export function getPopularFoodVariation(foodId, variationId) {
  const food = getPopularFoodById(foodId);
  if (!food) return null;
  return food.variations.find(variation => variation.id === variationId) || null;
}

export function getServingOption(foodId, variationId, servingLabel) {
  const variation = getPopularFoodVariation(foodId, variationId);
  if (!variation) return null;
  return variation.servingOptions.find(option => option.label === servingLabel) || null;
}

function roundMacro(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function roundCalories(value) {
  return Math.round(Number(value) || 0);
}

function toAppUnit(unit) {
  if (unit === 'g') return 'grams';
  if (unit === 'ml') return 'milliliters';
  return unit || 'pieces';
}

function getVariationSuffix(foodName, variationName) {
  const cleanFoodName = String(foodName || '').trim();
  const cleanVariationName = String(variationName || '').trim();
  if (!cleanVariationName) return '';

  const escapedFoodName = cleanFoodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withoutFoodName = cleanVariationName
    .replace(new RegExp(`^${escapedFoodName}\\s*[-:]*\\s*`, 'i'), '')
    .replace(new RegExp(`\\s*[-:]*\\s*${escapedFoodName}$`, 'i'), '')
    .trim();

  return withoutFoodName || (cleanVariationName.toLowerCase() === cleanFoodName.toLowerCase() ? '' : cleanVariationName);
}

function buildLibraryIngredientName(food, variation) {
  const suffix = getVariationSuffix(food?.name, variation?.name);
  return suffix ? `${food.name} - ${suffix}` : food?.name || variation?.name || 'Library food';
}

export function calculateNutritionForAmount(nutritionPer100, amount) {
  if (!nutritionPer100 || !Number(amount)) {
    return { calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0 };
  }

  const multiplier = Number(amount) / 100;
  return {
    calories: roundCalories(nutritionPer100.calories * multiplier),
    protein: roundMacro(nutritionPer100.protein * multiplier),
    carbs: roundMacro(nutritionPer100.carbs * multiplier),
    fats: roundMacro(nutritionPer100.fats * multiplier),
    sugar: roundMacro(nutritionPer100.sugar * multiplier)
  };
}

export function getNutritionPreview(foodId, variationId, servingAmount) {
  const variation = getPopularFoodVariation(foodId, variationId);
  if (!variation) return null;

  return {
    nutrition: calculateNutritionForAmount(variation.nutritionPer100, servingAmount),
    hasNutrition: Boolean(variation.nutritionPer100),
    unit: variation.referenceAmount?.unit || 'g'
  };
}

export function buildCustomServing(label, amount, unit) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null;

  return {
    label,
    amount: numericAmount,
    unit
  };
}

export function formatLibraryIngredientPayload(food, variation, serving) {
  const nutrition = calculateNutritionForAmount(variation?.nutritionPer100, serving?.amount);

  return {
    name: buildLibraryIngredientName(food, variation),
    category: normalizeCategory(food?.category),
    quantity: Number(serving?.amount) || 0,
    unit: toAppUnit(serving?.unit),
    ...nutrition
  };
}
