const { extractNutritionLabelFields } = require('./nutritionLabelParser');

const sample = `
Calories 150
Total Fat 6g
Saturated Fat 2g
Total Carbohydrate 24g
Total Sugars 9g
Includes 7g Added Sugars
Protein 12g
`;

const expected = {
  calories: 150,
  fat: 6,
  carbohydrates: 24,
  sugar: 9,
  protein: 12
};

const actual = extractNutritionLabelFields(sample);
const failures = Object.entries(expected)
  .filter(([key, value]) => actual[key] !== value)
  .map(([key, value]) => `${key}: expected ${value}, got ${actual[key]}`);

if (failures.length > 0) {
  console.error('Nutrition label parser sample failed.');
  failures.forEach(failure => console.error(failure));
  process.exit(1);
}

console.log('Nutrition label parser sample passed.', actual);
