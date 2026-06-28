const express = require('express');
const auth = require('../config/auth');
const Meal = require('../models/Meal');
const Ingredient = require('../models/Ingredient');
const DailyLog = require('../models/DailyLog');
const { addTotals, round, calculateNutritionWithUnit } = require('../utils/nutrition');
const { convertToGrams, normalizeUnit, getIngredientServingOptions } = require('../utils/unitConverter');
const {
  hydrateLoggedMeal,
  hydrateMealDocument,
  buildPortionLogFromMeal,
  buildComponentLogFromMeal
} = require('../utils/logHydration');
const router = express.Router();

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function dateString(date) {
  return date.toISOString().slice(0, 10);
}

function requestedLogDate(req) {
  return req.query.date || req.body.date || todayString();
}

function loggedMealTime(meal) {
  const directDate = meal.loggedAt || meal.createdAt;
  if (directDate) {
    const time = new Date(directDate).getTime();
    if (!Number.isNaN(time)) return time;
  }

  if (meal._id?.getTimestamp) return meal._id.getTimestamp().getTime();
  const id = String(meal._id || '');
  if (/^[a-f\d]{24}$/i.test(id)) return parseInt(id.slice(0, 8), 16) * 1000;
  return 0;
}

function sortLoggedMealsNewestFirst(meals = []) {
  return [...meals].sort((a, b) => loggedMealTime(b) - loggedMealTime(a));
}

function currentMonday(offsetWeeks = 0) {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setDate(date.getDate() - (Number(offsetWeeks) || 0) * 7);
  date.setHours(0, 0, 0, 0);
  return date;
}

function recalculate(log) {
  log.totalCalories = round(log.meals.reduce((sum, meal) => sum + (Number(meal.calories) || 0), 0));
  log.totalProtein = round(log.meals.reduce((sum, meal) => sum + (Number(meal.protein) || 0), 0));
  log.totalCarbs = round(log.meals.reduce((sum, meal) => sum + (Number(meal.carbs) || 0), 0));
  log.totalFats = round(log.meals.reduce((sum, meal) => sum + (Number(meal.fats) || 0), 0));
  log.totalSugar = round(log.meals.reduce((sum, meal) => sum + (Number(meal.sugar) || 0), 0));
}

function buildIngredientLog(ingredient, amount, unit) {
  const cleanAmount = Number(amount);
  const cleanUnit = normalizeUnit(unit || ingredient.unit || 'grams');
  if (!cleanAmount || cleanAmount <= 0) throw new Error('Amount must be a positive number.');

  const matchingServing = getIngredientServingOptions(ingredient).find(option => normalizeUnit(option.unit) === cleanUnit && Number(option.amount) === cleanAmount);
  const gramsUsed = matchingServing?.gramsEquivalent > 0
    ? round(cleanAmount * (matchingServing.gramsEquivalent / matchingServing.amount))
    : convertToGrams(cleanAmount, cleanUnit, ingredient);
  const nutrition = calculateNutritionWithUnit(cleanAmount, cleanUnit, ingredient);

  return {
    type: 'ingredient',
    ingredientId: ingredient._id,
    name: ingredient.name,
    amount: round(cleanAmount),
    unit: cleanUnit,
    gramsUsed: gramsUsed > 0 ? round(gramsUsed) : null,
    portion: 1,
    portionLabel: `${round(cleanAmount)} ${cleanUnit}`,
    servings: 1,
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fats: nutrition.fats,
    sugar: nutrition.sugar,
    ingredients: [{
      ingredientId: ingredient._id,
      name: ingredient.name,
      quantityUsed: round(cleanAmount),
      unit: cleanUnit,
      gramsUsed: gramsUsed > 0 ? round(gramsUsed) : null,
      ...nutrition
    }],
    components: []
  };
}

