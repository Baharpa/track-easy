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

const defaultNutritionPer100g = {
  apple: { calories: 52, protein: 0.3, carbs: 14, fats: 0.2, sugar: 10.4 },
  banana: { calories: 89, protein: 1.1, carbs: 22.8, fats: 0.3, sugar: 12.2 },
  orange: { calories: 47, protein: 0.9, carbs: 11.8, fats: 0.1, sugar: 9.4 },
  mandarin: { calories: 53, protein: 0.8, carbs: 13.3, fats: 0.3, sugar: 10.6 },
  strawberry: { calories: 32, protein: 0.7, carbs: 7.7, fats: 0.3, sugar: 4.9 },
  carrot: { calories: 41, protein: 0.9, carbs: 9.6, fats: 0.2, sugar: 4.7 },
  broccoli: { calories: 34, protein: 2.8, carbs: 6.6, fats: 0.4, sugar: 1.7 },
  cauliflower: { calories: 25, protein: 1.9, carbs: 5, fats: 0.3, sugar: 1.9 },
  spinach: { calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, sugar: 0.4 },
  tomato: { calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2, sugar: 2.6 },
  tomato_paste: { calories: 82, protein: 4.3, carbs: 18.9, fats: 0.5, sugar: 12.2 },
  potato: { calories: 77, protein: 2, carbs: 17.5, fats: 0.1, sugar: 0.8 }
};

