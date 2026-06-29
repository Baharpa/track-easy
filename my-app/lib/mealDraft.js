export const MEAL_CREATE_DRAFT_KEY = "trackeasy:meal:create";
export const MEAL_OUTSIDE_FOOD_DRAFT_KEY = "trackeasy:meal:outside-food";
export const INGREDIENT_DRAFT_KEY_PREFIX = "trackeasy:ingredient:draft:";
export const MEAL_EDIT_DRAFT_KEY_PREFIX = "trackeasy:meal:edit:";

export function hasMealDraftContent(draft) {
  const meal = draft?.meal || {};
  const mealParts = Array.isArray(draft?.mealParts)
    ? draft.mealParts
    : Array.isArray(draft?.components)
      ? draft.components
      : [];
  const hasMealPartContent = mealParts.some((part) => {
    const name = String(part?.name || "").trim();
    const ingredientCount = Array.isArray(part?.ingredients)
      ? part.ingredients.length
      : 0;
    return ingredientCount > 0 || (name && name !== "Main");
  });

  return Boolean(
    meal.name?.trim() ||
      meal.category?.trim() ||
      meal.imageUrl?.trim() ||
      draft?.outsideFood ||
      draft?.manualNutrition?.restaurantName?.trim() ||
      Number(draft?.manualNutrition?.calories) > 0 ||
      Number(draft?.manualNutrition?.protein) > 0 ||
      Number(draft?.manualNutrition?.carbs) > 0 ||
      Number(draft?.manualNutrition?.fats) > 0 ||
      Number(draft?.manualNutrition?.sugar) > 0 ||
      hasMealPartContent,
  );
}

export function hasIngredientDraftContent(draft) {
  const ingredient = draft || {};
  return Boolean(
    ingredient.name?.trim() ||
      ingredient.category?.trim() ||
      (ingredient.quantity !== undefined &&
        ingredient.quantity !== null &&
        ingredient.quantity !== "") ||
      ingredient.unit?.trim() ||
      ingredient.imageUrl?.trim() ||
      (Array.isArray(ingredient.conversions) &&
        ingredient.conversions.length > 0) ||
      (Array.isArray(ingredient.servingOptions) &&
        ingredient.servingOptions.length > 0) ||
      (Array.isArray(ingredient.measuringOptions) &&
        ingredient.measuringOptions.length > 0) ||
      Number(ingredient.calories) > 0 ||
      Number(ingredient.protein) > 0 ||
      Number(ingredient.carbs) > 0 ||
      Number(ingredient.fats) > 0 ||
      Number(ingredient.sugar) > 0,
  );
}

export function getIngredientDraftKey(id = "new") {
  return `${INGREDIENT_DRAFT_KEY_PREFIX}${id || "new"}`;
}

export function getMealEditDraftKey(id) {
  return `${MEAL_EDIT_DRAFT_KEY_PREFIX}${id || "new"}`;
}

export function getMealDraftKey({ outsideFood = false, mealId = "" } = {}) {
  if (mealId) return getMealEditDraftKey(mealId);
  return outsideFood ? MEAL_OUTSIDE_FOOD_DRAFT_KEY : MEAL_CREATE_DRAFT_KEY;
}

function readStoredDraft(key) {
  if (typeof window === "undefined") return null;

  try {
    const rawDraft = localStorage.getItem(key);
    if (!rawDraft) return null;
    return JSON.parse(rawDraft);
  } catch {
    return null;
  }
}

export function loadMealDraft(key = MEAL_CREATE_DRAFT_KEY) {
  const draft = readStoredDraft(key);
  return hasMealDraftContent(draft) ? draft : null;
}

export function loadIngredientDraft(key = getIngredientDraftKey()) {
  const draft = readStoredDraft(key);
  return hasIngredientDraftContent(draft) ? draft : null;
}

export function saveMealDraft(draft, key = MEAL_CREATE_DRAFT_KEY) {
  if (typeof window === "undefined") return;

  if (!hasMealDraftContent(draft)) {
    localStorage.removeItem(key);
    return;
  }

  localStorage.setItem(
    key,
    JSON.stringify({
      meal: draft.meal,
      mealParts: draft.mealParts || draft.components || [],
      components: draft.components || draft.mealParts || [],
      outsideFood: Boolean(draft.outsideFood),
      manualNutrition: draft.manualNutrition || {},
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function saveIngredientDraft(draft, key = getIngredientDraftKey()) {
  if (typeof window === "undefined") return;

  if (!hasIngredientDraftContent(draft)) {
    localStorage.removeItem(key);
    return;
  }

  localStorage.setItem(
    key,
    JSON.stringify({
      ...draft,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function clearMealDraft(key = MEAL_CREATE_DRAFT_KEY) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

export function clearIngredientDraft(key = getIngredientDraftKey()) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}
