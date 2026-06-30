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

function timezoneOffset(req) {
  const value = Number(req.query.timezoneOffset ?? req.body?.timezoneOffset ?? 0);
  return Number.isFinite(value) && Math.abs(value) <= 14 * 60 ? value : 0;
}

function timezoneName(req) {
  const value = String(req.query.timezone || req.body?.timezone || '').trim();
  if (!value) return '';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return value;
  } catch {
    return '';
  }
}

function localDateString(date = new Date(), offsetMinutes = 0, timeZone = '') {
  if (timeZone) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  }
  return new Date(date.getTime() - offsetMinutes * 60 * 1000).toISOString().slice(0, 10);
}

function shiftDateString(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function localDayRange(req) {
  const requestedDate = req.query.date || req.body?.date || localDateString(new Date(), timezoneOffset(req), timezoneName(req));
  const [year, month, day] = requestedDate.split('-').map(Number);
  const offset = timezoneOffset(req);
  const fallbackStart = new Date(Date.UTC(year, month - 1, day) + offset * 60 * 1000);
  const suppliedStart = new Date(req.query.startDate || req.body?.startDate || '');
  const suppliedEnd = new Date(req.query.endDate || req.body?.endDate || '');
  const start = Number.isNaN(suppliedStart.getTime()) ? fallbackStart : suppliedStart;
  const end = Number.isNaN(suppliedEnd.getTime())
    ? new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
    : suppliedEnd;

  return { date: requestedDate, start, end, offset };
}

function requestedLogDate(req) {
  return req.query.date || req.body?.date || localDateString(new Date(), timezoneOffset(req), timezoneName(req));
}

async function findLogContainingMeal(req) {
  const date = req.query.date || req.body?.date;
  const query = { userId: req.user._id, 'meals._id': req.params.logMealId };
  if (date) query.date = date;
  return DailyLog.findOne(query);
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

function currentMondayString(offsetMinutes = 0, offsetWeeks = 0, timeZone = '') {
  const localToday = localDateString(new Date(), offsetMinutes, timeZone);
  const date = new Date(`${localToday}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return shiftDateString(localToday, diff - (Number(offsetWeeks) || 0) * 7);
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
    const date = requestedLogDate(req);
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
      const hasMealParts = meal.mealParts?.length > 0 || meal.components?.length > 0;
      const hasComponentAmounts = hasMealParts && req.body.componentPortions?.length > 0;
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

    loggedMeal.loggedAt = new Date();
    loggedMeal.createdAt = loggedMeal.loggedAt;
    log.meals.push(loggedMeal);

    recalculate(log);
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Could not log meal.' });
  }
});

router.get('/today', auth, async (req, res) => {
  const { date, start, end } = localDayRange(req);
  const logs = await DailyLog.find({
    userId: req.user._id,
    date: { $gte: shiftDateString(date, -1), $lte: shiftDateString(date, 1) }
  });
  const hydratedMeals = [];
  for (const log of logs) {
    for (const meal of log.meals || []) {
      const timestamp = loggedMealTime(meal);
      const belongsToDay = timestamp
        ? timestamp >= start.getTime() && timestamp <= end.getTime()
        : log.date === date;
      if (belongsToDay) hydratedMeals.push(await hydrateLoggedMeal(req.user._id, meal));
    }
  }

  const result = { date, meals: sortLoggedMealsNewestFirst(hydratedMeals) };
  recalculate(result);
  res.json(result);
});

router.get('/week', auth, async (req, res) => {
  const offset = Math.max(0, Math.min(3, Number(req.query.offset) || 0));
  const userOffset = timezoneOffset(req);
  const userTimeZone = timezoneName(req);
  const startString = currentMondayString(userOffset, offset, userTimeZone);
  const dayStrings = Array.from({ length: 7 }, (_, index) => shiftDateString(startString, index));
  const endString = dayStrings[6];
  const logs = await DailyLog.find({
    userId: req.user._id,
    date: { $gte: shiftDateString(startString, -1), $lte: shiftDateString(endString, 1) }
  }).sort({ date: 1 });
  const mealsByDate = new Map(dayStrings.map(date => [date, []]));

  for (const log of logs) {
    for (const meal of log.meals || []) {
      const timestamp = loggedMealTime(meal);
      const localDate = timestamp ? localDateString(new Date(timestamp), userOffset, userTimeZone) : log.date;
      if (mealsByDate.has(localDate)) {
        mealsByDate.get(localDate).push(await hydrateLoggedMeal(req.user._id, meal));
      }
    }
  }

  res.json(dayStrings.map(date => {
    const meals = sortLoggedMealsNewestFirst(mealsByDate.get(date));
    const result = {
      date,
      dayLabel: new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      meals,
      hasLogs: meals.length > 0
    };
    recalculate(result);
    return result;
  }));
});

// GET logged food by ID
router.get('/log/:logMealId', auth, async (req, res) => {
  const log = await findLogContainingMeal(req);
  if (!log) return res.status(404).json({ message: 'No logs for today.' });
  const date = log.date;

  const mealIndex = log.meals.findIndex(m => m._id && m._id.toString() === req.params.logMealId);
  if (mealIndex === -1) return res.status(404).json({ message: 'Logged meal not found.' });

  const meal = await hydrateLoggedMeal(req.user._id, log.meals[mealIndex]);
  res.json({ ...meal, date });
});

// PUT update logged meal portion
router.put('/log/:logMealId', auth, async (req, res) => {
  const log = await findLogContainingMeal(req);
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
  const log = await findLogContainingMeal(req);
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
