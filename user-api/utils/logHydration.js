const Ingredient = require("../models/Ingredient");
const Meal = require("../models/Meal");
const { addTotals, calculateNutritionWithUnit, round } = require("./nutrition");
const {
  convertToGrams,
  normalizeUnit,
  getIngredientServingOptions,
} = require("./unitConverter");

function toPlain(doc) {
  if (!doc) return null;
  return typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
}

function scaleLoggedIngredient(item, factor) {
  const gramsUsed = round(
    Number(item.gramsUsed || item.quantityUsed || 0) * factor,
  );
  return {
    ingredientId: item.ingredientId,
    name: item.name,
    quantityUsed: round(Number(item.quantityUsed || 0) * factor),
    gramsUsed,
    unit: item.unit || "grams",
    calories: round(Number(item.calories || 0) * factor),
    protein: round(Number(item.protein || 0) * factor),
    carbs: round(Number(item.carbs || 0) * factor),
    fats: round(Number(item.fats || 0) * factor),
    sugar: round(Number(item.sugar || 0) * factor),
  };
}

function getMealWeight(meal = {}) {
  const ingredientWeight = (meal.ingredients || []).reduce(
    (sum, item) => sum + Number(item.gramsUsed || 0),
    0,
  );
  const componentSource = meal.components?.length
    ? meal.components
    : meal.mealParts || [];
  const componentWeight = componentSource.reduce(
    (sum, component) => sum + Number(component.totalWeight || 0),
    0,
  );
  return round(ingredientWeight || componentWeight || 0);
}

async function hydrateMealIngredients(userId, selectedIngredients = []) {
  const built = [];

  for (const item of selectedIngredients) {
    const ingredient = await Ingredient.findOne({
      _id: item.ingredientId,
      userId,
    });
    if (!ingredient) {
      if (item.name) built.push({ ...item });
      continue;
    }

    const quantityUsed = Number(item.quantityUsed);
    const unit = normalizeUnit(item.unit || "grams");
    const nutrition = calculateNutritionWithUnit(
      quantityUsed,
      unit,
      ingredient,
    );
    const gramsUsed = convertToGrams(quantityUsed, unit, ingredient);

    built.push({
      ingredientId: ingredient._id,
      name: ingredient.name,
      quantityUsed: round(quantityUsed),
      gramsUsed: round(gramsUsed || quantityUsed || 0),
      unit,
      ...nutrition,
    });
  }

  return built;
}

