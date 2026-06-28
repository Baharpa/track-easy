import { Card, Col, Form, Row } from 'react-bootstrap';
import { TrackEasyIcon } from './TrackEasyIcons';

const nutritionFields = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein (g)', unit: 'g' },
  { key: 'carbs', label: 'Carbs (g)', unit: 'g' },
  { key: 'fats', label: 'Fats (g)', unit: 'g' },
  { key: 'sugar', label: 'Sugar (g)', unit: 'g' }
];

export function buildOutsideFoodPayload(values = {}) {
  return {
    restaurantName: values.restaurantName || '',
    totalCalories: Number(values.calories) || 0,
    totalProtein: Number(values.protein) || 0,
    totalCarbs: Number(values.carbs) || 0,
    totalFats: Number(values.fats) || 0,
    totalSugar: Number(values.sugar) || 0
  };
}

export function OutsideFoodToggle({ checked, onChange }) {
  return (
    <div className="outside-food-toggle-card">
      <span className="outside-food-toggle-icon" aria-hidden="true">
        <TrackEasyIcon name="bowl" size={24} />
      </span>
      <div className="outside-food-toggle-copy">
        <strong>Outside Food</strong>
        <span>Skip ingredient groups and enter nutrition manually.</span>
      </div>
      <Form.Check
        type="switch"
        id="outside-food-toggle"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        aria-label="Outside Food"
        className="outside-food-switch"
      />
    </div>
  );
}

export function ManualNutritionCard({ values, onChange }) {
  function updateValue(key, value) {
    onChange({ ...values, [key]: value });
  }

  return (
    <Card className="page-card manual-nutrition-card">
      <Card.Body>
        <div className="manual-nutrition-header">
          <h4>Enter Nutrition Manually</h4>
          <p className="text-muted">Use the restaurant or package nutrition for this meal.</p>
        </div>

        <Form.Group className="mb-3">
          <Form.Label>Restaurant Name</Form.Label>
          <Form.Control
            value={values.restaurantName || ''}
            onChange={event => updateValue('restaurantName', event.target.value)}
            placeholder="Enter restaurant name"
          />
        </Form.Group>

        <Row className="manual-nutrition-grid">
          {nutritionFields.map(field => (
            <Col sm={6} lg={4} key={field.key}>
              <Form.Group className="manual-nutrition-field">
                <Form.Label>{field.label}</Form.Label>
                <div className="manual-nutrition-input-wrap">
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.1"
                    value={values[field.key] || ''}
                    onChange={event => updateValue(field.key, event.target.value)}
                    placeholder="0"
                  />
                  <span>{field.unit}</span>
                </div>
              </Form.Group>
            </Col>
          ))}
        </Row>
      </Card.Body>
    </Card>
  );
}
