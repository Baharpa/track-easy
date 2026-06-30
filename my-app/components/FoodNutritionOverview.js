import { formatAmount, formatCalories, formatMacro } from '../lib/formatNutrition';

const METRICS = [
  ['calories', 'Calories', '#ef795f', ' cal', formatCalories],
  ['protein', 'Protein', '#77a477', 'g', formatMacro],
  ['carbs', 'Carbs', '#6594be', 'g', formatMacro],
  ['fats', 'Fats', '#e5ad51', 'g', formatMacro],
  ['sugar', 'Sugar', '#a981bd', 'g', formatMacro],
];

export function getFoodNutrition(item = {}) {
  return {
    calories: Number(item.totalCalories ?? item.calories ?? 0),
    protein: Number(item.totalProtein ?? item.protein ?? 0),
    carbs: Number(item.totalCarbs ?? item.carbs ?? 0),
    fats: Number(item.totalFats ?? item.fats ?? item.fat ?? 0),
    sugar: Number(item.totalSugar ?? item.sugar ?? 0),
  };
}

export default function FoodNutritionOverview({ item, amount, amountLabel = 'total', title = 'Nutrition Overview' }) {
  const nutrition = getFoodNutrition(item);
  const total = METRICS.reduce((sum, [key]) => sum + Math.max(0, nutrition[key]), 0);
  const divisor = total || 1;
  let position = 0;
  const stops = total === 0 ? '#e9e5dc 0% 100%' : METRICS.map(([key, , color]) => {
    const size = Math.max(0, nutrition[key]) / divisor * 100;
    const start = position;
    position += size;
    return `${color} ${start}% ${position}%`;
  }).join(', ');
  const displayAmount = typeof amount === 'number' ? formatAmount(amount) : amount;

  return (
    <section className="meal-overview-nutrition-card" aria-label={title}>
      <div className="meal-overview-total">
        <span>{title}</span>
        <div><strong>{formatCalories(nutrition.calories)}</strong><small>cal</small></div>
        {displayAmount && <p><strong>{displayAmount}</strong><span>{amountLabel}</span></p>}
      </div>
      <div className="meal-overview-chart-area">
        <div className="meal-overview-donut" style={{ background: `conic-gradient(${stops})` }} aria-label={`${title} chart`}>
          <div className="meal-overview-donut-center">
            <strong>{formatCalories(nutrition.calories)}</strong><span>cal</span>
            {displayAmount && <small>{displayAmount}</small>}
          </div>
        </div>
        <div className="meal-overview-legend">
          {METRICS.map(([key, label, color, unit, formatter]) => (
            <div className="meal-overview-legend-item" key={key}>
              <i style={{ backgroundColor: color }} />
              <span><strong>{label}</strong><small>{formatter(nutrition[key])}{unit} · {Math.round(Math.max(0, nutrition[key]) / divisor * 100)}%</small></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
