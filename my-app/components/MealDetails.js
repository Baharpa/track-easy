import { useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import FoodImage from './FoodImage';
import { TrackEasyIcon } from './TrackEasyIcons';
import { formatAmount, formatCalories, formatMacro } from '../lib/formatNutrition';
import { normalizeMealCategory } from '../lib/mealCategoryHelpers';

const nutritionItems = [
  { key: 'calories', label: 'Calories', color: '#ef795f', format: formatCalories, unit: ' cal' },
  { key: 'protein', label: 'Protein', color: '#77a477', format: formatMacro, unit: 'g' },
  { key: 'carbs', label: 'Carbs', color: '#6594be', format: formatMacro, unit: 'g' },
  { key: 'fats', label: 'Fats', color: '#e5ad51', format: formatMacro, unit: 'g' },
  { key: 'sugar', label: 'Sugar', color: '#a981bd', format: formatMacro, unit: 'g' }
];

function mealNutrition(meal) {
  return {
    calories: Number(meal.totalCalories ?? meal.calories ?? 0),
    protein: Number(meal.totalProtein ?? meal.protein ?? 0),
    carbs: Number(meal.totalCarbs ?? meal.carbs ?? 0),
    fats: Number(meal.totalFats ?? meal.fats ?? 0),
    sugar: Number(meal.totalSugar ?? meal.sugar ?? 0)
  };
}

function amountLabel(item) {
  const amount = item.originalQuantityUsed ?? item.quantityUsed ?? item.amount ?? item.gramsUsed ?? 0;
  const unit = item.originalUnit || item.unit || (item.gramsUsed ? 'grams' : '');
  return `${formatAmount(amount)} ${unit}`.trim();
}

function nutritionNumber(item, keys) {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== '') {
      const value = Number(item[key]);
      if (Number.isFinite(value)) return value;
    }
  }
  return 0;
}

function ingredientGrams(item) {
  const grams = Number(item.gramsUsed);
  if (grams > 0) return grams;
  const unit = String(item.originalUnit || item.unit || '').toLowerCase();
  const amount = Number(item.originalQuantityUsed ?? item.quantityUsed ?? item.amount ?? 0);
  if (unit === 'kilograms' || unit === 'kilogram' || unit === 'kg') return amount * 1000;
  if (unit === 'grams' || unit === 'gram' || unit === 'g') return amount;
  return null;
}

function mealWeight(meal, ingredients) {
  if (Number(meal.totalWeight) > 0) return Number(meal.totalWeight);
  const gramWeights = ingredients.map(({ ingredient }) => Number(ingredient.gramsUsed || 0));
  if (gramWeights.some((value) => value > 0)) return gramWeights.reduce((sum, value) => sum + value, 0);
  return ingredients.reduce((sum, { ingredient }) => {
    const unit = String(ingredient.unit || '').toLowerCase();
    return unit.includes('gram') ? sum + Number(ingredient.quantityUsed || 0) : sum;
  }, 0);
}

