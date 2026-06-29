const mongoose = require("mongoose");

const mealIngredientSchema = new mongoose.Schema(
  {
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient" },
    name: String,
    quantityUsed: Number,
    unit: String,
    originalQuantityUsed: Number,
    originalUnit: String,
    gramsUsed: Number,
    conversionWarning: String,
    calories: Number,
    protein: Number,
    carbs: Number,
    fats: Number,
    sugar: Number,
  },
  { _id: false },
);

const mealComponentSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    category: String,
    ingredients: [mealIngredientSchema],
    totalWeight: Number,
    nutritionTotals: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fats: Number,
      sugar: Number,
    },
  },
  { _id: false },
);

const mealSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: "Meal" },
    imageUrl: { type: String, default: "" },
    outsideFood: { type: Boolean, default: false },
    restaurantName: { type: String, default: "" },
    components: [mealComponentSchema],
    mealParts: [mealComponentSchema],
    ingredients: [mealIngredientSchema],
    totalCalories: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalCarbs: { type: Number, default: 0 },
    totalFats: { type: Number, default: 0 },
    totalSugar: { type: Number, default: 0 },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Meal", mealSchema);
