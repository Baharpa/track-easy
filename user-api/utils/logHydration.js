const Ingredient = require('../models/Ingredient');
const Meal = require('../models/Meal');
const { addTotals, calculateNutritionWithUnit, round } = require('./nutrition');
const { convertToGrams, normalizeUnit } = require('./unitConverter');

function toPlain(doc) {
  if (!doc) return null;
  return typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
}

function scaleLoggedIngredient(item, factor) {
  const gramsUsed = round(Number(item.gramsUsed || item.quantityUsed || 0) * factor);
  return {
    ingredientId: item.ingredientId,
    name: item.name,
    quantityUsed: round(Number(item.quantityUsed || 0) * factor),
    gramsUsed,
    unit: item.unit || 'grams',
    calories: round(Number(item.calories || 0) * factor),
    protein: round(Number(item.protein || 0) * factor),
    carbs: round(Number(item.carbs || 0) * factor),
    fats: round(Number(item.fats || 0) * factor),
    sugar: round(Number(item.sugar || 0) * factor)
  };
}

async function hydrateMealIngredients(userId, selectedIngredients = []) {
  const built = [];

  for (const item of selectedIngredients) {
    const ingredient = await Ingredient.findOne({ _id: item.ingredientId, userId });
    if (!ingredient) {
      if (item.name) built.push({ ...item });
      continue;
    }

    const quantityUsed = Number(item.quantityUsed);
    const unit = normalizeUnit(item.unit || 'grams');
    const nutrition = calculateNutritionWithUnit(quantityUsed, unit, ingredient);
    const gramsUsed = convertToGrams(quantityUsed, unit, ingredient);

    built.push({
      ingredientId: ingredient._id,
      name: ingredient.name,
      quantityUsed: round(quantityUsed),
      gramsUsed: round(gramsUsed || quantityUsed || 0),
      unit,
      ...nutrition
    });
  }

  return built;
}

async function hydrateMealComponents(userId, components = []) {
  const builtComponents = [];
  const allConsumedIngredients = [];

  for (const component of components) {
    const originalIngredients = await hydrateMealIngredients(userId, component.ingredients || []);
    const totalWeight = originalIngredients.reduce((sum, item) => sum + Number(item.gramsUsed || item.quantityUsed || 0), 0);
    const consumedWeight = Number(component.consumedWeight || totalWeight);

    const proportionalAmounts = totalWeight > 0
      ? originalIngredients.map(item => {
          const itemWeight = Number(item.gramsUsed || item.quantityUsed || 0);
          const percent = totalWeight > 0 ? itemWeight / totalWeight : 0;
          const gramsUsed = round(percent * consumedWeight);
          return { ...item, quantityUsed: gramsUsed, gramsUsed, unit: 'grams' };
        })
      : originalIngredients.map(item => ({ ...item, unit: 'grams' }));

    const consumedIngredients = proportionalAmounts.map(item => {
      const ingredient = originalIngredients.find(entry => String(entry.ingredientId) === String(item.ingredientId));
      if (!ingredient) return item;

      const baseWeight = Number(ingredient.gramsUsed || ingredient.quantityUsed || 0);
      const factor = baseWeight > 0 ? Number(item.gramsUsed || item.quantityUsed || 0) / baseWeight : 0;
      return scaleLoggedIngredient(ingredient, factor);
    });

    const totals = addTotals(consumedIngredients);
    allConsumedIngredients.push(...consumedIngredients);
    builtComponents.push({
      name: component.name || 'Component',
      category: component.category || component.name || 'Other',
      ingredients: consumedIngredients,
      totalWeight: round(totalWeight),
      consumedWeight: round(consumedWeight),
      nutritionTotals: totals
    });
  }

  return { builtComponents, allConsumedIngredients };
}

async function hydrateMealDocument(userId, meal) {
  const source = toPlain(meal);
  if (!source) return null;

  if (source.outsideFood) {
    return {
      ...source,
      outsideFood: true,
      restaurantName: source.restaurantName || '',
      ingredients: [],
      components: [],
      totalCalories: round(source.totalCalories ?? source.calories),
      totalProtein: round(source.totalProtein ?? source.protein),
      totalCarbs: round(source.totalCarbs ?? source.carbs),
      totalFats: round(source.totalFats ?? source.fats),
      totalSugar: round(source.totalSugar ?? source.sugar)
    };
  }

  const ingredients = await hydrateMealIngredients(userId, source.ingredients || []);
  const componentsResult = await hydrateMealComponents(userId, source.components || []);
  const totals = addTotals(ingredients);

  return {
    ...source,
    ingredients,
    components: componentsResult.builtComponents,
    totalCalories: totals.calories,
    totalProtein: totals.protein,
    totalCarbs: totals.carbs,
    totalFats: totals.fats,
    totalSugar: totals.sugar
  };
}

