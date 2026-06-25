import { findPopularFoods } from './popularFoods';

export function normalizeFoodQuery(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const smartMealTemplates = [
  {
    id: 'chicken-salad',
    name: 'Chicken Salad',
    type: 'meal',
    aliases: ['chicken salad', 'grilled chicken salad'],
    category: 'Lunch',
    explanation: 'This is usually a mixed meal, so build it from lean protein, greens, vegetables, dressing, and acid.',
    suggestedComponents: [
      { name: 'Chicken breast', amount: 120, unit: 'grams' },
      { name: 'Lettuce or mixed greens', amount: 80, unit: 'grams' },
      { name: 'Cucumber', amount: 50, unit: 'grams' },
      { name: 'Tomato', amount: 60, unit: 'grams' },
      { name: 'Olive oil', amount: 10, unit: 'grams' },
      { name: 'Lemon juice', amount: 15, unit: 'grams' }
    ]
  },
  {
    id: 'tuna-salad',
    name: 'Tuna Salad',
    type: 'meal',
    aliases: ['tuna salad'],
    category: 'Lunch',
    explanation: 'Tuna salad works best as a meal made from tuna, greens or vegetables, and a small dressing amount.',
    suggestedComponents: [
      { name: 'Tuna', amount: 120, unit: 'grams' },
      { name: 'Lettuce or mixed greens', amount: 80, unit: 'grams' },
      { name: 'Celery', amount: 40, unit: 'grams' },
      { name: 'Cucumber', amount: 50, unit: 'grams' },
      { name: 'Greek yogurt or mayonnaise', amount: 25, unit: 'grams' }
    ]
  },
  {
    id: 'egg-salad',
    name: 'Egg Salad',
    type: 'meal',
    aliases: ['egg salad'],
    category: 'Lunch',
    explanation: 'Egg salad is a combined food, so review eggs, dressing, and vegetables before saving.',
    suggestedComponents: [
      { name: 'Eggs', amount: 2, unit: 'pieces' },
      { name: 'Greek yogurt or mayonnaise', amount: 25, unit: 'grams' },
      { name: 'Celery', amount: 30, unit: 'grams' },
      { name: 'Green onion', amount: 15, unit: 'grams' }
    ]
  },
  {
    id: 'fruit-salad',
    name: 'Fruit Salad',
    type: 'meal',
    aliases: ['fruit salad'],
    category: 'Snack',
    explanation: 'Fruit salad is easier to track as a meal because the fruit mix changes by serving.',
    suggestedComponents: [
      { name: 'Strawberries', amount: 80, unit: 'grams' },
      { name: 'Blueberries', amount: 60, unit: 'grams' },
      { name: 'Banana', amount: 60, unit: 'grams' },
      { name: 'Apple', amount: 80, unit: 'grams' }
    ]
  },
  {
    id: 'oatmeal-bowl',
    name: 'Oatmeal Bowl',
    type: 'meal',
    aliases: ['oatmeal bowl', 'oats bowl', 'porridge bowl'],
    category: 'Breakfast',
    explanation: 'An oatmeal bowl is usually oats plus liquid and toppings, not one standalone ingredient.',
    suggestedComponents: [
      { name: 'Rolled oats', amount: 50, unit: 'grams' },
      { name: 'Milk', amount: 150, unit: 'milliliters' },
      { name: 'Banana', amount: 60, unit: 'grams' },
      { name: 'Peanut butter', amount: 15, unit: 'grams' }
    ]
  },
  {
    id: 'greek-yogurt-bowl',
    name: 'Greek Yogurt Bowl',
    type: 'meal',
    aliases: ['greek yogurt bowl', 'yogurt bowl'],
    category: 'Breakfast',
    explanation: 'A yogurt bowl is best built from yogurt, fruit, and toppings so portions stay editable.',
    suggestedComponents: [
      { name: 'Greek yogurt', amount: 200, unit: 'grams' },
      { name: 'Blueberries', amount: 70, unit: 'grams' },
      { name: 'Granola', amount: 30, unit: 'grams' },
      { name: 'Honey', amount: 10, unit: 'grams' }
    ]
  },
  {
    id: 'rice-bowl',
    name: 'Rice Bowl',
    type: 'meal',
    aliases: ['rice bowl'],
    category: 'Dinner',
    explanation: 'Rice bowls are flexible meals. Start with rice, protein, vegetables, and sauce.',
    suggestedComponents: [
      { name: 'Cooked rice', amount: 150, unit: 'grams' },
      { name: 'Mixed vegetables', amount: 120, unit: 'grams' },
      { name: 'Protein of choice', amount: 120, unit: 'grams' },
      { name: 'Sauce', amount: 20, unit: 'grams' }
    ]
  },
  {
    id: 'chicken-rice-bowl',
    name: 'Chicken Rice Bowl',
    type: 'meal',
    aliases: ['chicken rice bowl', 'chicken and rice bowl'],
    category: 'Dinner',
    explanation: 'This is a full bowl meal, so track the chicken, rice, vegetables, and sauce separately.',
    suggestedComponents: [
      { name: 'Chicken breast', amount: 130, unit: 'grams' },
      { name: 'Cooked rice', amount: 150, unit: 'grams' },
      { name: 'Broccoli', amount: 90, unit: 'grams' },
      { name: 'Olive oil', amount: 10, unit: 'grams' },
      { name: 'Sauce', amount: 20, unit: 'grams' }
    ]
  },
  {
    id: 'salmon-bowl',
    name: 'Salmon Bowl',
    type: 'meal',
    aliases: ['salmon bowl', 'salmon rice bowl'],
    category: 'Dinner',
    explanation: 'A salmon bowl is usually salmon, grains, vegetables, and sauce in one serving.',
    suggestedComponents: [
      { name: 'Salmon', amount: 130, unit: 'grams' },
      { name: 'Cooked rice', amount: 140, unit: 'grams' },
      { name: 'Cucumber', amount: 50, unit: 'grams' },
      { name: 'Avocado', amount: 50, unit: 'grams' },
      { name: 'Soy sauce', amount: 15, unit: 'grams' }
    ]
  },
  {
    id: 'smoothie',
    name: 'Smoothie',
    type: 'meal',
    aliases: ['smoothie', 'fruit smoothie'],
    category: 'Snack',
    explanation: 'Smoothies are mixed drinks, so build them from fruit, liquid, and optional extras.',
    suggestedComponents: [
      { name: 'Banana', amount: 100, unit: 'grams' },
      { name: 'Frozen berries', amount: 120, unit: 'grams' },
      { name: 'Milk', amount: 200, unit: 'milliliters' },
      { name: 'Greek yogurt', amount: 80, unit: 'grams' }
    ]
  },
  {
    id: 'protein-smoothie',
    name: 'Protein Smoothie',
    type: 'meal',
    aliases: ['protein smoothie', 'protein shake'],
    category: 'Snack',
    explanation: 'Protein smoothies need editable amounts for powder, fruit, and liquid.',
    suggestedComponents: [
      { name: 'Protein powder', amount: 30, unit: 'grams' },
      { name: 'Banana', amount: 100, unit: 'grams' },
      { name: 'Milk', amount: 250, unit: 'milliliters' },
      { name: 'Peanut butter', amount: 15, unit: 'grams' }
    ]
  },
  {
    id: 'avocado-toast',
    name: 'Avocado Toast',
    type: 'meal',
    aliases: ['avocado toast', 'avocado on toast'],
    category: 'Breakfast',
    explanation: 'Avocado toast combines bread, avocado, and toppings, so review the serving before saving.',
    suggestedComponents: [
      { name: 'Bread', amount: 1, unit: 'pieces' },
      { name: 'Avocado', amount: 70, unit: 'grams' },
      { name: 'Lemon juice', amount: 5, unit: 'grams' },
      { name: 'Egg', amount: 1, unit: 'pieces' }
    ]
  },
  {
    id: 'eggs-and-toast',
    name: 'Eggs and Toast',
    type: 'meal',
    aliases: ['eggs and toast', 'egg and toast', 'toast and eggs'],
    category: 'Breakfast',
    explanation: 'This is a simple plated meal. Track the eggs, toast, and cooking fat separately.',
    suggestedComponents: [
      { name: 'Eggs', amount: 2, unit: 'pieces' },
      { name: 'Bread', amount: 1, unit: 'pieces' },
      { name: 'Butter', amount: 5, unit: 'grams' }
    ]
  }
];

export const SMART_FOOD_SUGGESTIONS = smartMealTemplates;

export function getSmartFoodSuggestion(query = '') {
  const normalizedQuery = normalizeFoodQuery(query);
  if (!normalizedQuery) return null;

  return smartMealTemplates.find(template => (
    template.id === normalizedQuery.replace(/\s+/g, '-') ||
    template.aliases.some(alias => normalizeFoodQuery(alias) === normalizedQuery)
  )) || null;
}

export function getSmartFoodMatch(query = '') {
  const normalizedQuery = normalizeFoodQuery(query);
  if (normalizedQuery.length < 3) {
    return { exactIngredient: null, libraryMatches: [], suggestion: null };
  }

  const libraryMatches = findPopularFoods(query).slice(0, 6);
  const exactIngredient = libraryMatches.find(food => normalizeFoodQuery(food.name) === normalizedQuery) || null;

  return {
    exactIngredient,
    libraryMatches,
    suggestion: exactIngredient ? null : getSmartFoodSuggestion(query)
  };
}
