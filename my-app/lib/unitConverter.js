// Frontend Unit Conversion Utility
// Mirror of backend unitConverter.js for client-side calculations

const VALID_UNITS = [
  'grams',
  'kilograms',
  'milliliters',
  'liters',
  'teaspoons',
  'tablespoons',
  'cups',
  'pieces'
];

function normalizeUnit(unit) {
  if (!unit) return null;
  const normalized = unit.toLowerCase().trim();
  
  const aliases = {
    'g': 'grams',
    'kg': 'kilograms',
    'ml': 'milliliters',
    'l': 'liters',
    'tsp': 'teaspoons',
    'tbsp': 'tablespoons',
    'cup': 'cups',
    'pcs': 'pieces',
    'piece': 'pieces',
    'pc': 'pieces'
  };
  
  return aliases[normalized] || normalized;
}

function convertToGrams(amount, unit, ingredient = null) {
  const normalized = normalizeUnit(unit);
  
  if (!normalized) return null;
  if (normalized === 'grams') return amount;
  
  if (normalized === 'kilograms') {
    return amount * 1000;
  }
  
  if (normalized === 'milliliters' || normalized === 'liters') {
    return null;
  }
  
  if (normalized === 'teaspoons') {
    return ingredient?.gramsPerTeaspoon ? amount * ingredient.gramsPerTeaspoon : null;
  }
  
  if (normalized === 'tablespoons') {
    return ingredient?.gramsPerTablespoon ? amount * ingredient.gramsPerTablespoon : null;
  }
  
  if (normalized === 'cups') {
    return ingredient?.gramsPerCup ? amount * ingredient.gramsPerCup : null;
  }
  
  if (normalized === 'pieces') {
    if (ingredient?.gramsPerPiece) {
      return amount * ingredient.gramsPerPiece;
    }
    return null;
  }
  
  return null;
}

export function round(num) {
  return Math.round((Number(num) || 0) * 10) / 10;
}

function sameUnit(unitA, unitB) {
  return normalizeUnit(unitA) === normalizeUnit(unitB);
}

function getStoredNutrition(ingredient, field) {
  return Number(ingredient?.[field]) || 0;
}

function calculateNutritionFromRatio(ratio, ingredient) {
  return {
    calories: round(getStoredNutrition(ingredient, 'calories') * ratio),
    protein: round(getStoredNutrition(ingredient, 'protein') * ratio),
    carbs: round(getStoredNutrition(ingredient, 'carbs') * ratio),
    fats: round(getStoredNutrition(ingredient, 'fats') * ratio),
    sugar: round(getStoredNutrition(ingredient, 'sugar') * ratio)
  };
}

// Legacy fallback for older ingredients that only have per-100g values.
export function calculateNutritionFromPer100g(gramsUsed, ingredient) {
  if (!gramsUsed || gramsUsed <= 0) {
    return { calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0 };
  }

  const factor = gramsUsed / 100;
  return {
    calories: round(getPer100gValue(ingredient, 'calories') * factor),
    protein: round(getPer100gValue(ingredient, 'protein') * factor),
    carbs: round(getPer100gValue(ingredient, 'carbs') * factor),
    fats: round(getPer100gValue(ingredient, 'fats') * factor),
    sugar: round(getPer100gValue(ingredient, 'sugar') * factor)
  };
}

export function getPer100gValue(ingredient, field) {
  const per100gField = `${field}Per100g`;
  const directValue = Number(ingredient?.[per100gField]);
  if (directValue > 0) return directValue;

  const legacyValue = Number(ingredient?.[field]) || 0;
  const inventoryGrams = convertToGrams(Number(ingredient?.quantity), ingredient?.unit, ingredient);
  if (legacyValue > 0 && inventoryGrams > 0) {
    return legacyValue / inventoryGrams * 100;
  }

  return 0;
}
 
export function getSavedQuantityNutrition(ingredient) {
  const direct = {
    calories: getStoredNutrition(ingredient, 'calories'),
    protein: getStoredNutrition(ingredient, 'protein'),
    carbs: getStoredNutrition(ingredient, 'carbs'),
    fats: getStoredNutrition(ingredient, 'fats'),
    sugar: getStoredNutrition(ingredient, 'sugar')
  };

  if (Object.values(direct).some(value => value > 0)) return direct;

  const grams = convertToGrams(Number(ingredient?.quantity), ingredient?.unit, ingredient);
  return calculateNutritionFromPer100g(grams, ingredient);
}

// Calculate nutrition with unit conversion
export function calculateNutritionWithUnit(quantityUsed, unit, ingredient) {
  if (!quantityUsed || quantityUsed <= 0) {
    return { calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0 };
  }

  const savedQuantity = Number(ingredient?.quantity);
  const hasDirectNutrition = ['calories', 'protein', 'carbs', 'fats', 'sugar'].some(field => getStoredNutrition(ingredient, field) > 0);

  if (hasDirectNutrition && savedQuantity > 0) {
    if (sameUnit(unit, ingredient?.unit)) {
      return calculateNutritionFromRatio(Number(quantityUsed) / savedQuantity, ingredient);
    }

    const usedGrams = convertToGrams(quantityUsed, unit, ingredient);
    const savedGrams = convertToGrams(savedQuantity, ingredient?.unit, ingredient);
    if (usedGrams > 0 && savedGrams > 0) {
      return calculateNutritionFromRatio(usedGrams / savedGrams, ingredient);
    }
  }

  const gramsUsed = convertToGrams(quantityUsed, unit, ingredient);
  
  if (gramsUsed === null || gramsUsed <= 0) {
    return { calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0 };
  }

  return calculateNutritionFromPer100g(gramsUsed, ingredient);
}

export function convertToGramsExport(amount, unit, ingredient = null) {
  return convertToGrams(amount, unit, ingredient);
}

export function hasKnownConversion(quantityUsed, unit, ingredient) {
  if (!quantityUsed || Number(quantityUsed) <= 0 || !unit || !ingredient) return true;
  if (sameUnit(unit, ingredient.unit)) return true;
  return convertToGrams(Number(quantityUsed), unit, ingredient) !== null;
}

export function getConversionWarning(quantityUsed, unit, ingredient) {
  return hasKnownConversion(quantityUsed, unit, ingredient) ? '' : 'Add a custom conversion for this ingredient.';
}
