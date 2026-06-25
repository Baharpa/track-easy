import { TrackEasyIcon } from './TrackEasyIcons';

const nutritionIcons = {
  Calories: 'flame',
  Protein: 'muscle',
  Carbs: 'grain',
  Fats: 'drop',
  Fat: 'drop',
  Sugar: 'candy'
};

function getChipText(row = {}) {
  const text = String(row.value || '');
  const label = String(row.label || '').toLowerCase();

  if (!label || text.toLowerCase().includes(label) || text.toLowerCase().includes('cal')) {
    return text;
  }

  return `${text} ${label}`;
}

export default function NutritionRows({ rows = [], showIcons = true, className = '' }) {
  return (
    <div className={`food-nutrition-rows ${className}`.trim()}>
      {rows.map(row => {
        const chipText = getChipText(row);
        return (
          <div className="food-nutrition-row" key={row.label}>
            {showIcons && (
              <span className="food-nutrition-row__icon" aria-hidden="true">
                <TrackEasyIcon name={nutritionIcons[row.label] || 'leaf'} size={18} />
              </span>
            )}
            <span className="food-nutrition-row__copy">{chipText}</span>
          </div>
        );
      })}
    </div>
  );
}
