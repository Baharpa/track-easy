import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import UnitSelect from './UnitSelect';
import { formatIngredientServingNutrition } from '../lib/formatNutrition';
import { MEAL_CATEGORIES, normalizeMealCategory } from '../lib/mealCategoryHelpers';

export default function MealForm({ ingredients = [], defaultValues = {}, onSubmit, buttonText = 'Save Meal', showSummaryButton = false, onSummary }) {
  const cleanDefaultValues = {
    ...defaultValues,
    category: defaultValues.category ? normalizeMealCategory(defaultValues.category) : ''
  };
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: cleanDefaultValues });
  const [selected, setSelected] = useState(defaultValues.ingredients?.map(item => ({
    ingredientId: item.ingredientId || item._id,
    quantityUsed: item.quantityUsed,
    unit: item.unit || 'grams'
  })) || []);

  function toggleIngredient(id) {
    if (selected.find(item => item.ingredientId === id)) {
      setSelected(selected.filter(item => item.ingredientId !== id));
    } else {
      setSelected([...selected, { ingredientId: id, quantityUsed: '', unit: 'grams' }]);
    }
  }

  function updateAmount(id, amount) {
    setSelected(selected.map(item => item.ingredientId === id ? { ...item, quantityUsed: Number(amount) } : item));
  }

  function updateUnit(id, unit) {
    setSelected(selected.map(item => item.ingredientId === id ? { ...item, unit } : item));
  }

  function validateSelected() {
    return selected.length > 0 && selected.every(item => Number(item.quantityUsed) > 0 && item.unit);
  }

  function submit(data) {
    if (!validateSelected()) return;
    onSubmit({ ...data, category: data.category ? normalizeMealCategory(data.category) : 'Other', ingredients: selected });
  }

  function submitSummary(data) {
    if (!validateSelected()) return;
    onSummary({ ...data, category: data.category ? normalizeMealCategory(data.category) : 'Other', ingredients: selected });
  }

  return (
    <Card className="page-card p-4">
      <Form onSubmit={handleSubmit(submit)}>
        {(Object.keys(errors).length > 0 || !validateSelected()) && <Alert variant="warning">Meal name is required and selected ingredient amounts must be positive numbers with units.</Alert>}
        <Row>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Meal Name</Form.Label>
              <Form.Control isInvalid={!!errors.name} {...register('name', { required: 'Meal name is required.' })} />
              <Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select {...register('category')}>
                <option value="">Choose meal category</option>
                {MEAL_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Image URL</Form.Label>
              <Form.Control {...register('imageUrl')} />
            </Form.Group>
          </Col>
        </Row>

        <h5>Ingredients</h5>
        {ingredients.length === 0 && <p className="text-muted">No ingredients yet. Add ingredients before creating a meal.</p>}
        {ingredients.map(ingredient => {
          const checked = selected.find(item => item.ingredientId === ingredient._id);
          return <Row className="align-items-end border-bottom py-2" key={ingredient._id}>
            <Col md={4}>
              <Form.Check label={`${ingredient.name}`} checked={!!checked} onChange={() => toggleIngredient(ingredient._id)} />
            </Col>
            {checked && <>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label className="compact-form-label">Amount</Form.Label>
                  <Form.Control type="number" min="0.1" step="0.1" placeholder="Amount" value={checked.quantityUsed} onChange={e => updateAmount(ingredient._id, e.target.value)} isInvalid={checked.quantityUsed !== '' && Number(checked.quantityUsed) <= 0} />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label className="compact-form-label">Unit</Form.Label>
                  <UnitSelect value={checked.unit} onChange={e => updateUnit(ingredient._id, e.target.value)} />
                </Form.Group>
              </Col>
            </>}
            <Col md={checked ? 2 : 4} className="text-muted compact-form-note">
              {formatIngredientServingNutrition(ingredient)}
            </Col>
          </Row>;
        })}

        <Button type="submit" variant="success" className="mt-3 me-2" disabled={isSubmitting || ingredients.length === 0 || !validateSelected()}>{buttonText}</Button>
        {showSummaryButton && <Button variant="outline-success" className="mt-3" disabled={ingredients.length === 0 || !validateSelected()} onClick={handleSubmit(submitSummary)}>Preview Summary</Button>}
      </Form>
    </Card>
  );
}
