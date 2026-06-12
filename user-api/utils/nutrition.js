const { convertToGrams } = require('./unitConverter');

function round(num) {
  return Math.round((Number(num) || 0) * 10) / 10;
}

function emptyTotals() {
  return { calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0 };
}

// LEGACY: Ingredients store nutrition for their full inventory quantity.
// If a meal uses part of the ingredient, this function scales the nutrition.
function scaleNutrition(ingredient, quantityUsed) {
  const ratio = ingredient.quantity > 0 ? Number(quantityUsed) / ingredient.quantity : 0;
  return {
    calories: round(ingredient.calories * ratio),
    protein: round(ingredient.protein * ratio),
    carbs: round(ingredient.carbs * ratio),
    fats: round(ingredient.fats * ratio),
    sugar: round(ingredient.sugar * ratio)
  };
}

// Legacy fallback for older ingredients that only have per-100g values.
function calculateNutritionFromPer100g(gramsUsed, ingredient) {
  if (!gramsUsed || gramsUsed <= 0) {
    return emptyTotals();
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

function sameUnit(unitA, unitB) {
  const normalize = (unit) => String(unit || '').toLowerCase().trim();
  const aliases = {
    g: 'grams',
    kg: 'kilograms',
    ml: 'milliliters',
    l: 'liters',
    tsp: 'teaspoons',
    tbsp: 'tablespoons',
    cup: 'cups',
    piece: 'pieces',
    pcs: 'pieces',
    pc: 'pieces'
  };
  const normalizedA = normalize(unitA);
  const normalizedB = normalize(unitB);
  return (aliases[normalizedA] || normalizedA) === (aliases[normalizedB] || normalizedB);
}

function getStoredNutrition(ingredient, field) {
  return Number(ingredient?.[field]) || 0;
}

function hasDirectNutrition(ingredient) {
  return ['calories', 'protein', 'carbs', 'fats', 'sugar'].some(field => getStoredNutrition(ingredient, field) > 0);
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

function getPer100gValue(ingredient, field) {
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

function calculateNutritionWithUnit(quantityUsed, unit, ingredient) {
  if (!quantityUsed || quantityUsed <= 0) {
    return emptyTotals();
  }

  const savedQuantity = Number(ingredient?.quantity);
  if (hasDirectNutrition(ingredient) && savedQuantity > 0) {
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
    // If conversion fails or results in invalid amount, return empty
    return emptyTotals();
  }

  return calculateNutritionFromPer100g(gramsUsed, ingredient);
}

function addTotals(items) {
  const total = items.reduce((sum, item) => {
    sum.calories += Number(item.calories) || Number(item.totalCalories) || 0;
    sum.protein += Number(item.protein) || Number(item.totalProtein) || 0;
    sum.carbs += Number(item.carbs) || Number(item.totalCarbs) || 0;
    sum.fats += Number(item.fats) || Number(item.totalFats) || 0;
    sum.sugar += Number(item.sugar) || Number(item.totalSugar) || 0;
    return sum;
  }, emptyTotals());
  return {
    calories: round(total.calories),
    protein: round(total.protein),
    carbs: round(total.carbs),
    fats: round(total.fats),
    sugar: round(total.sugar)
  };
}

// Eating part of a component splits the eaten grams proportionally.
function calculateComponentPortion(componentIngredients, eatenWeight) {
  const totalWeight = componentIngredients.reduce((sum, item) => sum + Number(item.gramsUsed || item.quantityUsed || 0), 0);
  return componentIngredients.map(item => {
    const itemGrams = Number(item.gramsUsed || item.quantityUsed || 0);
    const percent = totalWeight > 0 ? itemGrams / totalWeight : 0;
    const gramsUsed = round(percent * eatenWeight);
    return { ...item, quantityUsed: gramsUsed, unit: 'grams', gramsUsed };
  });
}

module.exports = {
  round,
  scaleNutrition,
  calculateNutritionFromPer100g,
  calculateNutritionWithUnit,
  getPer100gValue,
  addTotals,
  calculateComponentPortion,
  emptyTotals
};
