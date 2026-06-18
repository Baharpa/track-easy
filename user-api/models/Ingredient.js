const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'Other' },
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'grams', enum: ['grams', 'kilograms', 'milliliters', 'liters', 'teaspoons', 'tablespoons', 'cups', 'pieces'] },
  
  // Nutrition values per 100g (new system)
  caloriesPer100g: { type: Number, default: 0 },
  proteinPer100g: { type: Number, default: 0 },
  carbsPer100g: { type: Number, default: 0 },
  fatsPer100g: { type: Number, default: 0 },
  sugarPer100g: { type: Number, default: 0 },

  // Nutrition label details (autofill support)
  servingSize: { type: String, default: '' },
  saturatedFat: { type: Number, default: 0 },
  transFat: { type: Number, default: 0 },
  fiber: { type: Number, default: 0 },
  sodium: { type: Number, default: 0 },
  cholesterol: { type: Number, default: 0 },
  
  // Legacy nutrition fields (for backwards compatibility, stores totals for original quantity)
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fats: { type: Number, default: 0 },
  sugar: { type: Number, default: 0 },
  
  // Ingredient-specific conversion values (grams per unit)
  // If not set, uses default conversions from unitConverter.js
  gramsPerTeaspoon: { type: Number },
  gramsPerTablespoon: { type: Number },
  gramsPerCup: { type: Number },
  gramsPerPiece: { type: Number },
  
  imageUrl: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Ingredient', ingredientSchema);
