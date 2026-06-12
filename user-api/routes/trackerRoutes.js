const express = require('express');
const auth = require('../config/auth');
const Meal = require('../models/Meal');
const DailyLog = require('../models/DailyLog');
const { addTotals, round } = require('../utils/nutrition');
const { convertToGrams } = require('../utils/unitConverter');
const router = express.Router();

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function recalculate(log) {
  log.totalCalories = round(log.meals.reduce((sum, meal) => sum + (Number(meal.calories) || 0), 0));
  log.totalProtein = round(log.meals.reduce((sum, meal) => sum + (Number(meal.protein) || 0), 0));
  log.totalCarbs = round(log.meals.reduce((sum, meal) => sum + (Number(meal.carbs) || 0), 0));
  log.totalFats = round(log.meals.reduce((sum, meal) => sum + (Number(meal.fats) || 0), 0));
  log.totalSugar = round(log.meals.reduce((sum, meal) => sum + (Number(meal.sugar) || 0), 0));
}

function scaleIngredient(item, factor) {
  return {
    ingredientId: item.ingredientId,
    name: item.name,
    quantityUsed: round(Number(item.quantityUsed || item.gramsUsed || 0) * factor),
    unit: 'grams',
    calories: round(Number(item.calories || 0) * factor),
    protein: round(Number(item.protein || 0) * factor),
    carbs: round(Number(item.carbs || 0) * factor),
    fats: round(Number(item.fats || 0) * factor),
    sugar: round(Number(item.sugar || 0) * factor)
  };
}

function buildPortionLog(meal, portion, portionLabel) {
  const ingredients = (meal.ingredients || []).map(item => scaleIngredient(item, portion));
  const components = (meal.components || []).map(component => {
    const componentIngredients = (component.ingredients || []).map(item => scaleIngredient(item, portion));
    return {
      name: component.name,
      category: component.category,
      eatenWeight: round(Number(component.totalWeight || 0) * portion),
      unit: 'grams',
      ingredients: componentIngredients,
      nutritionTotals: addTotals(componentIngredients)
    };
  });

  const totals = addTotals(ingredients);
  return {
    mealId: meal._id,
    name: meal.name,
    portion,
    portionLabel,
    servings: portion,
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fats: totals.fats,
    sugar: totals.sugar,
    ingredients,
    components
  };
}

function buildComponentLog(meal, componentPortions) {
  const components = [];
  const allIngredients = [];

  for (const componentInput of componentPortions || []) {
    const component = meal.components[Number(componentInput.componentIndex)];
    if (!component) continue;

    const eatenWeight = convertToGrams(Number(componentInput.eatenAmount), componentInput.unit || 'grams');
    if (!eatenWeight || eatenWeight <= 0) throw new Error('Component eaten amount must be positive.');
    if (Number(component.totalWeight) > 0 && eatenWeight > Number(component.totalWeight)) {
      throw new Error('Component eaten amount cannot be bigger than the original component weight.');
    }

    const factor = Number(component.totalWeight) > 0 ? eatenWeight / Number(component.totalWeight) : 0;
    const ingredients = (component.ingredients || []).map(item => scaleIngredient(item, factor));
    const nutritionTotals = addTotals(ingredients);
    allIngredients.push(...ingredients);
    components.push({
      name: component.name,
      category: component.category,
      eatenWeight: round(eatenWeight),
      unit: 'grams',
      ingredients,
      nutritionTotals
    });
  }

  const totals = addTotals(allIngredients);
  return {
    mealId: meal._id,
    name: meal.name,
    portion: 1,
    portionLabel: 'custom component amounts',
    servings: 1,
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fats: totals.fats,
    sugar: totals.sugar,
    ingredients: allIngredients,
    components
  };
}

router.post('/log', auth, async (req, res) => {
  const meal = await Meal.findOne({ _id: req.body.mealId, userId: req.user._id });
  if (!meal) return res.status(404).json({ message: 'Meal not found.' });

  try {
    const date = req.body.date || todayString();
    const hasComponentAmounts = meal.components?.length > 0 && req.body.componentPortions?.length > 0;
    const portion = Number(req.body.portion || req.body.servings || 1);
    if (!hasComponentAmounts && portion <= 0) return res.status(400).json({ message: 'Portion must be a positive number.' });
    const portionLabel = req.body.portionLabel || (req.body.servings ? `${portion} serving${portion === 1 ? '' : 's'}` : '1 whole meal');

    let log = await DailyLog.findOne({ userId: req.user._id, date });
    if (!log) log = new DailyLog({ userId: req.user._id, date, meals: [] });

    const loggedMeal = hasComponentAmounts
      ? buildComponentLog(meal, req.body.componentPortions)
      : buildPortionLog(meal, portion, portionLabel);

    log.meals.push(loggedMeal);

    recalculate(log);
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Could not log meal.' });
  }
});

router.get('/today', auth, async (req, res) => {
  const date = todayString();
  const log = await DailyLog.findOne({ userId: req.user._id, date });
  res.json(log || { date, meals: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, totalSugar: 0 });
});

router.get('/week', auth, async (req, res) => {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const startString = start.toISOString().slice(0, 10);
  const logs = await DailyLog.find({ userId: req.user._id, date: { $gte: startString } }).sort({ date: 1 });
  res.json(logs);
});

// GET logged meal by ID
router.get('/log/:logMealId', auth, async (req, res) => {
  const date = todayString();
  const log = await DailyLog.findOne({ userId: req.user._id, date });
  if (!log) return res.status(404).json({ message: 'No logs for today.' });
  
  // Find meal by checking index or ID
  const mealIndex = log.meals.findIndex(m => m._id && m._id.toString() === req.params.logMealId);
  if (mealIndex === -1) return res.status(404).json({ message: 'Logged meal not found.' });
  
  const meal = log.meals[mealIndex];
  res.json({ ...meal.toObject(), date });
});

// PUT update logged meal portion
router.put('/log/:logMealId', auth, async (req, res) => {
  const date = todayString();
  const log = await DailyLog.findOne({ userId: req.user._id, date });
  if (!log) return res.status(404).json({ message: 'No logs for today.' });
  
  const mealIndex = log.meals.findIndex(m => m._id && m._id.toString() === req.params.logMealId);
  if (mealIndex === -1) return res.status(404).json({ message: 'Logged meal not found.' });
  
  const meal = log.meals[mealIndex];
  
  // Get original meal to recalculate nutrition
  const originalMeal = await Meal.findOne({ _id: meal.mealId, userId: req.user._id });
  if (!originalMeal) return res.status(404).json({ message: 'Original meal not found.' });
  
  const newPortion = Number(req.body.portion || 1);
  if (newPortion <= 0) return res.status(400).json({ message: 'Portion must be positive.' });
  
  log.meals[mealIndex] = buildPortionLog(originalMeal, newPortion, req.body.portionLabel || '1 whole meal');
  
  recalculate(log);
  await log.save();
  res.json(log);
});

// DELETE logged meal
router.delete('/log/:logMealId', auth, async (req, res) => {
  const date = todayString();
  const log = await DailyLog.findOne({ userId: req.user._id, date });
  if (!log) return res.status(404).json({ message: 'No logs for today.' });
  
  const mealIndex = log.meals.findIndex(m => m._id && m._id.toString() === req.params.logMealId);
  if (mealIndex === -1) return res.status(404).json({ message: 'Logged meal not found.' });
  
  // Remove meal from array
  log.meals.splice(mealIndex, 1);
  
  recalculate(log);
  await log.save();
  res.json(log);
});

module.exports = router;
