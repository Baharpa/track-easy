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

  conversions: [{
    amount: { type: Number, required: true },
    unit: { type: String, required: true },
    gramsEquivalent: { type: Number, required: true }
  }],

  // Legacy alias kept for compatibility with older saved documents and code paths.
  servingOptions: [{
    label: { type: String },
    amount: { type: Number, required: true },
    unit: { type: String, required: true },
    gramsEquivalent: { type: Number }
  }],

  // Legacy fallback kept for compatibility with older saved documents.
  measuringOptions: [{
    label: { type: String, required: true },
    unit: { type: String, required: true },
    amount: { type: Number, required: true },
    grams: { type: Number, required: true }
  }],
  
  imageUrl: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  imageSource: { type: String, default: '' },
  imageSourceUrl: { type: String, default: '' },
  imageAuthor: { type: String, default: '' },
  imageAttribution: {
    provider: { type: String, default: '' },
    photographer: { type: String, default: '' },
    photographerUrl: { type: String, default: '' },
    sourceUrl: { type: String, default: '' }
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Ingredient', ingredientSchema);
