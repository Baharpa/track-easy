// Unit Conversion Utility
// Converts ingredient units to grams for nutrition calculations.

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

const STANDARD_UNIT_SET = new Set(VALID_UNITS);

function normalizeUnit(unit) {
  if (!unit) return null;
  const normalized = String(unit).toLowerCase().trim();

  const aliases = {
    g: 'grams',
    kg: 'kilograms',
    ml: 'milliliters',
    l: 'liters',
    tsp: 'teaspoons',
    tbsp: 'tablespoons',
    cup: 'cups',
    pcs: 'pieces',
    piece: 'pieces',
    pc: 'pieces'
  };

  return aliases[normalized] || normalized;
}

function isStandardUnit(unit) {
  return STANDARD_UNIT_SET.has(normalizeUnit(unit));
}

function isValidUnit(unit) {
  return isStandardUnit(unit);
}

function normalizeConversionOption(option) {
  if (!option) return null;

  const amount = Number(option.amount);
  const gramsEquivalent = option.gramsEquivalent !== undefined && option.gramsEquivalent !== ''
    ? Number(option.gramsEquivalent)
    : option.grams !== undefined && option.grams !== ''
      ? Number(option.grams)
      : null;
  const unit = String(option.unit || '').trim().toLowerCase();
  if (!unit || amount <= 0) return null;

  const label = String(option.label || option.servingName || option.displayName || '').trim() || `${amount} ${unit}`;

  return {
    label,
    servingName: label,
    amount,
    unit,
    gramsEquivalent: Number.isFinite(gramsEquivalent) && gramsEquivalent > 0 ? gramsEquivalent : null,
    calories: Number(option.calories) || 0,
    protein: Number(option.protein) || 0,
    carbs: Number(option.carbs) || 0,
    sugar: Number(option.sugar) || 0,
    fats: Number(option.fats) || 0
  };
}

function buildLegacyConversionOptions(ingredient) {
  const conversions = Array.isArray(ingredient?.conversions)
    ? ingredient.conversions.map(normalizeConversionOption).filter(Boolean)
    : [];
  if (conversions.length > 0) return conversions;

  const servingOptions = Array.isArray(ingredient?.servingOptions)
    ? ingredient.servingOptions.map(option => normalizeConversionOption({
        label: option.label || option.servingName,
        amount: option.amount,
        unit: option.unit,
        gramsEquivalent: option.gramsEquivalent ?? option.grams,
        calories: option.calories,
        protein: option.protein,
        carbs: option.carbs,
        sugar: option.sugar,
        fats: option.fats
      })).filter(Boolean)
    : [];
  if (servingOptions.length > 0) return servingOptions;

  return Array.isArray(ingredient?.measuringOptions)
    ? ingredient.measuringOptions.map(option => normalizeConversionOption({
        label: option.label,
        amount: option.amount,
        unit: option.unit,
        gramsEquivalent: option.grams
      })).filter(Boolean)
    : [];
}

