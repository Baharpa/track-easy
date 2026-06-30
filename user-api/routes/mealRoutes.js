const express = require("express");
const auth = require("../config/auth");
const { queueAutoFoodImage } = require("../utils/autoFoodImage");
const {
  deleteCloudinaryImageIfUnused,
  refreshDocumentImage,
  removeDocumentImage,
} = require("../utils/imageManagement");
const Meal = require("../models/Meal");
const Ingredient = require("../models/Ingredient");
const {
  calculateNutritionWithUnit,
  addTotals,
  calculateComponentPortion,
  round,
} = require("../utils/nutrition");
const {
  convertToGrams,
  normalizeUnit,
  getIngredientServingOptions,
} = require("../utils/unitConverter");
const { hydrateMealDocument } = require("../utils/logHydration");
const router = express.Router();

async function buildMealIngredients(userId, selectedIngredients) {
  const built = [];

  for (const item of selectedIngredients || []) {
    const ingredient = await Ingredient.findOne({
      _id: item.ingredientId,
      userId,
    });

    if (ingredient) {
      const quantityUsed = Number(item.quantityUsed);
      const unit = normalizeUnit(item.unit || "grams");
      const matchingServing = getIngredientServingOptions(ingredient).find(
        (option) =>
          normalizeUnit(option.unit) === unit &&
          Number(option.amount) === quantityUsed,
      );
      const gramsUsed =
        matchingServing?.gramsEquivalent > 0
          ? round(
              quantityUsed *
                (matchingServing.gramsEquivalent / matchingServing.amount),
            )
          : convertToGrams(quantityUsed, unit, ingredient);

      // Use new per-100g calculation with unit conversion
      const nutrition = calculateNutritionWithUnit(
        quantityUsed,
        unit,
        ingredient,
      );

      built.push({
        ingredientId: ingredient._id,
        name: ingredient.name,
        quantityUsed,
        unit,
        gramsUsed: gramsUsed > 0 ? round(gramsUsed) : null,
        ...nutrition,
      });
    }
  }

  return built;
}

async function buildMealComponents(userId, components) {
  const builtComponents = [];
  const allConsumedIngredients = [];

  for (const component of components || []) {
    const originalIngredients = await buildMealIngredients(
      userId,
      component.ingredients || [],
    );
    const totalWeight = originalIngredients.reduce(
      (sum, item) => sum + Number(item.gramsUsed || 0),
      0,
    );
    const consumedWeight = Number(component.consumedWeight || totalWeight);

    // This is the proportional logic from the planning sheet.
    // Example: 300g carrots + 50g parsley, eaten 100g total => 85.7g and 14.3g.
    const proportionalAmounts = calculateComponentPortion(
      originalIngredients,
      consumedWeight,
    );
    const consumedIngredients = [];

    for (const item of proportionalAmounts) {
      const ingredient = await Ingredient.findOne({
        _id: item.ingredientId,
        userId,
      });
      if (ingredient) {
        // Use new per-100g calculation with unit conversion
        const nutrition = calculateNutritionWithUnit(
          item.quantityUsed,
          item.unit,
          ingredient,
        );
        const matchingServing = getIngredientServingOptions(ingredient).find(
          (option) =>
            normalizeUnit(option.unit) === normalizeUnit(item.unit) &&
            Number(option.amount) === Number(item.quantityUsed),
        );
        const gramsUsed =
          matchingServing?.gramsEquivalent > 0
            ? round(
                Number(item.quantityUsed) *
                  (matchingServing.gramsEquivalent / matchingServing.amount),
              )
            : convertToGrams(item.quantityUsed, item.unit, ingredient);

        consumedIngredients.push({
          ingredientId: ingredient._id,
          name: ingredient.name,
          quantityUsed: item.quantityUsed,
          unit: item.unit,
          gramsUsed: gramsUsed > 0 ? round(gramsUsed) : null,
          ...nutrition,
        });
      }
    }

    const totals = addTotals(consumedIngredients);
    allConsumedIngredients.push(...consumedIngredients);

    builtComponents.push({
      id: component.id || "",
      name: component.name || "Component",
      category: component.category || "Other",
      ingredients: consumedIngredients,
      totalWeight: round(totalWeight),
      consumedWeight: round(consumedWeight),
      nutritionTotals: totals,
    });
  }

  return { builtComponents, allConsumedIngredients };
}