export default function MealDetails({ meal }) {
  const [expanded, setExpanded] = useState(false);
  const category = normalizeMealCategory(meal.category);
  const parts = meal.mealParts?.length ? meal.mealParts : meal.components || [];
  const ingredientEntries = useMemo(() => {
    if (parts.length > 0) {
      return parts.flatMap((part) => (part.ingredients || []).map((ingredient) => ({
        ingredient,
        section: part.name || part.category || 'Main'
      })));
    }
    return (meal.ingredients || []).map((ingredient) => ({ ingredient, section: '' }));
  }, [meal.ingredients, parts]);
  const visibleEntries = expanded ? ingredientEntries : ingredientEntries.slice(0, 5);
  const hiddenCount = Math.max(0, ingredientEntries.length - 5);
  const nutrition = mealNutrition(meal);
  const weight = mealWeight(meal, ingredientEntries);
  const nutritionSum = nutritionItems.reduce((sum, item) => sum + Math.max(0, nutrition[item.key]), 0);
  const chartTotal = nutritionSum || 1;
  let chartPosition = 0;
  const chartStops = nutritionSum === 0 ? '#e9e5dc 0% 100%' : nutritionItems.map((item) => {
    const percentage = Math.max(0, nutrition[item.key]) / chartTotal * 100;
    const start = chartPosition;
    chartPosition += percentage;
    return `${item.color} ${start}% ${chartPosition}%`;
  }).join(', ');

  return (
    <>
      <section className="meal-overview-hero">
        <FoodImage src={meal} alt={meal.name} category={category} variant="detail" className="meal-overview-hero-image" placeholderClassName="meal-overview-hero-placeholder" />
        <div className="meal-overview-hero-overlay">
          <span>{category}</span>
          <h2>{meal.name}</h2>
          {weight > 0 && <strong>{formatAmount(weight)} g</strong>}
        </div>
      </section>

      <section className="meal-overview-nutrition-card">
        <div className="meal-overview-total">
          <span>Meal Totals</span>
          <div><strong>{formatCalories(nutrition.calories)}</strong><small>cal</small></div>
          {weight > 0 && <p><strong>{formatAmount(weight)} g</strong><span>total weight</span></p>}
        </div>

        <div className="meal-overview-chart-area">
          <div className="meal-overview-donut" style={{ background: `conic-gradient(${chartStops})` }} aria-label="Meal nutrition chart">
            <div className="meal-overview-donut-center">
              <strong>{formatCalories(nutrition.calories)}</strong>
              <span>cal</span>
              {weight > 0 && <small>{formatAmount(weight)} g total</small>}
            </div>
          </div>
          <div className="meal-overview-legend">
            {nutritionItems.map((item) => {
              const percentage = Math.round(Math.max(0, nutrition[item.key]) / chartTotal * 100);
              return (
                <div className="meal-overview-legend-item" key={item.key}>
                  <i style={{ backgroundColor: item.color }} />
                  <span><strong>{item.label}</strong><small>{item.format(nutrition[item.key])}{item.unit} · {percentage}%</small></span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="meal-overview-ingredients-card">
        <header className="meal-overview-ingredients-header">
          <span className="meal-overview-ingredients-icon"><TrackEasyIcon name="menu" size={22} /></span>
          <div><h3>Ingredients</h3><p>{ingredientEntries.length} ingredient{ingredientEntries.length === 1 ? '' : 's'}</p></div>
        </header>

        <div className="meal-overview-ingredient-list">
          {visibleEntries.map(({ ingredient, section }, index) => {
            const previousSection = index > 0 ? visibleEntries[index - 1].section : '';
            return (
              <div key={`${ingredient.ingredientId || ingredient.name}-${index}`}>
                {section && section !== previousSection && <div className="meal-overview-section-label">{section}</div>}
                <div className="meal-overview-ingredient-row">
                  <FoodImage src={ingredient} alt={ingredient.name} category={ingredient.category || section || 'Other'} variant="compact" className="meal-overview-ingredient-image" placeholderClassName="meal-overview-ingredient-placeholder" />
                  <strong>{ingredient.name}</strong>
                  <span>{amountLabel(ingredient)}</span>
                </div>
              </div>
            );
          })}
          {ingredientEntries.length === 0 && <p className="meal-overview-empty">No ingredients saved for this meal.</p>}
        </div>

        {hiddenCount > 0 && (
          <Button type="button" variant="link" className={`meal-overview-expand ${expanded ? 'expanded' : ''}`} onClick={() => setExpanded((value) => !value)}>
            {expanded ? 'Show fewer ingredients' : `+ ${hiddenCount} more ingredient${hiddenCount === 1 ? '' : 's'}`}
          </Button>
        )}
      </section>

      {ingredientEntries.length > 0 && (
        <section className="meal-overview-table-card">
          <header>
            <h3>Ingredient Nutrition</h3>
            <p>Everything used in this meal.</p>
          </header>
          <div className="meal-overview-table-wrap">
            <table className="meal-overview-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Grams</th>
                  <th>Calories</th>
                  <th>Protein</th>
                  <th>Fat</th>
                  <th>Carbs</th>
                  <th>Sugar</th>
                </tr>
              </thead>
              <tbody>
                {ingredientEntries.map(({ ingredient, section }, index) => {
                  const grams = ingredientGrams(ingredient);
                  return (
                    <tr key={`${ingredient.ingredientId || ingredient.name}-nutrition-${index}`}>
                      <td><strong>{ingredient.name}</strong>{section && <small>{section}</small>}</td>
                      <td>{grams === null ? '—' : `${formatAmount(grams)}g`}</td>
                      <td>{formatCalories(nutritionNumber(ingredient, ['calories', 'totalCalories']))}</td>
                      <td>{formatMacro(nutritionNumber(ingredient, ['protein', 'totalProtein']))}g</td>
                      <td>{formatMacro(nutritionNumber(ingredient, ['fats', 'fat', 'totalFats']))}g</td>
                      <td>{formatMacro(nutritionNumber(ingredient, ['carbs', 'totalCarbs']))}g</td>
                      <td>{formatMacro(nutritionNumber(ingredient, ['sugar', 'totalSugar']))}g</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
