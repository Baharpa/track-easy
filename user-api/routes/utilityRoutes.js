const express = require('express');
const router = express.Router();
const Ingredient = require('../models/Ingredient');
const { convertToGrams, convertFromGrams, hasKnownConversion, normalizeUnit } = require('../utils/unitConverter');

/**
 * POST /api/convert
 * Convert an amount from one unit to another
 * 
 * Body:
 * {
 *   amount: number,
 *   fromUnit: string,
 *   toUnit: string,
 *   ingredientId?: string (required for food-specific conversions)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   amount: number,
 *   fromUnit: string,
 *   toUnit: string,
 *   result: number,
 *   ingredientName?: string,
 *   message: string,
 *   warning?: string
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { amount, fromUnit, toUnit, ingredientId } = req.body;

    // Validate input
    if (amount === null || amount === undefined || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
    }

    if (!fromUnit || !toUnit) {
      return res.status(400).json({ success: false, error: 'From unit and to unit are required' });
    }

    const cleanFromUnit = normalizeUnit(fromUnit);
    const cleanToUnit = normalizeUnit(toUnit);

    // Allowed units
    const VALID_UNITS = ['grams', 'kilograms', 'milliliters', 'liters', 'teaspoons', 'tablespoons', 'cups', 'pieces'];
    if (!VALID_UNITS.includes(cleanFromUnit) || !VALID_UNITS.includes(cleanToUnit)) {
      return res.status(400).json({ success: false, error: `Invalid unit. Allowed: ${VALID_UNITS.join(', ')}` });
    }

    let ingredient = null;
    let ingredientName = 'generic food';
    let warning = null;

    if (ingredientId) {
      ingredient = await Ingredient.findById(ingredientId);
      if (ingredient) {
        ingredientName = ingredient.name;
        warning = hasKnownConversion(1, cleanFromUnit, ingredient) && hasKnownConversion(1, cleanToUnit, ingredient)
          ? null
          : 'Add a custom conversion for this ingredient.';
      }
    }

    // Convert to grams first
    let gramsUsed = convertToGrams(amount, cleanFromUnit, ingredient);

    if (gramsUsed === null) {
      return res.status(400).json({
        success: false,
        error: `Cannot convert from ${cleanFromUnit}`
      });
    }

    // Convert from grams to target unit
    let result = convertFromGrams(gramsUsed, cleanToUnit, ingredient);

    if (result === null) {
      return res.status(400).json({
        success: false,
        error: `Cannot convert to ${cleanToUnit}`
      });
    }

    // Round to 2 decimal places
    result = Math.round(result * 100) / 100;

    // Build message
    const unitLabels = {
      grams: 'g',
      kilograms: 'kg',
      milliliters: 'ml',
      liters: 'L',
      teaspoons: 'tsp',
      tablespoons: 'tbsp',
      cups: 'cups',
      pieces: 'pieces'
    };

    const message = `${amount} ${unitLabels[cleanFromUnit]} ${ingredientName} = ${result} ${unitLabels[cleanToUnit]}`;

    res.json({
      success: true,
      amount,
      fromUnit: cleanFromUnit,
      toUnit: cleanToUnit,
      result,
      ingredientName,
      message,
      warning
    });
  } catch (err) {
    console.error('Conversion error:', err);
    res.status(500).json({ success: false, error: 'Server error during conversion' });
  }
});

module.exports = router;