async function buildMealBody(req) {
  const outsideFood = Boolean(req.body.outsideFood);
  const mealPartSource =
    Array.isArray(req.body.mealParts) && req.body.mealParts.length > 0
      ? req.body.mealParts
      : req.body.components;
  if (outsideFood) {
    const imageUrl = String(req.body.imageUrl || req.body.image || req.body.photoUrl || "").trim();
    return {
      name: req.body.name,
      category: req.body.category || "Meal",
      imageUrl,
      imagePublicId: req.body.imagePublicId || "",
      imageSource: req.body.imageSource || (req.body.imageAttribution?.provider === "Pexels"
        ? "pexels-auto"
        : imageUrl
          ? req.body.imagePublicId ? "cloudinary-upload" : "manual-url"
          : ""),
      imageSourceUrl: req.body.imageSourceUrl || "",
      imageAuthor: req.body.imageAuthor || "",
      imageAttribution: req.body.imageAttribution || {},
      outsideFood: true,
      restaurantName: req.body.restaurantName || "",
      components: [],
      mealParts: [],
      ingredients: [],
      totalCalories: round(req.body.totalCalories ?? req.body.calories),
      totalProtein: round(req.body.totalProtein ?? req.body.protein),
      totalCarbs: round(req.body.totalCarbs ?? req.body.carbs),
      totalFats: round(req.body.totalFats ?? req.body.fats),
      totalSugar: round(req.body.totalSugar ?? req.body.sugar),
      userId: req.user._id,
    };
  }

  let ingredients = [];
  let components = [];

  if (mealPartSource && mealPartSource.length > 0) {
    const result = await buildMealComponents(req.user._id, mealPartSource);
    components = result.builtComponents;
    ingredients = result.allConsumedIngredients;
  } else {
    ingredients = await buildMealIngredients(
      req.user._id,
      req.body.ingredients,
    );
  }

  const totals = addTotals(ingredients);

  const imageUrl = String(req.body.imageUrl || req.body.image || req.body.photoUrl || "").trim();
  return {
    name: req.body.name,
    category: req.body.category || "Meal",
    imageUrl,
    imagePublicId: req.body.imagePublicId || "",
    imageSource: req.body.imageSource || (req.body.imageAttribution?.provider === "Pexels"
      ? "pexels-auto"
      : imageUrl
        ? req.body.imagePublicId ? "cloudinary-upload" : "manual-url"
        : ""),
    imageSourceUrl: req.body.imageSourceUrl || "",
    imageAuthor: req.body.imageAuthor || "",
    imageAttribution: req.body.imageAttribution || {},
    outsideFood: false,
    restaurantName: "",
    components,
    mealParts: components,
    ingredients,
    totalCalories: totals.calories,
    totalProtein: totals.protein,
    totalCarbs: totals.carbs,
    totalFats: totals.fats,
    totalSugar: totals.sugar,
    userId: req.user._id,
  };
}

router.get("/", auth, async (req, res) => {
  const meals = await Meal.find({ userId: req.user._id }).sort({
    createdAt: -1,
  });
  const hydratedMeals = [];
  for (const meal of meals) {
    hydratedMeals.push(await hydrateMealDocument(req.user._id, meal));
  }
  res.json(hydratedMeals);
});

router.post("/", auth, async (req, res) => {
  try {
    if (!req.body.name)
      return res.status(400).json({ message: "Meal name is required." });
    const mealBody = await buildMealBody(req);
    const meal = await Meal.create(mealBody);
    res.status(201).json(await hydrateMealDocument(req.user._id, meal));
    if (!meal.imageUrl) {
      queueAutoFoodImage({
        model: Meal,
        documentId: meal._id,
        userId: req.user._id,
        name: meal.name,
        type: "meal",
        restaurantName: meal.restaurantName
      });
    }
  } catch (err) {
    res
      .status(400)
      .json({ message: "Could not create meal.", error: err.message });
  }
});

router.get("/:id", auth, async (req, res) => {
  const meal = await Meal.findOne({ _id: req.params.id, userId: req.user._id });
  if (!meal) return res.status(404).json({ message: "Meal not found." });
  res.json(await hydrateMealDocument(req.user._id, meal));
});

router.put("/:id", auth, async (req, res) => {
  try {
    const previousMeal = await Meal.findOne({ _id: req.params.id, userId: req.user._id });
    const mealBody = await buildMealBody(req);
    delete mealBody.userId;

    const meal = await Meal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      mealBody,
      { new: true },
    );

    if (!meal) return res.status(404).json({ message: "Meal not found." });
    res.json(await hydrateMealDocument(req.user._id, meal));
    if (previousMeal?.imagePublicId && previousMeal.imagePublicId !== meal.imagePublicId) {
      deleteCloudinaryImageIfUnused(previousMeal.imagePublicId).catch(error => {
        console.warn(`Could not check old meal image usage: ${error.message}`);
      });
    }
  } catch (err) {
    res
      .status(400)
      .json({ message: "Could not update meal.", error: err.message });
  }
});

router.post("/:id/image/refresh", auth, async (req, res) => {
  try {
    const result = await refreshDocumentImage({
      model: Meal,
      documentId: req.params.id,
      userId: req.user._id,
      type: "meal",
      confirmReplace: Boolean(req.body.confirmReplace),
    });
    if (!result.document) return res.status(result.status).json(result);
    res.json(await hydrateMealDocument(req.user._id, result.document));
  } catch (error) {
    res.status(500).json({ message: error.message || "Could not refresh image." });
  }
});

router.delete("/:id/image", auth, async (req, res) => {
  try {
    const result = await removeDocumentImage({
      model: Meal,
      documentId: req.params.id,
      userId: req.user._id,
      type: "meal",
    });
    if (!result.document) return res.status(result.status).json(result);
    res.json(await hydrateMealDocument(req.user._id, result.document));
  } catch (error) {
    res.status(500).json({ message: error.message || "Could not remove image." });
  }
});

router.delete("/:id", auth, async (req, res) => {
  const meal = await Meal.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!meal) return res.status(404).json({ message: "Meal not found." });
  res.json({ message: "Meal deleted." });
  if (meal.imagePublicId) {
    deleteCloudinaryImageIfUnused(meal.imagePublicId).catch(error => {
      console.warn(`Could not clean up deleted meal image: ${error.message}`);
    });
  }
});

module.exports = router;
