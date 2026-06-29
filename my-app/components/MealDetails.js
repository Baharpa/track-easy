import { Card, Table } from 'react-bootstrap';
import { formatAmount, formatCalories, formatMacro } from '../lib/formatNutrition';
import FoodImage from './FoodImage';
import { normalizeMealCategory } from '../lib/mealCategoryHelpers';
import NutritionRows from './NutritionRows';

function nutritionValue(item, totalKey, directKey) {
  return item?.[totalKey] ?? item?.[directKey] ?? 0;
}

function amountUsedLabel(item) {
  return `${formatAmount(item?.originalQuantityUsed || item?.quantityUsed)} ${item?.originalUnit || item?.unit || 'g'}`;
}

export default function MealDetails({ meal }) {
  const mealCategory = normalizeMealCategory(meal.category);
  const nutritionStats = [
    { label: 'Calories', value: `${formatCalories(nutritionValue(meal, 'totalCalories', 'calories'))} cal` },
    { label: 'Protein', value: `${formatMacro(nutritionValue(meal, 'totalProtein', 'protein'))}g` },
    { label: 'Carbs', value: `${formatMacro(nutritionValue(meal, 'totalCarbs', 'carbs'))}g` },
    { label: 'Sugar', value: `${formatMacro(nutritionValue(meal, 'totalSugar', 'sugar'))}g` },
    { label: 'Fats', value: `${formatMacro(nutritionValue(meal, 'totalFats', 'fats'))}g` }
  ];
  const components = meal.mealParts?.length ? meal.mealParts : meal.components || [];
  const ingredients = meal.ingredients?.length
    ? meal.ingredients
    : components.flatMap(part => part.ingredients || []);

  return (
    <Card className="page-card meal-details-card">
      <Card.Body>
        <div className="meal-details-hero">
          <FoodImage src={meal.imageUrl} alt={meal.name} category={mealCategory} className="meal-detail-img" placeholderClassName="meal-detail-placeholder" />
          <div>
            <h3 className="mb-1">{meal.name}</h3>
            <div className="meal-detail-category">{mealCategory}</div>
          </div>
        </div>

        <section className="meal-detail-section">
          <div className="meal-detail-section-heading">
            <h4>Total Nutrition</h4>
          </div>
          <NutritionRows rows={nutritionStats} />
        </section>

        {components.length > 0 && (
          <section className="meal-detail-section">
            <div className="meal-detail-section-heading">
              <h4>Meal Parts</h4>
            </div>
            <div className="meal-component-list">
              {components.map((component, index) => (
                <div className="meal-component-row" key={`${component.name}-${index}`}>
                  <div>
                    <h5>{component.name || component.category || 'Component'}</h5>
                    <span>{component.ingredients?.length || 0} ingredient{component.ingredients?.length === 1 ? '' : 's'} - {formatAmount(component.totalWeight)}g total</span>
                  </div>
                  <div className="meal-component-nutrition">
                    {formatCalories(component.nutritionTotals?.calories)} cal - {formatMacro(component.nutritionTotals?.protein)}g protein
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="meal-detail-section">
          <div className="meal-detail-section-heading">
            <h4>Ingredient Breakdown</h4>
          </div>
          <div className="meal-ingredient-table-wrap">
            <Table hover className="meal-ingredient-table">
              <thead><tr><th>Ingredient</th><th>Amount Used</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fats</th><th>Sugar</th></tr></thead>
              <tbody>
                {ingredients.map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td>
                      <div className="meal-ingredient-name-cell">
                        <FoodImage src={item.imageUrl} alt={item.name} category={item.category || 'Other'} className="meal-ingredient-thumb" placeholderClassName="meal-ingredient-placeholder" />
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td>{amountUsedLabel(item)}</td>
                    <td>{formatCalories(item.calories)}</td>
                    <td>{formatMacro(item.protein)}g</td>
                    <td>{formatMacro(item.carbs)}g</td>
                    <td>{formatMacro(item.fats)}g</td>
                    <td>{formatMacro(item.sugar)}g</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          <div className="meal-ingredient-mobile-list">
            {ingredients.map((item, index) => (
              <div className="meal-ingredient-mobile-card" key={`${item.name}-mobile-${index}`}>
                <div className="meal-ingredient-mobile-header">
                  <FoodImage src={item.imageUrl} alt={item.name} category={item.category || 'Other'} className="meal-ingredient-thumb" placeholderClassName="meal-ingredient-placeholder" />
                  <div>
                    <h5>{item.name}</h5>
                    <span>{amountUsedLabel(item)}</span>
                  </div>
                </div>
                <div className="meal-ingredient-mobile-stats">
                  <span>{formatCalories(item.calories)} cal</span>
                  <span>{formatMacro(item.protein)}g protein</span>
                  <span>{formatMacro(item.carbs)}g carbs</span>
                  <span>{formatMacro(item.fats)}g fats</span>
                  <span>{formatMacro(item.sugar)}g sugar</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </Card.Body>
    </Card>
  );
}
