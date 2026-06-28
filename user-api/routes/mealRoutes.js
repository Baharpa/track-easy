const express = require('express');
const auth = require('../config/auth');
const Meal = require('../models/Meal');
const Ingredient = require('../models/Ingredient');
const { calculateNutritionWithUnit, addTotals, calculateComponentPortion, round } = require('../utils/nutrition');
const { hydrateMealDocument } = require('../utils/logHydration');
const router = express.Router();

async function buildMealIngredients(userId, selectedIngredients) {
  const built = [];

  for (const item of selectedIngredients || []) {
    const ingredient = await Ingredient.findOne({ _id: item.ingredientId, userId });

    if (ingredient) {
      const quantityUsed = Number(item.quantityUsed);
      const unit = item.unit || 'grams';
      
      // Use new per-100g calculation with unit conversion
      const nutrition = calculateNutritionWithUnit(quantityUsed, unit, ingredient);

      built.push({
        ingredientId: ingredient._id,
        name: ingredient.name,
        quantityUsed,
        unit,
        ...nutrition
      });
    }
  }

  return built;
}

async function buildMealComponents(userId, components) {
  const builtComponents = [];
  const allConsumedIngredients = [];

  for (const component of components || []) {
    const originalIngredients = await buildMealIngredients(userId, component.ingredients || []);
    const totalWeight = originalIngredients.reduce((sum, item) => sum + Number(item.quantityUsed || 0), 0);
    const consumedWeight = Number(component.consumedWeight || totalWeight);

    // This is the proportional logic from the planning sheet.
    // Example: 300g carrots + 50g parsley, eaten 100g total => 85.7g and 14.3g.
    const proportionalAmounts = calculateComponentPortion(originalIngredients, consumedWeight);
    const consumedIngredients = [];

    for (const item of proportionalAmounts) {
      const ingredient = await Ingredient.findOne({ _id: item.ingredientId, userId });
      if (ingredient) {
        // Use new per-100g calculation with unit conversion
        const nutrition = calculateNutritionWithUnit(item.quantityUsed, item.unit, ingredient);
        
        consumedIngredients.push({
          ingredientId: ingredient._id,
          name: ingredient.name,
          quantityUsed: item.quantityUsed,
          unit: item.unit,
          ...nutrition
        });
      }
    }

    const totals = addTotals(consumedIngredients);
    allConsumedIngredients.push(...consumedIngredients);

    builtComponents.push({
      name: component.name || 'Component',
      category: component.category || 'Other',
      ingredients: consumedIngredients,
      totalWeight: round(totalWeight),
      consumedWeight: round(consumedWeight),
      nutritionTotals: totals
    });
  }

  return { builtComponents, allConsumedIngredients };
}

async function buildMealBody(req) {
  const outsideFood = Boolean(req.body.outsideFood);
  if (outsideFood) {
    return {
      name: req.body.name,
      category: req.body.category || 'Meal',
      imageUrl: req.body.imageUrl || '',
      outsideFood: true,
      restaurantName: req.body.restaurantName || '',
      components: [],
      ingredients: [],
      totalCalories: round(req.body.totalCalories ?? req.body.calories),
      totalProtein: round(req.body.totalProtein ?? req.body.protein),
      totalCarbs: round(req.body.totalCarbs ?? req.body.carbs),
      totalFats: round(req.body.totalFats ?? req.body.fats),
      totalSugar: round(req.body.totalSugar ?? req.body.sugar),
      userId: req.user._id
    };
  }

  let ingredients = [];
  let components = [];

  if (req.body.components && req.body.components.length > 0) {
    const result = await buildMealComponents(req.user._id, req.body.components);
    components = result.builtComponents;
    ingredients = result.allConsumedIngredients;
  } else {
    ingredients = await buildMealIngredients(req.user._id, req.body.ingredients);
  }

  const totals = addTotals(ingredients);

  return {
    name: req.body.name,
    category: req.body.category || 'Meal',
    imageUrl: req.body.imageUrl || '',
    outsideFood: false,
    restaurantName: '',
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
  const hydratedMeals = [];
  for (const meal of meals) {
    hydratedMeals.push(await hydrateMealDocument(req.user._id, meal));
  }
  res.json(hydratedMeals);
});

router.post('/', auth, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ message: 'Meal name is required.' });
    const mealBody = await buildMealBody(req);
    const meal = await Meal.create(mealBody);
    res.status(201).json(await hydrateMealDocument(req.user._id, meal));
  } catch (err) {
    res.status(400).json({ message: 'Could not create meal.', error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  const meal = await Meal.findOne({ _id: req.params.id, userId: req.user._id });
  if (!meal) return res.status(404).json({ message: 'Meal not found.' });
  res.json(await hydrateMealDocument(req.user._id, meal));
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
    res.json(await hydrateMealDocument(req.user._id, meal));
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
