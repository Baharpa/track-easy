export const DEFAULT_MEAL_PART_NAME = "Main";

export const MEAL_PART_NAME_OPTIONS = [
  "Flatbread",
  "Eggs",
  "Avocado",
  "Pasta",
  "Meat sauce",
  "Toppings",
];

export function createMealPartId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `meal-part-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultMealPart(name = DEFAULT_MEAL_PART_NAME) {
  return {
    id: createMealPartId(),
    name,
    category: name,
    ingredients: [],
  };
}

export function normalizeMealPart(part, fallbackName = DEFAULT_MEAL_PART_NAME) {
  const name = String(part?.name || "").trim() || fallbackName;
  return {
    id: String(part?.id || part?._id || "").trim() || createMealPartId(),
    name,
    category: String(part?.category || "").trim() || name,
    ingredients: Array.isArray(part?.ingredients)
      ? part.ingredients.filter(Boolean)
      : [],
  };
}

export function normalizeMealParts(
  parts = [],
  fallbackName = DEFAULT_MEAL_PART_NAME,
) {
  const normalized = (Array.isArray(parts) ? parts : [])
    .map((part) => normalizeMealPart(part, fallbackName))
    .filter(Boolean);

  if (normalized.length === 0) {
    return [createDefaultMealPart(fallbackName)];
  }

  return normalized;
}

export function mealToMealParts(meal = {}) {
  if (meal?.outsideFood) return [];

  const categoryFallback = meal?.category || DEFAULT_MEAL_PART_NAME;
  const mealParts = Array.isArray(meal?.mealParts) ? meal.mealParts : [];
  const components = Array.isArray(meal?.components) ? meal.components : [];

  if (mealParts.length > 0) {
    return normalizeMealParts(mealParts, categoryFallback);
  }

  if (components.length > 0) {
    return normalizeMealParts(components, categoryFallback);
  }

  if (Array.isArray(meal?.ingredients) && meal.ingredients.length > 0) {
    return [
      {
        id: createMealPartId(),
        name: DEFAULT_MEAL_PART_NAME,
        category: categoryFallback,
        ingredients: meal.ingredients.filter(Boolean),
      },
    ];
  }

  return [createDefaultMealPart(DEFAULT_MEAL_PART_NAME)];
}
