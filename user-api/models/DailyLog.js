const mongoose = require('mongoose');

const loggedMealSchema = new mongoose.Schema({
  type: { type: String, enum: ['meal', 'ingredient'], default: 'meal' },
  mealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal' },
  ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
  name: String,
  amount: Number,
  unit: String,
  gramsUsed: Number,
  
  // Portion system (new)
  portionMode: { type: String, default: 'whole' },
  portion: { type: Number, default: 1 },
  portionLabel: { type: String, default: '1 whole meal' },
  portionFactor: { type: Number, default: 1 },
  loggedGrams: { type: Number, default: 0 },
  
  // Legacy servings (for backwards compatibility)
  servings: { type: Number, default: 1 },
  
  // Nutrition values (calculated based on portion)
  calories: Number,
  protein: Number,
  carbs: Number,
  fats: Number,
  sugar: Number,

  ingredients: [{
      ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
      name: String,
      quantityUsed: Number,
      unit: String,
      gramsUsed: Number,
      calories: Number,
      protein: Number,
      carbs: Number,
      fats: Number,
    sugar: Number
  }],

  components: [{
    id: String,
    name: String,
    category: String,
    eatenWeight: Number,
    unit: String,
    ingredients: [{
      ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
      name: String,
      quantityUsed: Number,
      unit: String,
      calories: Number,
      protein: Number,
      carbs: Number,
      fats: Number,
      sugar: Number
    }],
    nutritionTotals: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fats: Number,
      sugar: Number
    }
  }],

  mealParts: [{
    id: String,
    name: String,
    category: String,
    eatenWeight: Number,
    unit: String,
    ingredients: [{
      ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
      name: String,
      quantityUsed: Number,
      unit: String,
      gramsUsed: Number,
      calories: Number,
      protein: Number,
      carbs: Number,
      fats: Number,
      sugar: Number
    }],
    nutritionTotals: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fats: Number,
      sugar: Number
    }
  }],

  componentPortions: [{
    componentIndex: Number,
    eatenAmount: Number,
    unit: String
  }],

  // For logging timestamp if needed
  loggedAt: { type: Date, default: Date.now }
}, { _id: true });

const dailyLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  meals: [loggedMealSchema],
  totalCalories: { type: Number, default: 0 },
  totalProtein: { type: Number, default: 0 },
  totalCarbs: { type: Number, default: 0 },
  totalFats: { type: Number, default: 0 },
  totalSugar: { type: Number, default: 0 }
});

dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyLog', dailyLogSchema);
