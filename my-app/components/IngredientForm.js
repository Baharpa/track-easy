import { useForm, Controller } from 'react-hook-form';
import { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import MealImageUpload from './MealImageUpload';
import NutritionLabelScanner from './NutritionLabelScanner';
import SmartFoodSuggestionCard from './SmartFoodSuggestionCard';
import UnitSelect from './UnitSelect';
import { CATEGORY_LIBRARY } from '../lib/foodVisuals';
import { normalizeCategory } from '../lib/categoryHelpers';
import { getIngredientServingNutrition } from '../lib/formatNutrition';
import { getSmartFoodMatch, normalizeFoodQuery } from '../lib/smartFoodBuilder';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import UnsavedChangesModal from './UnsavedChangesModal';

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function buildDefaultValues(defaultValues) {
  const servingNutrition = getIngredientServingNutrition(defaultValues);
  const valueOrServing = (field) => {
    return hasValue(defaultValues[field]) ? defaultValues[field] : servingNutrition[field];
  };

  return {
    ...defaultValues,
    category: hasValue(defaultValues.category) ? normalizeCategory(defaultValues.category) : '',
    calories: valueOrServing('calories'),
    protein: valueOrServing('protein'),
    carbs: valueOrServing('carbs'),
    fats: valueOrServing('fats'),
    sugar: valueOrServing('sugar')
  };
}

export default function IngredientForm({ defaultValues = {}, onSubmit, onSuccess, buttonText = 'Save Ingredient' }) {
  const [imageUploading, setImageUploading] = useState(false);
  const [dismissedSmartQuery, setDismissedSmartQuery] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty }, control, setValue, watch } = useForm({ defaultValues: buildDefaultValues(defaultValues) });
  const { showModal, keepEditing, discardChanges, markSaved } = useUnsavedChanges(isDirty && !isSubmitting);
  const imageUrl = watch('imageUrl');
  const nameValue = watch('name') || '';
  const normalizedName = normalizeFoodQuery(nameValue);
  const smartFoodMatch = useMemo(() => getSmartFoodMatch(nameValue), [nameValue]);
  const smartSuggestion = smartFoodMatch.suggestion && normalizedName !== dismissedSmartQuery
    ? smartFoodMatch.suggestion
    : null;
  const smartMealHref = smartSuggestion ? {
    pathname: '/create-meal-component',
    query: { smartMeal: smartSuggestion.id, name: nameValue }
  } : null;

  const positiveRule = {
    required: 'This field is required.',
    min: { value: 0.1, message: 'Please enter a positive number.' }
  };

  const optionalPositiveRule = {
    min: { value: 0, message: 'Please enter 0 or a positive number.' }
  };

  function applyDetectedNutrition(values) {
    const fieldMap = {
      calories: 'calories',
      protein: 'protein',
      fat: 'fats',
      carbohydrates: 'carbs',
      sugar: 'sugar'
    };

    Object.entries(fieldMap).forEach(([sourceField, targetField]) => {
      const value = values?.[sourceField];
      if (!hasValue(value)) return;
      setValue(targetField, value, { shouldDirty: true, shouldValidate: true });
    });
  }

  return (
    <>
      <Card className="page-card p-4">
        <Form onSubmit={handleSubmit(async data => {
          await onSubmit(data);
          markSaved();
          if (onSuccess) await onSuccess(data);
        })}>
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

        <SmartFoodSuggestionCard
          suggestion={smartSuggestion}
          primaryHref={smartMealHref}
          onDismiss={() => setDismissedSmartQuery(normalizedName)}
        />

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
          <div className="nutrition-scan-intro">
            <Form.Text className="d-block text-muted">Enter the nutrition values for the quantity listed above. These values will be used to calculate nutrition when this ingredient is added to a meal.</Form.Text>
            <NutritionLabelScanner onDetected={applyDetectedNutrition} />
          </div>

          <Row className="g-3 mt-1">
            {[
              { field: 'calories', label: 'Calories', step: '0.1' },
              { field: 'protein', label: 'Protein', step: '0.1' },
              { field: 'carbs', label: 'Carbs', step: '0.1' },
              { field: 'fats', label: 'Fats', step: '0.1' },
              { field: 'sugar', label: 'Sugar', step: '0.1' }
            ].map(({ field, label, step }) => (
              <Col xs={6} md key={field}>
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
          <MealImageUpload imageUrl={imageUrl} onUploaded={uploadedUrl => setValue('imageUrl', uploadedUrl, { shouldDirty: true })} onUploadingChange={setImageUploading} />
        </Form.Group>

          <Button type="submit" variant="success" className="ingredient-form-submit" disabled={isSubmitting || imageUploading}>{imageUploading ? 'Uploading photo...' : isSubmitting ? 'Saving...' : buttonText}</Button>
        </Form>
      </Card>

      <UnsavedChangesModal
        show={showModal}
        onKeepEditing={keepEditing}
        onDiscardChanges={discardChanges}
      />
    </>
  );
}
