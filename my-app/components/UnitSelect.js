import { Form } from 'react-bootstrap';

/**
 * Reusable unit dropdown component
 * Shows all valid units: grams, kilograms, milliliters, liters, teaspoons, tablespoons, cups, pieces
 */
export default function UnitSelect({ value, onChange, isInvalid, required = true, disabled = false, className = '', extraUnits = [] }) {
  const baseUnits = [
    { value: 'grams', label: 'Grams (g)' },
    { value: 'kilograms', label: 'Kilograms (kg)' },
    { value: 'milliliters', label: 'Milliliters (ml)' },
    { value: 'liters', label: 'Liters (L)' },
    { value: 'teaspoons', label: 'Teaspoons (tsp)' },
    { value: 'tablespoons', label: 'Tablespoons (tbsp)' },
    { value: 'cups', label: 'Cups' },
    { value: 'pieces', label: 'Pieces' }
  ];
  const extra = extraUnits
    .map(unit => typeof unit === 'string' ? { value: unit, label: unit } : unit)
    .filter(unit => unit?.value && !baseUnits.some(base => base.value === unit.value));

  return (
    <Form.Select
      value={value || ''}
      onChange={onChange}
      isInvalid={isInvalid}
      disabled={disabled}
      className={className}
      required={required}
    >
      <option value="">Choose unit</option>
      {[...baseUnits, ...extra].map(unit => (
        <option key={unit.value} value={unit.value}>
          {unit.label}
        </option>
      ))}
    </Form.Select>
  );
}
