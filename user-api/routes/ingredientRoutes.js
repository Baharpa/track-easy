const express = require('express');
const auth = require('../config/auth');
const Ingredient = require('../models/Ingredient');
const { isValidUnit, normalizeUnit } = require('../utils/unitConverter');
const router = express.Router();

function validateIngredient(body) {
  if (!body.name) return 'Ingredient name is required.';
  if (!body.category) return 'Category is required.';
  if (Number(body.quantity) <= 0) return 'Quantity must be a positive number.';
  if (!isValidUnit(body.unit)) return 'Please choose a valid unit.';

  const nutritionFields = [
    'calories',
    'protein',
    'carbs',
    'fats',
    'sugar',
    'caloriesPer100g',
    'proteinPer100g',
    'carbsPer100g',
    'fatsPer100g',
    'sugarPer100g',
    'saturatedFat',
    'transFat',
    'fiber',
    'sodium',
    'cholesterol'
  ];
  if (nutritionFields.some(field => Number(body[field]) < 0)) return 'Nutrition values cannot be negative.';

  const conversionFields = ['gramsPerTeaspoon', 'gramsPerTablespoon', 'gramsPerCup', 'gramsPerPiece'];
  if (conversionFields.some(field => body[field] !== undefined && body[field] !== '' && Number(body[field]) < 0)) {
    return 'Conversion values cannot be negative.';
  }

  return '';
}

function cleanIngredientBody(body) {
  const cleaned = { ...body, unit: normalizeUnit(body.unit) };
  ['servingSize', 'calories', 'protein', 'carbs', 'fats', 'sugar', 'caloriesPer100g', 'proteinPer100g', 'carbsPer100g', 'fatsPer100g', 'sugarPer100g', 'saturatedFat', 'transFat', 'fiber', 'sodium', 'cholesterol', 'gramsPerTeaspoon', 'gramsPerTablespoon', 'gramsPerCup', 'gramsPerPiece', 'quantity'].forEach(field => {
    if (cleaned[field] === '') cleaned[field] = undefined;
  });
  return cleaned;
}

router.get('/', auth, async (req, res) => {
  const ingredients = await Ingredient.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(ingredients);
});

router.post('/', auth, async (req, res) => {
  try {
    const validationMessage = validateIngredient(req.body);
    if (validationMessage) return res.status(400).json({ message: validationMessage });

    const ingredient = await Ingredient.create({ ...cleanIngredientBody(req.body), userId: req.user._id });
    res.status(201).json(ingredient);
  } catch (err) {
    res.status(400).json({ message: 'Could not create ingredient.', error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  const ingredient = await Ingredient.findOne({ _id: req.params.id, userId: req.user._id });
  if (!ingredient) return res.status(404).json({ message: 'Ingredient not found.' });
  res.json(ingredient);
});

router.put('/:id', auth, async (req, res) => {
  const validationMessage = validateIngredient(req.body);
  if (validationMessage) return res.status(400).json({ message: validationMessage });

  const ingredient = await Ingredient.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    cleanIngredientBody(req.body),
    { new: true }
  );
  if (!ingredient) return res.status(404).json({ message: 'Ingredient not found.' });
  res.json(ingredient);
});

router.delete('/:id', auth, async (req, res) => {
  const ingredient = await Ingredient.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!ingredient) return res.status(404).json({ message: 'Ingredient not found.' });
  res.json({ message: 'Ingredient deleted.' });
});

module.exports = router;