function buildPortionLogFromMeal(meal, portion, portionLabel) {
  if (meal.outsideFood) {
    return {
      type: 'meal',
      mealId: meal._id,
      name: meal.name,
      portion,
      portionLabel,
      servings: portion,
      calories: round(Number(meal.totalCalories || 0) * portion),
      protein: round(Number(meal.totalProtein || 0) * portion),
      carbs: round(Number(meal.totalCarbs || 0) * portion),
      fats: round(Number(meal.totalFats || 0) * portion),
      sugar: round(Number(meal.totalSugar || 0) * portion),
      ingredients: [],
      components: [],
      componentPortions: []
    };
  }

  const ingredients = (meal.ingredients || []).map(item => scaleLoggedIngredient(item, portion));
  const components = (meal.components || []).map(component => {
    const componentIngredients = (component.ingredients || []).map(item => scaleLoggedIngredient(item, portion));
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
    type: 'meal',
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
    components,
    componentPortions: []
  };
}

function buildComponentLogFromMeal(meal, componentPortions = []) {
  const components = [];
  const allIngredients = [];
  const normalizedPortions = (componentPortions || []).map(item => ({
    componentIndex: Number(item.componentIndex),
    eatenAmount: Number(item.eatenAmount),
    unit: normalizeUnit(item.unit || 'grams') || 'grams'
  }));

  for (const componentInput of normalizedPortions) {
    const component = meal.components?.[componentInput.componentIndex];
    if (!component) continue;

    const eatenWeight = convertToGrams(Number(componentInput.eatenAmount), componentInput.unit || 'grams');
    if (!eatenWeight || eatenWeight <= 0) continue;

    const totalWeight = Number(component.totalWeight || 0);
    if (totalWeight > 0 && eatenWeight > totalWeight) {
      throw new Error('Component eaten amount cannot be bigger than the original component weight.');
    }
    const factor = totalWeight > 0 ? eatenWeight / totalWeight : 0;
    const ingredients = (component.ingredients || []).map(item => scaleLoggedIngredient(item, factor));
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
    type: 'meal',
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
    components,
    componentPortions: normalizedPortions
  };
}

async function hydrateLoggedMeal(userId, logMeal) {
  const source = toPlain(logMeal);
  if (!source) return null;

  if (source.type === 'ingredient' || source.ingredientId) {
    const ingredient = await Ingredient.findOne({ _id: source.ingredientId, userId });
    if (!ingredient) return source;

    const amount = Number(source.amount || source.quantityUsed || source.ingredients?.[0]?.quantityUsed || 0);
    const unit = normalizeUnit(source.unit || source.ingredients?.[0]?.unit || ingredient.unit || 'grams') || 'grams';
    const nutrition = calculateNutritionWithUnit(amount, unit, ingredient);
    return {
      ...source,
      type: 'ingredient',
      ingredientId: ingredient._id,
      name: ingredient.name,
      amount: round(amount),
      unit,
      portion: 1,
      portionLabel: `${round(amount)} ${unit}`,
      servings: 1,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fats: nutrition.fats,
      sugar: nutrition.sugar,
      ingredients: [{
        ingredientId: ingredient._id,
        name: ingredient.name,
        quantityUsed: round(amount),
        unit,
        ...nutrition
      }],
      components: []
    };
  }

  const meal = await Meal.findOne({ _id: source.mealId, userId });
  if (!meal) return source;

  const hydratedMeal = await hydrateMealDocument(userId, meal);
  if (Array.isArray(source.componentPortions) && source.componentPortions.length > 0) {
    return {
      ...source,
      ...buildComponentLogFromMeal(hydratedMeal, source.componentPortions)
    };
  }

  if (source.portionLabel === 'custom component amounts' && (source.components || []).length > 0) {
    const componentPortions = source.components.map((component, index) => ({
      componentIndex: hydratedMeal.components.findIndex(currentComponent => currentComponent.name === component.name) >= 0
        ? hydratedMeal.components.findIndex(currentComponent => currentComponent.name === component.name)
        : index,
      eatenAmount: Number(component.eatenWeight || component.totalWeight || 0),
      unit: 'grams'
    }));
    return {
      ...source,
      ...buildComponentLogFromMeal(hydratedMeal, componentPortions)
    };
  }

  return {
    ...source,
    ...buildPortionLogFromMeal(hydratedMeal, Number(source.portion || source.servings || 1), source.portionLabel || '1 whole meal')
  };
}

module.exports = {
  hydrateMealDocument,
  hydrateLoggedMeal,
  buildPortionLogFromMeal,
  buildComponentLogFromMeal
};
