const express = require('express');
const auth = require('../config/auth');
const Meal = require('../models/Meal');
const Ingredient = require('../models/Ingredient');
const { calculateNutritionWithUnit, addTotals, calculateComponentPortion, round } = require('../utils/nutrition');
const { convertToGrams, getConversionWarning, isValidUnit, normalizeUnit } = require('../utils/unitConverter');
const router = express.Router();
const MEAL_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Beverage', 'Other'];

function normalizeMealCategory(category) {
  const cleanCategory = String(category || '').trim().toLowerCase();
  return MEAL_CATEGORIES.find(item => item.toLowerCase() === cleanCategory) || 'Other';
}

async function buildMealIngredients(userId, selectedIngredients) {
  const built = [];

  for (const item of selectedIngredients || []) {
    const ingredientId = item.ingredientId?._id || item.ingredientId || item._id;

    if (!ingredientId) {
      throw new Error('Ingredient id is required.');
    }

    const ingredient = await Ingredient.findOne({ _id: ingredientId, userId });

    if (!ingredient) {
      throw new Error('Ingredient not found.');
    }

    const quantityUsed = Number(item.quantityUsed);
    const unit = normalizeUnit(item.unit || 'grams');

    if (!quantityUsed || quantityUsed <= 0) {
      throw new Error('Ingredient amounts must be positive numbers.');
    }

    if (!isValidUnit(unit)) {
      throw new Error('Please choose a valid unit.');
    }

    const convertedGrams = convertToGrams(quantityUsed, unit, ingredient);
    const gramsUsed = convertedGrams || (unit === 'pieces' && normalizeUnit(ingredient.unit) === 'pieces' ? quantityUsed : 0);
    if (!gramsUsed || gramsUsed <= 0) {
      throw new Error(`Cannot convert ${ingredient.name}. Pieces need grams per piece.`);
    }

    const nutrition = calculateNutritionWithUnit(quantityUsed, unit, ingredient);

    built.push({
      ingredientId: ingredient._id,
      name: ingredient.name,
      quantityUsed: round(gramsUsed),
      unit: 'grams',
      originalQuantityUsed: quantityUsed,
      originalUnit: unit,
      gramsUsed: round(gramsUsed),
      conversionWarning: getConversionWarning(unit, ingredient),
      ...nutrition
    });
  }

  return built;
}

async function buildMealComponents(userId, components) {
  const builtComponents = [];
  const allConsumedIngredients = [];

  for (const component of components || []) {
    const originalIngredients = await buildMealIngredients(userId, component.ingredients || []);
    if (originalIngredients.length === 0) {
      throw new Error('A component must have at least one ingredient.');
    }

    const totalWeight = originalIngredients.reduce((sum, item) => sum + Number(item.gramsUsed || 0), 0);
    const totals = addTotals(originalIngredients);
    allConsumedIngredients.push(...originalIngredients);

    builtComponents.push({
      name: component.name || 'Component',
      category: component.category || 'Other',
      ingredients: originalIngredients,
      totalWeight: round(totalWeight),
      nutritionTotals: totals
    });
  }

  return { builtComponents, allConsumedIngredients };
}

async function buildMealBody(req) {
  let ingredients = [];
  let components = [];

  if (req.body.components && req.body.components.length > 0) {
    const result = await buildMealComponents(req.user._id, req.body.components);
    components = result.builtComponents;
    ingredients = result.allConsumedIngredients;
  } else {
    ingredients = await buildMealIngredients(req.user._id, req.body.ingredients);
  }

  if (ingredients.length === 0 && components.length === 0) {
    throw new Error('Meal must have at least one ingredient or component.');
  }

  const totals = addTotals(ingredients);

  return {
    name: req.body.name,
    category: normalizeMealCategory(req.body.category),
    imageUrl: req.body.imageUrl || '',
    components,
    ingredients,
    totalCalories: totals.calories,
    totalProtein: totals.protein,
    totalCarbs: totals.carbs,
    totalFats: totals.fats,
    totalSugar: totals.sugar,
    userId: req.user._id
  };
}

router.get('/', auth, async (req, res) => {
  const meals = await Meal.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(meals);
});

router.post('/', auth, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ message: 'Meal name is required.' });
    const mealBody = await buildMealBody(req);
    const meal = await Meal.create(mealBody);
    res.status(201).json(meal);
  } catch (err) {
    res.status(400).json({ message: 'Could not create meal.', error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  const meal = await Meal.findOne({ _id: req.params.id, userId: req.user._id });
  if (!meal) return res.status(404).json({ message: 'Meal not found.' });
  res.json(meal);
});

router.put('/:id', auth, async (req, res) => {
  try {
    const mealBody = await buildMealBody(req);
    delete mealBody.userId;

    const meal = await Meal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      mealBody,
      { new: true }
    );

    if (!meal) return res.status(404).json({ message: 'Meal not found.' });
    res.json(meal);
  } catch (err) {
    res.status(400).json({ message: 'Could not update meal.', error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  const meal = await Meal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!meal) return res.status(404).json({ message: 'Meal not found.' });
  res.json({ message: 'Meal deleted.' });
});

module.exports = router;