function getIngredientServingOptions(ingredient) {
  const options = [];
  const seen = new Set();

  const pushOption = (option) => {
    if (!option) return;
    const key = `${option.amount}|${normalizeUnit(option.unit)}|${option.gramsEquivalent ?? ''}|${option.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    options.push(option);
  };

  if (Array.isArray(ingredient?.conversions)) {
    ingredient.conversions.map(normalizeConversionOption).filter(Boolean).forEach(pushOption);
  }

  buildLegacyConversionOptions(ingredient).forEach(pushOption);

  return options;
}

function getIngredientServingUnits(ingredient) {
  const units = new Set();

  for (const option of getIngredientServingOptions(ingredient)) {
    const normalized = normalizeUnit(option.unit);
    if (!normalized || isStandardUnit(normalized)) continue;
    units.add(option.unit.trim().toLowerCase());
  }

  return Array.from(units);
}

function findMatchingConversion(ingredient, amount, unit) {
  const normalizedUnit = normalizeUnit(unit);
  const numericAmount = Number(amount);
  const options = getIngredientServingOptions(ingredient).filter(option => normalizeUnit(option.unit) === normalizedUnit);
  return options.find(option => Number(option.amount) === numericAmount) || options[0] || null;
}

function convertWithConversionOption(amount, option) {
  if (!option || !amount || amount <= 0) return null;
  if (option.gramsEquivalent > 0) return amount * (option.gramsEquivalent / option.amount);
  if (normalizeUnit(option.unit) === 'grams') return amount;
  return null;
}

function convertToGrams(amount, unit, ingredient = null) {
  const normalized = normalizeUnit(unit);
  if (!normalized) return null;
  if (normalized === 'grams') return amount;
  if (normalized === 'kilograms') return amount * 1000;
  if (normalized === 'milliliters' || normalized === 'liters') return null;

  const matchingConversion = findMatchingConversion(ingredient, amount, unit);
  if (matchingConversion) {
    return convertWithConversionOption(amount, matchingConversion);
  }

  if (normalized === 'teaspoons' && ingredient?.gramsPerTeaspoon) return amount * ingredient.gramsPerTeaspoon;
  if (normalized === 'tablespoons' && ingredient?.gramsPerTablespoon) return amount * ingredient.gramsPerTablespoon;
  if (normalized === 'cups' && ingredient?.gramsPerCup) return amount * ingredient.gramsPerCup;
  if (normalized === 'pieces' && ingredient?.gramsPerPiece) return amount * ingredient.gramsPerPiece;

  return null;
}

function round(num) {
  return Math.round((Number(num) || 0) * 10) / 10;
}

function sameUnit(unitA, unitB) {
  return normalizeUnit(unitA) === normalizeUnit(unitB);
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

function calculateNutritionFromPer100gValue(gramsUsed, ingredient) {
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

function getSavedQuantityNutrition(ingredient) {
  const direct = {
    calories: getStoredNutrition(ingredient, 'calories'),
    protein: getStoredNutrition(ingredient, 'protein'),
    carbs: getStoredNutrition(ingredient, 'carbs'),
    fats: getStoredNutrition(ingredient, 'fats'),
    sugar: getStoredNutrition(ingredient, 'sugar')
  };

  if (Object.values(direct).some(value => value > 0)) return direct;

  const grams = convertToGrams(Number(ingredient?.quantity), ingredient?.unit, ingredient);
  return calculateNutritionFromPer100gValue(grams, ingredient);
}

function calculateNutritionWithUnit(quantityUsed, unit, ingredient) {
  if (!quantityUsed || quantityUsed <= 0) {
    return { calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0 };
  }

  const matchingConversion = findMatchingConversion(ingredient, quantityUsed, unit);
  if (matchingConversion && ['calories', 'protein', 'carbs', 'fats', 'sugar'].some(field => Number(matchingConversion[field]) > 0)) {
    const factor = Number(quantityUsed) / Number(matchingConversion.amount || 1);
    return {
      calories: round(Number(matchingConversion.calories || 0) * factor),
      protein: round(Number(matchingConversion.protein || 0) * factor),
      carbs: round(Number(matchingConversion.carbs || 0) * factor),
      fats: round(Number(matchingConversion.fats || 0) * factor),
      sugar: round(Number(matchingConversion.sugar || 0) * factor)
    };
  }

  const savedQuantity = Number(ingredient?.quantity);
  const inventoryGrams = convertToGrams(savedQuantity, ingredient?.unit, ingredient);
  const usedGrams = convertToGrams(quantityUsed, unit, ingredient);

  if (hasDirectNutrition(ingredient) && savedQuantity > 0) {
    if (sameUnit(unit, ingredient?.unit)) {
      return calculateNutritionFromRatio(Number(quantityUsed) / savedQuantity, ingredient);
    }

    if (usedGrams > 0 && inventoryGrams > 0) {
      return calculateNutritionFromRatio(usedGrams / inventoryGrams, ingredient);
    }
  }

  if (usedGrams === null || usedGrams <= 0) {
    return { calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0 };
  }

  return calculateNutritionFromPer100gValue(usedGrams, ingredient);
}

function convertFromGrams(grams, unit, ingredient = null) {
  const normalized = normalizeUnit(unit);
  if (!normalized) return null;
  if (normalized === 'grams') return grams;
  if (normalized === 'kilograms') return grams / 1000;
  if (normalized === 'milliliters' || normalized === 'liters') return null;

  if (normalized === 'teaspoons' || normalized === 'tablespoons' || normalized === 'cups' || normalized === 'pieces') {
    const matchingConversion = getIngredientServingOptions(ingredient).find(option => normalizeUnit(option.unit) === normalized && option.gramsEquivalent > 0);
    if (matchingConversion) {
      return grams / (matchingConversion.gramsEquivalent / matchingConversion.amount);
    }
    if (normalized === 'teaspoons' && ingredient?.gramsPerTeaspoon) return grams / ingredient.gramsPerTeaspoon;
    if (normalized === 'tablespoons' && ingredient?.gramsPerTablespoon) return grams / ingredient.gramsPerTablespoon;
    if (normalized === 'cups' && ingredient?.gramsPerCup) return grams / ingredient.gramsPerCup;
    if (normalized === 'pieces' && ingredient?.gramsPerPiece) return grams / ingredient.gramsPerPiece;
    return null;
  }

  return null;
}

function hasKnownConversion(quantityUsed, unit, ingredient) {
  if (!quantityUsed || Number(quantityUsed) <= 0 || !unit || !ingredient) return true;
  if (sameUnit(unit, ingredient.unit)) return true;
  return convertToGrams(Number(quantityUsed), unit, ingredient) !== null;
}

function getConversionWarning(quantityUsed, unit, ingredient) {
  return hasKnownConversion(quantityUsed, unit, ingredient) ? '' : 'Add a custom conversion for this ingredient.';
}

module.exports = {
  VALID_UNITS,
  normalizeUnit,
  isStandardUnit,
  isValidUnit,
  getIngredientServingOptions,
  getIngredientServingUnits,
  getIngredientMeasuringOptions: getIngredientServingOptions,
  getIngredientMeasuringUnits: getIngredientServingUnits,
  convertToGrams,
  convertFromGrams,
  hasKnownConversion,
  getConversionWarning,
  calculateNutritionWithUnit,
  getSavedQuantityNutrition,
  getPer100gValue,
  calculateNutritionFromPer100g: calculateNutritionFromPer100gValue,
  round
};
