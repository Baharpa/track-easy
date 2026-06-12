import { calculateNutritionWithUnit, convertToGramsExport } from './unitConverter';

export function round(num) {
  return Math.round((Number(num) || 0) * 10) / 10;
}

// LEGACY: Scale nutrition based on ingredient's total quantity
export function scaleNutrition(ingredient, quantityUsed) {
  const ratio = ingredient.quantity > 0 ? Number(quantityUsed) / ingredient.quantity : 0;
  return {
    calories: round(ingredient.calories * ratio),
    protein: round(ingredient.protein * ratio),
    carbs: round(ingredient.carbs * ratio),
    fats: round(ingredient.fats * ratio),
    sugar: round(ingredient.sugar * ratio)
  };
}

export function addTotals(items) {
  return items.reduce((total, item) => {
    total.calories += Number(item.calories) || 0;
    total.protein += Number(item.protein) || 0;
    total.carbs += Number(item.carbs) || 0;
    total.fats += Number(item.fats) || 0;
    total.sugar += Number(item.sugar) || 0;
    return total;
  }, { calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0 });
}

export function buildPreviewIngredients(ingredients, selected) {
  return selected
    .map(item => {
      const ingredient = ingredients.find(ing => ing._id === item.ingredientId);
      if (!ingredient) return null;
      
      const unit = item.unit || 'grams';
      const convertedGrams = convertToGramsExport(Number(item.quantityUsed), unit, ingredient);
      const gramsUsed = convertedGrams || (unit === 'pieces' && ingredient.unit === 'pieces' ? Number(item.quantityUsed) : 0);
      const nutrition = calculateNutritionWithUnit(Number(item.quantityUsed), unit, ingredient);
      
      return {
        ingredientId: ingredient._id,
        name: ingredient.name,
        quantityUsed: round(gramsUsed || 0),
        unit: 'grams',
        originalQuantityUsed: Number(item.quantityUsed),
        originalUnit: unit,
        gramsUsed: round(gramsUsed || 0),
        ...nutrition
      };
    })
    .filter(Boolean);
}

export function buildPreviewComponents(ingredients, components) {
  return components.map(component => {
    const original = buildPreviewIngredients(ingredients, component.ingredients || []);
    
    // For components, totalWeight is calculated in grams from the original ingredients
    const totalWeight = original.reduce((sum, item) => {
      const gramsUsed = Number(item.gramsUsed || item.quantityUsed || 0);
      return sum + (gramsUsed || 0);
    }, 0);
    
    return {
      ...component,
      totalWeight: round(totalWeight),
      ingredients: original,
      nutritionTotals: addTotals(original)
    };
  });
}