async function hydrateMealComponents(userId, components = []) {
  const builtComponents = [];
  const allConsumedIngredients = [];

  for (const component of components) {
    const originalIngredients = await hydrateMealIngredients(
      userId,
      component.ingredients || [],
    );
    const totalWeight = originalIngredients.reduce(
      (sum, item) => sum + Number(item.gramsUsed || 0),
      0,
    );
    const consumedWeight = Number(component.consumedWeight || totalWeight);

    const proportionalAmounts =
      totalWeight > 0
        ? originalIngredients.map((item) => {
            const itemWeight = Number(item.gramsUsed || 0);
            const percent = totalWeight > 0 ? itemWeight / totalWeight : 0;
            const gramsUsed = round(percent * consumedWeight);
            return {
              ...item,
              quantityUsed: gramsUsed,
              gramsUsed,
              unit: "grams",
            };
          })
        : originalIngredients.map((item) => ({ ...item, unit: "grams" }));

    const consumedIngredients = proportionalAmounts.map((item) => {
      const ingredient = originalIngredients.find(
        (entry) => String(entry.ingredientId) === String(item.ingredientId),
      );
      if (!ingredient) return item;

      const baseWeight = Number(ingredient.gramsUsed || 0);
      const factor =
        baseWeight > 0 ? Number(item.gramsUsed || 0) / baseWeight : 0;
      return scaleLoggedIngredient(ingredient, factor);
    });

    const totals = addTotals(consumedIngredients);
    allConsumedIngredients.push(...consumedIngredients);
    builtComponents.push({
      name: component.name || "Component",
      category: component.category || component.name || "Other",
      ingredients: consumedIngredients,
      totalWeight: round(totalWeight),
      consumedWeight: round(consumedWeight),
      nutritionTotals: totals,
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
      restaurantName: source.restaurantName || "",
      ingredients: [],
      components: [],
      mealParts: [],
      totalCalories: round(source.totalCalories ?? source.calories),
      totalProtein: round(source.totalProtein ?? source.protein),
      totalCarbs: round(source.totalCarbs ?? source.carbs),
      totalFats: round(source.totalFats ?? source.fats),
      totalSugar: round(source.totalSugar ?? source.sugar),
    };
  }

  const sourceComponents =
    (Array.isArray(source.components) &&
      source.components.length > 0 &&
      source.components) ||
    (Array.isArray(source.mealParts) &&
      source.mealParts.length > 0 &&
      source.mealParts) ||
    (Array.isArray(source.ingredients) && source.ingredients.length > 0
      ? [
          {
            name: "Main",
            category: source.category || "Meal",
            ingredients: source.ingredients,
          },
        ]
      : []);
  const ingredients = await hydrateMealIngredients(
    userId,
    source.ingredients || [],
  );
  const componentsResult = await hydrateMealComponents(
    userId,
    sourceComponents,
  );
  const totals = addTotals(ingredients);

  return {
    ...source,
    ingredients,
    components: componentsResult.builtComponents,
    mealParts: componentsResult.builtComponents,
    totalCalories: totals.calories,
    totalProtein: totals.protein,
    totalCarbs: totals.carbs,
    totalFats: totals.fats,
    totalSugar: totals.sugar,
  };
}

function buildPortionLogFromMeal(meal, portion, portionLabel, options = {}) {
  const portionMode = options.portionMode || "whole";
  const portionFactor = Number(options.portionFactor ?? portion ?? 1) || 1;
  const loggedGrams = round(Number(options.loggedGrams || 0));

  if (meal.outsideFood) {
    return {
      type: "meal",
      mealId: meal._id,
      name: meal.name,
      portion: portionFactor,
      portionMode,
      portionLabel,
      portionFactor,
      loggedGrams,
      servings: portionFactor,
      calories: round(Number(meal.totalCalories || 0) * portionFactor),
      protein: round(Number(meal.totalProtein || 0) * portionFactor),
      carbs: round(Number(meal.totalCarbs || 0) * portionFactor),
      fats: round(Number(meal.totalFats || 0) * portionFactor),
      sugar: round(Number(meal.totalSugar || 0) * portionFactor),
      ingredients: [],
      components: [],
      mealParts: [],
      componentPortions: [],
    };
  }

  const sourceComponents =
    (Array.isArray(meal.components) &&
      meal.components.length > 0 &&
      meal.components) ||
    (Array.isArray(meal.mealParts) &&
      meal.mealParts.length > 0 &&
      meal.mealParts) ||
    (Array.isArray(meal.ingredients) && meal.ingredients.length > 0
      ? [
          {
            name: "Main",
            category: meal.category || "Meal",
            ingredients: meal.ingredients,
          },
        ]
      : []);
  const ingredients = (meal.ingredients || []).map((item) =>
    scaleLoggedIngredient(item, portionFactor),
  );
  const components = sourceComponents.map((component) => {
    const componentIngredients = (component.ingredients || []).map((item) =>
      scaleLoggedIngredient(item, portionFactor),
    );
    return {
      name: component.name,
      category: component.category,
      eatenWeight: round(Number(component.totalWeight || 0) * portionFactor),
      unit: "grams",
      ingredients: componentIngredients,
      nutritionTotals: addTotals(componentIngredients),
    };
  });

  const totals = addTotals(ingredients);
  return {
    type: "meal",
    mealId: meal._id,
    name: meal.name,
    portion: portionFactor,
    portionMode,
    portionLabel,
    portionFactor,
    loggedGrams: loggedGrams || round(getMealWeight(meal) * portionFactor),
    servings: portionFactor,
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fats: totals.fats,
    sugar: totals.sugar,
    ingredients,
    components,
    mealParts: components,
    componentPortions: [],
  };
}

function buildComponentLogFromMeal(meal, componentPortions = []) {
  const components = [];
  const allIngredients = [];
  const normalizedPortions = (componentPortions || []).map((item) => ({
    componentIndex: Number(item.componentIndex),
    eatenAmount: Number(item.eatenAmount),
    unit: normalizeUnit(item.unit || "grams") || "grams",
  }));

  for (const componentInput of normalizedPortions) {
    const sourceComponents = meal.components?.length
      ? meal.components
      : meal.mealParts || [];
    const component = sourceComponents[componentInput.componentIndex];
    if (!component) continue;

    const eatenWeight = convertToGrams(
      Number(componentInput.eatenAmount),
      componentInput.unit || "grams",
    );
    if (!eatenWeight || eatenWeight <= 0) continue;

    const totalWeight = Number(component.totalWeight || 0);
    if (totalWeight > 0 && eatenWeight > totalWeight) {
      throw new Error(
        "Component eaten amount cannot be bigger than the original component weight.",
      );
    }
    const factor = totalWeight > 0 ? eatenWeight / totalWeight : 0;
    const ingredients = (component.ingredients || []).map((item) =>
      scaleLoggedIngredient(item, factor),
    );
    const nutritionTotals = addTotals(ingredients);
    allIngredients.push(...ingredients);
    components.push({
      name: component.name,
      category: component.category,
      eatenWeight: round(eatenWeight),
      unit: "grams",
      ingredients,
      nutritionTotals,
    });
  }

  const totals = addTotals(allIngredients);
  return {
    type: "meal",
    mealId: meal._id,
    name: meal.name,
    portion: 1,
    portionMode: "customize",
    portionLabel: "custom component amounts",
    servings: 1,
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fats: totals.fats,
    sugar: totals.sugar,
    ingredients: allIngredients,
    components,
    mealParts: components,
    componentPortions: normalizedPortions,
  };
}

async function hydrateLoggedMeal(userId, logMeal) {
  const source = toPlain(logMeal);
  if (!source) return null;

  if (source.type === "ingredient" || source.ingredientId) {
    const ingredient = await Ingredient.findOne({
      _id: source.ingredientId,
      userId,
    });
    if (!ingredient) return source;

    const amount = Number(
      source.amount ||
        source.quantityUsed ||
        source.ingredients?.[0]?.quantityUsed ||
        0,
    );
    const unit =
      normalizeUnit(
        source.unit ||
          source.ingredients?.[0]?.unit ||
          ingredient.unit ||
          "grams",
      ) || "grams";
    const servingMatch = getIngredientServingOptions(ingredient).find(
      (option) =>
        normalizeUnit(option.unit) === unit &&
        Number(option.amount) === Number(amount),
    );
    const gramsUsedValue =
      source.gramsUsed ||
      source.ingredients?.[0]?.gramsUsed ||
      (servingMatch?.gramsEquivalent > 0
        ? amount * (servingMatch.gramsEquivalent / servingMatch.amount)
        : convertToGrams(amount, unit, ingredient));
    const gramsUsed = Number(gramsUsedValue) > 0 ? round(gramsUsedValue) : null;
    const nutrition = calculateNutritionWithUnit(amount, unit, ingredient);
    return {
      ...source,
      type: "ingredient",
      ingredientId: ingredient._id,
      name: ingredient.name,
      amount: round(amount),
      unit,
      gramsUsed,
      portion: 1,
      portionLabel: `${round(amount)} ${unit}`,
      servings: 1,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fats: nutrition.fats,
      sugar: nutrition.sugar,
      ingredients: [
        {
          ingredientId: ingredient._id,
          name: ingredient.name,
          quantityUsed: round(amount),
          unit,
          gramsUsed,
          ...nutrition,
        },
      ],
      components: [],
    };
  }

  const meal = await Meal.findOne({ _id: source.mealId, userId });
  if (!meal) return source;

  const hydratedMeal = await hydrateMealDocument(userId, meal);
  if (
    Array.isArray(source.componentPortions) &&
    source.componentPortions.length > 0
  ) {
    return {
      ...source,
      ...buildComponentLogFromMeal(hydratedMeal, source.componentPortions),
    };
  }

  if (
    source.portionLabel === "custom component amounts" &&
    (source.components || []).length > 0
  ) {
    const componentPortions = source.components.map((component, index) => ({
      componentIndex:
        hydratedMeal.components.findIndex(
          (currentComponent) => currentComponent.name === component.name,
        ) >= 0
          ? hydratedMeal.components.findIndex(
              (currentComponent) => currentComponent.name === component.name,
            )
          : index,
      eatenAmount: Number(component.eatenWeight || component.totalWeight || 0),
      unit: "grams",
    }));
    return {
      ...source,
      ...buildComponentLogFromMeal(hydratedMeal, componentPortions),
    };
  }

  return {
    ...source,
    ...buildPortionLogFromMeal(
      hydratedMeal,
      Number(source.portion || source.servings || source.portionFactor || 1),
      source.portionLabel || "1 whole meal",
      {
        portionMode: source.portionMode,
        portionFactor: source.portionFactor,
        loggedGrams: source.loggedGrams,
      },
    ),
  };
}

module.exports = {
  hydrateMealDocument,
  hydrateLoggedMeal,
  buildPortionLogFromMeal,
  buildComponentLogFromMeal,
};