router.post('/log', auth, async (req, res) => {
  try {
    const isIngredientLog = req.body.type === 'ingredient' || (req.body.ingredientId && req.body.type !== 'meal');
    const date = req.body.date || todayString();
    let log = await DailyLog.findOne({ userId: req.user._id, date });
    if (!log) log = new DailyLog({ userId: req.user._id, date, meals: [] });

    let loggedMeal;
    if (isIngredientLog) {
      if (!req.body.ingredientId) return res.status(400).json({ message: 'Ingredient is required.' });
      const ingredient = await Ingredient.findOne({ _id: req.body.ingredientId, userId: req.user._id });
      if (!ingredient) return res.status(404).json({ message: 'Ingredient not found.' });
      loggedMeal = buildIngredientLog(ingredient, req.body.amount || req.body.quantityUsed, req.body.unit);
    } else {
      if (!req.body.mealId) return res.status(400).json({ message: 'Meal is required.' });
      const meal = await Meal.findOne({ _id: req.body.mealId, userId: req.user._id });
      if (!meal) return res.status(404).json({ message: 'Meal not found.' });
      const hasComponentAmounts = meal.components?.length > 0 && req.body.componentPortions?.length > 0;
      const portion = Number(req.body.portion || req.body.servings || req.body.portionFactor || 1);
      const portionMode = req.body.portionMode || (hasComponentAmounts ? 'customize' : 'whole');
      const loggedGrams = Number(req.body.loggedGrams || 0);
      if (!hasComponentAmounts && portion <= 0) return res.status(400).json({ message: 'Portion must be a positive number.' });
      const portionLabel = req.body.portionLabel || (req.body.servings ? `${portion} serving${portion === 1 ? '' : 's'}` : '1 whole meal');
      const hydratedMeal = await hydrateMealDocument(req.user._id, meal);
      loggedMeal = hasComponentAmounts
        ? buildComponentLogFromMeal(hydratedMeal, req.body.componentPortions)
        : buildPortionLogFromMeal(hydratedMeal, portion, portionLabel, {
            portionMode,
            portionFactor: portion,
            loggedGrams
          });
    }

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
  if (!log) {
    return res.json({ date, meals: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, totalSugar: 0 });
  }

  const hydratedMeals = [];
  for (const meal of log.meals || []) {
    hydratedMeals.push(await hydrateLoggedMeal(req.user._id, meal));
  }

  const result = log.toObject();
  result.meals = sortLoggedMealsNewestFirst(hydratedMeals);
  recalculate(result);
  res.json(result);
});

router.get('/week', auth, async (req, res) => {
  const offset = Math.max(0, Math.min(3, Number(req.query.offset) || 0));
  const start = currentMonday(offset);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  const startString = dateString(days[0]);
  const endString = dateString(days[6]);
  const logs = await DailyLog.find({ userId: req.user._id, date: { $gte: startString, $lte: endString } }).sort({ date: 1 });
  const hydratedLogs = [];
  for (const log of logs) {
    const hydratedMeals = [];
    for (const meal of log.meals || []) {
      hydratedMeals.push(await hydrateLoggedMeal(req.user._id, meal));
    }
    const item = log.toObject();
    item.meals = sortLoggedMealsNewestFirst(hydratedMeals);
    recalculate(item);
    hydratedLogs.push(item);
  }
  const logsByDate = new Map(hydratedLogs.map(log => [log.date, log]));

  res.json(days.map(day => {
    const date = dateString(day);
    const log = logsByDate.get(date);
    return log ? {
      ...log,
      dayLabel: day.toLocaleDateString('en-US', { weekday: 'short' }),
      hasLogs: (log.meals || []).length > 0
    } : {
      date,
      dayLabel: day.toLocaleDateString('en-US', { weekday: 'short' }),
      meals: [],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFats: 0,
      totalSugar: 0,
      hasLogs: false
    };
  }));
});

// GET logged food by ID
router.get('/log/:logMealId', auth, async (req, res) => {
  const date = requestedLogDate(req);
  const log = await DailyLog.findOne({ userId: req.user._id, date });
  if (!log) return res.status(404).json({ message: 'No logs for today.' });

  const mealIndex = log.meals.findIndex(m => m._id && m._id.toString() === req.params.logMealId);
  if (mealIndex === -1) return res.status(404).json({ message: 'Logged meal not found.' });

  const meal = await hydrateLoggedMeal(req.user._id, log.meals[mealIndex]);
  res.json({ ...meal, date });
});

// PUT update logged meal portion
router.put('/log/:logMealId', auth, async (req, res) => {
  const date = requestedLogDate(req);
  const log = await DailyLog.findOne({ userId: req.user._id, date });
  if (!log) return res.status(404).json({ message: 'No logs for today.' });

  const mealIndex = log.meals.findIndex(m => m._id && m._id.toString() === req.params.logMealId);
  if (mealIndex === -1) return res.status(404).json({ message: 'Logged meal not found.' });

  const meal = log.meals[mealIndex];
  const existingLogMeta = {
    _id: meal._id,
    loggedAt: meal.loggedAt
  };

  if (meal.type === 'ingredient' || meal.ingredientId) {
    const ingredient = await Ingredient.findOne({ _id: meal.ingredientId, userId: req.user._id });
    if (!ingredient) return res.status(404).json({ message: 'Ingredient not found.' });

    const amount = Number(req.body.amount || req.body.quantityUsed);
    const unit = req.body.unit || meal.unit || ingredient.unit || 'grams';
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount must be positive.' });
    if (!hasKnownConversion(amount, unit, ingredient)) return res.status(400).json({ message: 'Add a custom conversion for this ingredient.' });

    const updatedIngredientLog = await hydrateLoggedMeal(req.user._id, {
      ...meal.toObject(),
      amount,
      unit,
      ingredientId: ingredient._id
    });
    log.meals[mealIndex] = { ...updatedIngredientLog, ...existingLogMeta };
  } else {
    const originalMeal = await Meal.findOne({ _id: meal.mealId, userId: req.user._id });
    if (!originalMeal) return res.status(404).json({ message: 'Original meal not found.' });

    const hydratedMeal = await hydrateMealDocument(req.user._id, originalMeal);
    const hasComponentAmounts = Array.isArray(req.body.componentPortions) && req.body.componentPortions.length > 0;
    if (hasComponentAmounts) {
      log.meals[mealIndex] = {
        ...buildComponentLogFromMeal(hydratedMeal, req.body.componentPortions),
        ...existingLogMeta
      };
    } else {
      const newPortion = Number(req.body.portion || req.body.servings || req.body.portionFactor || 1);
      if (newPortion <= 0) return res.status(400).json({ message: 'Portion must be positive.' });
      log.meals[mealIndex] = {
        ...buildPortionLogFromMeal(hydratedMeal, newPortion, req.body.portionLabel || meal.portionLabel || '1 whole meal', {
          portionMode: req.body.portionMode || meal.portionMode || 'whole',
          portionFactor: req.body.portionFactor || newPortion,
          loggedGrams: req.body.loggedGrams || meal.loggedGrams || 0
        }),
        ...existingLogMeta
      };
    }
  }

  recalculate(log);
  await log.save();
  res.json(log);
});

// DELETE logged food
router.delete('/log/:logMealId', auth, async (req, res) => {
  const date = requestedLogDate(req);
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