export const popularFoods = normalizedLibrary.foods.map(food => ({
  ...food,
  originalCategory: food.category || 'Other',
  category: normalizeCategory(food.category),
  nutritionPer100g: normalizeNutritionFields(food.nutritionPer100g || food.nutritionPer100 || food.per100g || defaultNutritionPer100g[food.id]),
  variations: (food.variations || []).map(variation => ({
    ...variation,
    nutritionPer100g: normalizeNutritionFields(variation.nutritionPer100g || variation.nutritionPer100 || variation.per100g || food.nutritionPer100g || food.nutritionPer100 || food.per100g || defaultNutritionPer100g[food.id])
  }))
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
      food.id,
      food.name,
      food.category,
      food.originalCategory,
      food.subcategory,
      ...(food.variations || []).map(variation => variation.name),
      ...(food.variations || []).flatMap(variation => (variation.servingOptions || []).map(option => option.label)),
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

function getNumeric(source, keys) {
  for (const key of keys) {
    const value = Number(source?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function normalizeNutritionFields(source) {
  if (!source) return null;

  const nutrition = {
    calories: getNumeric(source, ['calories', 'cal', 'kcal', 'energy', 'energyKcal']),
    protein: getNumeric(source, ['protein', 'proteinG']),
    carbs: getNumeric(source, ['carbs', 'carbohydrates', 'carbsG', 'carbohydratesG']),
    sugar: getNumeric(source, ['sugar', 'sugars', 'sugarG', 'sugarsG']),
    fats: getNumeric(source, ['fats', 'fat', 'fatsG', 'fatG'])
  };

  return Object.values(nutrition).some(value => value !== null)
    ? {
      calories: nutrition.calories || 0,
      protein: nutrition.protein || 0,
      carbs: nutrition.carbs || 0,
      sugar: nutrition.sugar || 0,
      fats: nutrition.fats || 0
    }
    : null;
}

function getNutritionSource(food, variation) {
  const per100 = normalizeNutritionFields(
    variation?.nutritionPer100g ||
    variation?.nutritionPer100 ||
    variation?.per100g ||
    food?.nutritionPer100g ||
    food?.nutritionPer100 ||
    food?.per100g
  );
  if (per100) return { values: per100, basisAmount: 100 };

  const reference = normalizeNutritionFields(
    variation?.nutritionPerReference ||
    variation?.referenceNutrition ||
    variation?.nutrition ||
    food?.nutritionPerReference ||
    food?.referenceNutrition ||
    food?.nutrition ||
    variation ||
    food
  );
  if (reference) {
    return {
      values: reference,
      basisAmount: Number(variation?.referenceAmount?.amount) || 100
    };
  }

  const fallback = normalizeNutritionFields(defaultNutritionPer100g[food?.id]);
  return fallback ? { values: fallback, basisAmount: 100 } : null;
}

function toAppUnit(unit) {
  if (unit === 'g') return 'grams';
  if (unit === 'ml') return 'milliliters';
  return unit || 'pieces';
}

function getServingAmountGrams(serving) {
  if (!serving) return 0;
  const amount = Number(serving.amount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  // Library serving options are normalized to gram/ml amounts.
  // For simple natural foods, ml is treated as an approximate gram equivalent.
  return amount;
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
  if (!nutritionPer100 || !Number(amount)) return null;

  const multiplier = Number(amount) / 100;
  return {
    calories: roundCalories(nutritionPer100.calories * multiplier),
    protein: roundMacro(nutritionPer100.protein * multiplier),
    carbs: roundMacro(nutritionPer100.carbs * multiplier),
    fats: roundMacro(nutritionPer100.fats * multiplier),
    sugar: roundMacro(nutritionPer100.sugar * multiplier)
  };
}

export function getLibraryNutrition(food, selectedAmountGrams) {
  const nutritionPer100g = normalizeNutritionFields(food?.nutritionPer100g);
  const amount = Number(selectedAmountGrams);
  if (!nutritionPer100g || !Number.isFinite(amount) || amount <= 0) return null;

  return calculateNutritionForAmount(nutritionPer100g, amount);
}

export function normalizeLibraryFoodResult(food, selectedAmountGrams) {
  const defaultVariation = food?.variations?.find(variation => variation.id === food?.defaultVariationId) || food?.variations?.[0] || null;
  const amount = Number(selectedAmountGrams || defaultVariation?.referenceAmount?.amount || 100);

  return {
    id: food?.id,
    name: food?.name,
    category: food?.category,
    subcategory: food?.subcategory,
    displayServing: food?.displayServing || defaultVariation?.servingOptions?.[0]?.label || `${amount} g`,
    selectedAmountGrams: amount,
    nutrition: getLibraryNutrition(food, amount),
    variations: food?.variations || [],
    servingOptions: defaultVariation?.servingOptions || []
  };
}

export function normalizeNutrition(food, variation, amount) {
  const numericAmount = Number(amount);
  const source = getNutritionSource(food, variation);
  if (!source || !Number.isFinite(numericAmount) || numericAmount < 0 || source.basisAmount <= 0) return null;
  if (numericAmount === 0) {
    return { calories: 0, protein: 0, carbs: 0, sugar: 0, fats: 0 };
  }

  const multiplier = numericAmount / source.basisAmount;
  return {
    calories: roundCalories(source.values.calories * multiplier),
    protein: roundMacro(source.values.protein * multiplier),
    carbs: roundMacro(source.values.carbs * multiplier),
    sugar: roundMacro(source.values.sugar * multiplier),
    fats: roundMacro(source.values.fats * multiplier)
  };
}

export function getNutritionPreview(foodId, variationId, serving) {
  const food = getPopularFoodById(foodId);
  const variation = getPopularFoodVariation(foodId, variationId);
  if (!variation) return null;
  const selectedAmountGrams = getServingAmountGrams(serving);
  const nutrition = normalizeNutrition(food, variation, selectedAmountGrams);

  return {
    nutrition,
    hasNutrition: Boolean(nutrition),
    selectedAmountGrams,
    unit: variation.referenceAmount?.unit || 'g'
  };
}

export function buildCustomServing(label, amount, unit, options = {}) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 0 || (!options.allowZero && numericAmount <= 0)) return null;

  return {
    label,
    amount: numericAmount,
    unit
  };
}

export function formatLibraryIngredientPayload(food, variation, serving) {
  const selectedAmountGrams = getServingAmountGrams(serving);
  const nutrition = normalizeNutrition(food, variation, selectedAmountGrams);

  return {
    name: buildLibraryIngredientName(food, variation),
    category: normalizeCategory(food?.category),
    quantity: Number(serving?.amount) || 0,
    unit: toAppUnit(serving?.unit),
    imageUrl: food?.image || variation?.image || '',
    sourceFoodId: food?.id,
    sourceVariationId: variation?.id,
    calories: nutrition?.calories || 0,
    protein: nutrition?.protein || 0,
    carbs: nutrition?.carbs || 0,
    sugar: nutrition?.sugar || 0,
    fats: nutrition?.fats || 0
  };
}
