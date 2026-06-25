// Unit Conversion Utility
// Converts various units to grams for consistent nutrition calculations

// Default conversion values for general foods
// NOTE: These are approximate values. Different foods have different densities.
// For example: 1 cup of almond flour ≠ 1 cup of Greek yogurt in grams
// We support ingredient-specific overrides in the Ingredient model
const DEFAULT_CONVERSIONS = {
  // Weight conversions
  kilograms: { toGrams: 1000 },
  grams: { toGrams: 1 },
  
  // Volume conversions
  liters: { toMilliliters: 1000 },
  milliliters: { toMilliliters: 1 },
  
  // Common cooking measurements (approximations for general foods)
  teaspoons: { toGrams: 5 },
  tablespoons: { toGrams: 15 },
  cups: { toGrams: 240 },
  
  // Piece (cannot convert without ingredient-specific data)
  pieces: { toGrams: null }
};

// List of all valid units
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

/**
 * Normalize unit name (case-insensitive, handle common aliases)
 * @param {string} unit - The unit to normalize
 * @returns {string} - Normalized unit name
 */
function normalizeUnit(unit) {
  if (!unit) return null;
  const normalized = unit.toLowerCase().trim();
  
  // Common aliases
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

/**
 * Check if a unit is valid
 * @param {string} unit - Unit to validate
 * @returns {boolean}
 */
function isValidUnit(unit) {
  const normalized = normalizeUnit(unit);
  return VALID_UNITS.includes(normalized);
}

/**
 * Convert an amount from one unit to another
 * @param {number} amount - The amount to convert
 * @param {string} fromUnit - Source unit
 * @param {string} toUnit - Target unit
 * @param {object} ingredient - Optional ingredient object with custom conversions
 * @returns {number} - Converted amount, or null if conversion not possible
 */
function convert(amount, fromUnit, toUnit, ingredient = null) {
  if (!amount || amount <= 0) return 0;
  
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  
  if (!from || !to) return null;
  if (!isValidUnit(from) || !isValidUnit(to)) return null;
  
  if (from === to) return amount;
  
  // Special handling for pieces - cannot convert without ingredient data
  if (from === 'pieces' || to === 'pieces') {
    if (from === 'pieces' && to === 'grams') {
      if (ingredient && ingredient.gramsPerPiece) {
        return amount * ingredient.gramsPerPiece;
      }
      return null; // Cannot convert pieces without gramsPerPiece
    }
    if (from === 'grams' && to === 'pieces') {
      if (ingredient && ingredient.gramsPerPiece) {
        return amount / ingredient.gramsPerPiece;
      }
      return null;
    }
    return null; // Cannot convert between pieces and non-grams
  }
  
  // Convert to grams as intermediate unit
  let grams = convertToGrams(amount, from, ingredient);
  if (grams === null) return null;
  
  // Convert from grams to target unit
  return convertFromGrams(grams, to, ingredient);
}

/**
 * Convert any unit to grams
 * @param {number} amount
 * @param {string} unit
 * @param {object} ingredient - Optional ingredient with custom conversions
 * @returns {number} grams, or null if cannot convert
 */
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
    return null; // Cannot convert pieces without data
  }
  
  return null;
}

function getConversionWarning(unit, ingredient = null) {
  const normalized = normalizeUnit(unit);

  if (normalized === 'teaspoons' && !ingredient?.gramsPerTeaspoon) {
    return 'Add a custom conversion for this ingredient.';
  }

  if (normalized === 'tablespoons' && !ingredient?.gramsPerTablespoon) {
    return 'Add a custom conversion for this ingredient.';
  }

  if (normalized === 'cups' && !ingredient?.gramsPerCup) {
    return 'Add a custom conversion for this ingredient.';
  }

  if (normalized === 'milliliters' || normalized === 'liters') {
    return 'Add a custom conversion for this ingredient.';
  }

  return '';
}

/**
 * Convert from grams to any other unit
 * @param {number} grams
 * @param {string} unit
 * @param {object} ingredient - Optional ingredient with custom conversions
 * @returns {number} converted amount, or null if cannot convert
 */
function convertFromGrams(grams, unit, ingredient = null) {
  const normalized = normalizeUnit(unit);
  
  if (!normalized) return null;
  if (normalized === 'grams') return grams;
  
  if (normalized === 'kilograms') {
    return grams / 1000;
  }
  
  if (normalized === 'milliliters' || normalized === 'liters') {
    // Grams to ML assumes 1:1 for water/most liquids
    const ml = grams;
    return normalized === 'milliliters' ? ml : ml / 1000;
  }
  
  if (normalized === 'teaspoons') {
    const gramsPerTsp = ingredient?.gramsPerTeaspoon || DEFAULT_CONVERSIONS.teaspoons.toGrams;
    return grams / gramsPerTsp;
  }
  
  if (normalized === 'tablespoons') {
    const gramsPerTbsp = ingredient?.gramsPerTablespoon || DEFAULT_CONVERSIONS.tablespoons.toGrams;
    return grams / gramsPerTbsp;
  }
  
  if (normalized === 'cups') {
    const gramsPerCup = ingredient?.gramsPerCup || DEFAULT_CONVERSIONS.cups.toGrams;
    return grams / gramsPerCup;
  }
  
  if (normalized === 'pieces') {
    if (ingredient?.gramsPerPiece) {
      return grams / ingredient.gramsPerPiece;
    }
    return null;
  }
  
  return null;
}

/**
 * Calculate nutrition based on amount used and per-100g values
 * @param {number} gramsUsed - Amount used in grams
 * @param {object} nutritionPer100g - { caloriesPer100g, proteinPer100g, etc }
 * @returns {object} - Calculated nutrition values
 */
function calculateNutrition(gramsUsed, nutritionPer100g) {
  if (!gramsUsed || !nutritionPer100g) {
    return { calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0 };
  }
  
  const factor = gramsUsed / 100;
  return {
    calories: round((nutritionPer100g.caloriesPer100g || 0) * factor),
    protein: round((nutritionPer100g.proteinPer100g || 0) * factor),
    carbs: round((nutritionPer100g.carbsPer100g || 0) * factor),
    fats: round((nutritionPer100g.fatsPer100g || 0) * factor),
    sugar: round((nutritionPer100g.sugarPer100g || 0) * factor)
  };
}

/**
 * Round to 1 decimal place
 * @param {number} num
 * @returns {number}
 */
function round(num) {
  return Math.round((Number(num) || 0) * 10) / 10;
}

module.exports = {
  VALID_UNITS,
  DEFAULT_CONVERSIONS,
  normalizeUnit,
  isValidUnit,
  convert,
  convertToGrams,
  convertFromGrams,
  getConversionWarning,
  calculateNutrition,
  round
};
