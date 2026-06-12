const express = require('express');
const router = express.Router();
const Ingredient = require('../models/Ingredient');
const { convertToGrams, convertFromGrams } = require('../utils/unitConverter');

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

    // Allowed units
    const VALID_UNITS = ['grams', 'kilograms', 'milliliters', 'liters', 'teaspoons', 'tablespoons', 'cups', 'pieces'];
    if (!VALID_UNITS.includes(fromUnit) || !VALID_UNITS.includes(toUnit)) {
      return res.status(400).json({ success: false, error: `Invalid unit. Allowed: ${VALID_UNITS.join(', ')}` });
    }

    // Check if we need ingredient-specific data
    const needsIngredient = ['teaspoons', 'tablespoons', 'cups', 'pieces'].includes(fromUnit) || 
                           ['teaspoons', 'tablespoons', 'cups', 'pieces'].includes(toUnit);

    let ingredient = null;
    let ingredientName = 'generic food';
    let warning = null;

    if (needsIngredient && ingredientId) {
      ingredient = await Ingredient.findById(ingredientId);
      if (ingredient) {
        ingredientName = ingredient.name;
        // Check if this is a default conversion (no custom values set)
        const hasCustomConversion = ingredient.gramsPerTeaspoon || ingredient.gramsPerTablespoon || ingredient.gramsPerCup || ingredient.gramsPerPiece;
        if (!hasCustomConversion) {
          warning = 'This is a default estimate. For better accuracy, add ingredient-specific conversion values.';
        }
      }
    } else if (needsIngredient && !ingredientId) {
      // For food-specific conversions without ingredient data, use defaults but warn
      warning = 'Using default conversions. For food-specific accuracy, select an ingredient.';
    }

    // Special case: pieces conversion
    if ((fromUnit === 'pieces' || toUnit === 'pieces') && !ingredient?.gramsPerPiece) {
      return res.status(400).json({ 
        success: false, 
        error: 'Pieces cannot be converted unless grams per piece is set for this ingredient.' 
      });
    }

    // Convert to grams first
    let gramsUsed = convertToGrams(amount, fromUnit, ingredient);
    
    if (gramsUsed === null) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot convert from ${fromUnit}` 
      });
    }

    // Convert from grams to target unit
    let result = convertFromGrams(gramsUsed, toUnit, ingredient);

    if (result === null) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot convert to ${toUnit}` 
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

    const message = `${amount} ${unitLabels[fromUnit]} ${ingredientName} = ${result} ${unitLabels[toUnit]}`;

    res.json({
      success: true,
      amount,
      fromUnit,
      toUnit,
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
