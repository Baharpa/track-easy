import { Alert, Form } from 'react-bootstrap';
import UnitSelect from './UnitSelect';
import { formatCalories, formatMacro } from '../lib/formatNutrition';

export default function ServingAmountSelector({
  options = [],
  selectedOption,
  onOptionChange,
  amount,
  onAmountChange,
  unit,
  onUnitChange,
  extraUnits = [],
  amountLabel = 'Amount',
  customLabel,
  customPlaceholder,
  showUnitSelect = true,
  nutrition,
  conversionWarning = '',
  className = ''
}) {
  const safeNutrition = nutrition || { calories: 0, protein: 0, carbs: 0, fats: 0, sugar: 0 };

  return (
    <div className={['serving-amount-selector', className].filter(Boolean).join(' ')}>
      {options.length > 0 && (
        <div className="library-serving-grid">
          {options.map(option => (
            <button
              type="button"
              className={`library-serving-option ${selectedOption === (option.label || option.servingName) ? 'active' : ''}`}
              key={option.label || option.servingName}
              onClick={() => onOptionChange?.(option)}
            >
              {option.label || option.servingName}
            </button>
          ))}
        </div>
      )}

      {(onAmountChange || showUnitSelect) && (
        <Form.Group>
          <Form.Label>{customLabel || amountLabel}</Form.Label>
          <div className="selected-ingredient-inputs">
            {onAmountChange && (
              <Form.Control
                type="number"
                inputMode="decimal"
                enterKeyHint="done"
                min="0"
                step="0.1"
                value={amount ?? ''}
                onChange={event => onAmountChange(event.target.value)}
                placeholder={customPlaceholder || 'Amount'}
              />
            )}
            {showUnitSelect && <UnitSelect value={unit} onChange={event => onUnitChange?.(event.target.value)} extraUnits={extraUnits} />}
          </div>
        </Form.Group>
      )}

      <div className="log-food-preview serving-amount-preview">
        <span>{formatCalories(safeNutrition.calories)} cal</span>
        <span>{formatMacro(safeNutrition.protein)}g protein</span>
        <span>{formatMacro(safeNutrition.carbs)}g carbs</span>
        <span>{formatMacro(safeNutrition.sugar)}g sugar</span>
        <span>{formatMacro(safeNutrition.fats)}g fats</span>
      </div>

      {conversionWarning && <Alert variant="warning" className="mb-0">{conversionWarning}</Alert>}
    </div>
  );
}
