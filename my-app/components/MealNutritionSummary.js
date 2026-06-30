import { Card } from 'react-bootstrap';
import { formatCalories, formatMacro } from '../lib/formatNutrition';

const nutritionStats = [
  { key: 'calories', label: 'Calories', format: formatCalories, unit: 'cal' },
  { key: 'protein', label: 'Protein', format: formatMacro, unit: 'g' },
  { key: 'carbs', label: 'Carbs', format: formatMacro, unit: 'g' },
  { key: 'fats', label: 'Fats', format: formatMacro, unit: 'g' },
  { key: 'sugar', label: 'Sugar', format: formatMacro, unit: 'g' }
];

export default function MealNutritionSummary({ totals = {}, rows = [] }) {
  return (
    <Card className="page-card builder-summary-card">
      <Card.Body>
        <div className="builder-summary-header">
          <div>
            <h4>Nutrition Summary</h4>
            <p>Calculated from the ingredient amounts in this meal.</p>
          </div>
          <span className="builder-summary-total-label">Total</span>
        </div>

        <div className="builder-summary-stats" aria-label="Meal nutrition totals">
          {nutritionStats.map((stat) => (
            <div className="builder-summary-stat" key={stat.key}>
              <span>{stat.label}</span>
              <strong>{stat.format(totals[stat.key])}{stat.unit}</strong>
            </div>
          ))}
        </div>

        {rows.length > 0 && (
          <details className="builder-summary-breakdown">
            <summary>
              <span>Ingredient breakdown</span>
              <small>{rows.length} ingredient{rows.length === 1 ? '' : 's'}</small>
            </summary>
            <div className="builder-summary-breakdown-list">
              {rows.map((item, index) => (
                <div className="builder-summary-breakdown-row" key={`${item.ingredientId}-${index}`}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.amountLabel}</span>
                  </div>
                  <span>{formatCalories(item.calories)} cal · {formatMacro(item.protein)}g protein</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </Card.Body>
    </Card>
  );
}
