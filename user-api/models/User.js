const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userName: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meal' }],
  calorieGoal: { type: Number, default: 2000 },
  proteinGoal: { type: Number, default: 100 },
  carbsGoal: { type: Number, default: 250 },
  fatsGoal: { type: Number, default: 70 },
  sugarGoal: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', userSchema);
