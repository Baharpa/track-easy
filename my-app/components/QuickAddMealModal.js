import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import FoodImage from './FoodImage';
import { apiFetch } from '../lib/api';
import { formatCalories, formatMacro } from '../lib/formatNutrition';
import { normalizeMealCategory } from '../lib/mealCategoryHelpers';

export default function QuickAddMealModal({ meal, show, onHide, onLogged }) {
  const { mutate } = useSWRConfig();
  const [servings, setServings] = useState('1');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const servingCount = Number(servings) || 0;
  const mealCategory = normalizeMealCategory(meal?.category);
  const preview = meal ? {
    calories: (Number(meal.totalCalories) || 0) * servingCount,
    protein: (Number(meal.totalProtein) || 0) * servingCount,
    carbs: (Number(meal.totalCarbs) || 0) * servingCount,
    fats: (Number(meal.totalFats) || 0) * servingCount,
    sugar: (Number(meal.totalSugar) || 0) * servingCount
  } : null;

  function closeModal() {
    setServings('1');
    setError('');
    setSaving(false);
    onHide();
  }

  async function submitQuickAdd(event) {
    event.preventDefault();
    if (saving || !meal?._id) return;
    const cleanServings = Number(servings);

    if (!cleanServings || cleanServings <= 0) {
      setError('Servings is required and must be greater than 0.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await apiFetch('/api/tracker/log', {
        method: 'POST',
        body: JSON.stringify({ mealId: meal._id, servings: cleanServings })
      });
      await mutate('/api/tracker/today');
      await mutate(key => typeof key === 'string' && key.startsWith('/api/tracker/week'));
      if (onLogged) onLogged('Meal added');
      closeModal();
    } catch (err) {
      setError(err.message || 'Could not add meal to tracker.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal show={show} onHide={closeModal} centered dialogClassName="quick-add-modal">
      <Modal.Header closeButton>
        <Modal.Title>Quick Add</Modal.Title>
      </Modal.Header>
      <Form onSubmit={submitQuickAdd}>
        <Modal.Body>
          {meal && <>
            <div className="quick-add-preview">
              <FoodImage src={meal.imageUrl} alt={meal.name} category={mealCategory} className="quick-add-img" placeholderClassName="quick-add-placeholder" />
              <div>
                <h5>{meal.name}</h5>
                <p className="text-muted">{mealCategory}</p>
                <div className="quick-add-metrics">
                  <span>{formatCalories(meal.totalCalories)} cal</span>
                  <span>{formatMacro(meal.totalProtein)}g protein</span>
                  <span>{formatMacro(meal.totalCarbs)}g carbs</span>
                  <span>{formatMacro(meal.totalFats)}g fats</span>
                  <span>{formatMacro(meal.totalSugar)}g sugar</span>
                </div>
              </div>
            </div>

            {error && <Alert variant="warning">{error}</Alert>}

            <Form.Group className="mb-3">
              <Form.Label>How much did you have?</Form.Label>
              <Form.Control
                type="number"
                min="0.1"
                step="0.1"
                value={servings}
                onChange={e => setServings(e.target.value)}
                isInvalid={!!error && (!servingCount || servingCount <= 0)}
                placeholder="Servings"
              />
              <Form.Control.Feedback type="invalid">Servings must be greater than 0.</Form.Control.Feedback>
            </Form.Group>

            <div className="quick-add-total-card">
              <strong>Preview total</strong>
              <div className="quick-add-metrics">
                <span>{formatCalories(preview.calories)} cal</span>
                <span>{formatMacro(preview.protein)}g protein</span>
                <span>{formatMacro(preview.carbs)}g carbs</span>
                <span>{formatMacro(preview.fats)}g fats</span>
                <span>{formatMacro(preview.sugar)}g sugar</span>
              </div>
            </div>
          </>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeModal}>Cancel</Button>
          <Button type="submit" variant="success" disabled={saving}>{saving ? 'Adding...' : 'Add to Tracker'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
