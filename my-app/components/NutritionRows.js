import { TrackEasyIcon } from './TrackEasyIcons';

const nutritionIcons = {
  Calories: 'flame',
  Protein: 'muscle',
  Carbs: 'grain',
  Fats: 'drop',
  Fat: 'drop',
  Sugar: 'candy'
};

function getNutrientKey(row = {}) {
  return row.nutrient || row.label || '';
}

function getNutrientClass(row = {}) {
  return String(getNutrientKey(row) || 'nutrition')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getChipText(row = {}) {
  const text = String(row.value || '');
  const label = String(row.label || '').toLowerCase();

  if (!label || text.toLowerCase().includes(label) || text.toLowerCase().includes('cal')) {
    return text;
  }

  return `${text} ${label}`;
}

export default function NutritionRows({ rows = [], showIcons = true, premium = false, className = '' }) {
  return (
    <div className={`food-nutrition-rows ${className}`.trim()}>
      {rows.map(row => {
        const chipText = getChipText(row);
        const nutrientKey = getNutrientKey(row);
        const displayLabel = row.displayLabel || row.label;
        return (
          <div className={`food-nutrition-row food-nutrition-row--${getNutrientClass(row)}`} key={row.label}>
            {showIcons && (
              <span className="food-nutrition-row__icon" aria-hidden="true">
                <TrackEasyIcon name={nutritionIcons[nutrientKey] || 'leaf'} size={premium ? 17 : 18} />
              </span>
            )}
            {premium ? (
              <span className="food-nutrition-row__copy">
                <strong>{row.value}</strong>
                <span>{displayLabel}</span>
              </span>
            ) : (
              <span className="food-nutrition-row__copy">{chipText}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
