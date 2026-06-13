import { useForm, Controller } from 'react-hook-form';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import UnitSelect from './UnitSelect';
import { CATEGORY_LIBRARY } from '../lib/foodVisuals';
import { getIngredientServingNutrition } from '../lib/formatNutrition';

function buildDefaultValues(defaultValues) {
  const servingNutrition = getIngredientServingNutrition(defaultValues);
  const valueOrServing = (field) => {
    const value = Number(defaultValues[field]);
    return value > 0 ? value : servingNutrition[field];
  };

  return {
    ...defaultValues,
    calories: valueOrServing('calories'),
    protein: valueOrServing('protein'),
    carbs: valueOrServing('carbs'),
    fats: valueOrServing('fats'),
    sugar: valueOrServing('sugar')
  };
}

export default function IngredientForm({ defaultValues = {}, onSubmit, buttonText = 'Save Ingredient' }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, control } = useForm({ defaultValues: buildDefaultValues(defaultValues) });

  const positiveRule = {
    required: 'This field is required.',
    min: { value: 0.1, message: 'Please enter a positive number.' }
  };

  const optionalPositiveRule = {
    min: { value: 0, message: 'Please enter 0 or a positive number.' }
  };

  return (
    <Card className="page-card p-4">
      <Form onSubmit={handleSubmit(onSubmit)}>
        {Object.keys(errors).length > 0 && <Alert variant="warning">Please fix the highlighted fields.</Alert>}

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control isInvalid={!!errors.name} {...register('name', { required: 'Ingredient name is required.' })} />
              <Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select isInvalid={!!errors.category} {...register('category', { required: 'Category is required.' })}>
                <option value="">Choose category</option>
                {CATEGORY_LIBRARY.map(category => (
                  <option key={category.name} value={category.name}>{category.icon} {category.name}</option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{errors.category?.message}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Inventory Quantity</Form.Label>
              <Form.Control type="number" step="0.1" isInvalid={!!errors.quantity} {...register('quantity', positiveRule)} />
              <Form.Control.Feedback type="invalid">{errors.quantity?.message}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Inventory Unit</Form.Label>
              <Controller
                name="unit"
                control={control}
                rules={{ required: 'Unit is required.' }}
                render={({ field }) => (
                  <UnitSelect {...field} isInvalid={!!errors.unit} />
                )}
              />
              <Form.Control.Feedback type="invalid" className="field-feedback-block">{errors.unit?.message}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-4">
          <Form.Label className="fw-bold">Nutritional Values</Form.Label>
          <Form.Text className="d-block text-muted mb-3">Enter the nutrition values for the quantity listed above. These values will be used to calculate nutrition when this ingredient is added to a meal.</Form.Text>
          <Row>
            {[
              { field: 'calories', label: 'Calories', step: '0.1' },
              { field: 'protein', label: 'Protein', step: '0.1' },
              { field: 'carbs', label: 'Carbs', step: '0.1' },
              { field: 'fats', label: 'Fats', step: '0.1' },
              { field: 'sugar', label: 'Sugar', step: '0.1' }
            ].map(({ field, label, step }) => (
              <Col md key={field}>
                <Form.Group className="mb-3">
                  <Form.Label>{label}</Form.Label>
                  <Form.Control type="number" step={step} isInvalid={!!errors[field]} {...register(field, optionalPositiveRule)} />
                  <Form.Control.Feedback type="invalid">{errors[field]?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            ))}
          </Row>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Image URL</Form.Label>
          <Form.Control {...register('imageUrl')} placeholder="https://example.com/food.jpg" />
        </Form.Group>

        <Button type="submit" variant="success" className="ingredient-form-submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : buttonText}</Button>
      </Form>
    </Card>
  );
}

