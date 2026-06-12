import { getSavedQuantityNutrition } from './unitConverter';

export function formatNumber(value, decimals = 1) {
  const number = Number(value) || 0;
  const rounded = Number(number.toFixed(decimals));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function formatCalories(value) {
  const number = Number(value) || 0;
  const roundedOneDecimal = Number(number.toFixed(1));
  return Number.isInteger(roundedOneDecimal)
    ? String(roundedOneDecimal)
    : String(roundedOneDecimal);
}

export function formatMacro(value) {
  return formatNumber(value, 1);
}

export function formatAmount(value) {
  return formatNumber(value, 1);
}

export function formatServingLabel(ingredient) {
  const amount = formatAmount(ingredient?.quantity);
  const unit = ingredient?.unit || 'grams';
  return `${amount} ${unit}`;
}

export function getIngredientServingNutrition(ingredient) {
  return getSavedQuantityNutrition(ingredient);
}

export function formatIngredientServingNutrition(ingredient) {
  const serving = formatServingLabel(ingredient);
  const nutrition = getIngredientServingNutrition(ingredient);

  return `${formatCalories(nutrition.calories)} cal per ${serving} - ${formatMacro(nutrition.protein)}g protein per ${serving}`;
}
