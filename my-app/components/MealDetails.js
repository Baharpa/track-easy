import { Card, Table } from 'react-bootstrap';
import NutritionSummary from './NutritionSummary';
import { formatAmount, formatCalories, formatMacro } from '../lib/formatNutrition';
import FoodImage from './FoodImage';
import { normalizeMealCategory } from '../lib/mealCategoryHelpers';

export default function MealDetails({ meal }) {
  const mealCategory = normalizeMealCategory(meal.category);

  return (
    <>
      <Card className="page-card p-4 mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <FoodImage src={meal.imageUrl} alt={meal.name} category={mealCategory} className="meal-detail-img" placeholderClassName="meal-detail-placeholder" />
          <div>
            <h3 className="mb-1">{meal.name}</h3>
            <div className="text-muted">{mealCategory}</div>
          </div>
        </div>
      </Card>
      <NutritionSummary item={meal} />

      {meal.components?.length > 0 && (
        <Card className="page-card p-4 mt-4">
          <h4>Meal Components</h4>
          <Table responsive hover>
          <thead><tr><th>Component</th><th>Category</th><th>Total Weight</th><th>Calories</th><th>Protein</th></tr></thead>
            <tbody>
              {meal.components.map((component, index) => (
                <tr key={index}>
                  <td>{component.name}</td>
                  <td>{component.category}</td>
                  <td>{formatAmount(component.totalWeight)}g</td>
                  <td>{formatCalories(component.nutritionTotals?.calories)}</td>
                  <td>{formatMacro(component.nutritionTotals?.protein)}g</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Card className="page-card p-4 mt-4">
        <h4>Ingredients</h4>
        <Table responsive hover>
          <thead><tr><th>Ingredient</th><th>Amount Used</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fats</th><th>Sugar</th></tr></thead>
          <tbody>
            {meal.ingredients?.map((item, index) => (
              <tr key={index}>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <FoodImage src={item.imageUrl} alt={item.name} category={item.category || 'Other'} />
                    <span>{item.name}</span>
                  </div>
                </td>
                <td>{formatAmount(item.originalQuantityUsed || item.quantityUsed)} {item.originalUnit || item.unit}</td>
                <td>{formatCalories(item.calories)}</td>
                <td>{formatMacro(item.protein)}g</td>
                <td>{formatMacro(item.carbs)}g</td>
                <td>{formatMacro(item.fats)}g</td>
                <td>{formatMacro(item.sugar)}g</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
