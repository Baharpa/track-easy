import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import FoodImage from './FoodImage';
import { apiFetch } from '../lib/api';
import { formatCalories, formatMacro, formatServingLabel, getIngredientServingNutrition } from '../lib/formatNutrition';
import { calculateNutritionWithUnit } from '../lib/unitConverter';
import { getFoodImage } from '../lib/foodVisuals';
import { normalizeMealCategory } from '../lib/mealCategoryHelpers';
import { TrackEasyIcon } from './TrackEasyIcons';

function OptionEmpty({ icon, title, text, href, onClick }) {
  const body = (
    <Card className="dashboard-empty-inline">
      <div className="dashboard-empty-inline-icon">
        <TrackEasyIcon name={icon} size={18} />
      </div>
      <div className="dashboard-empty-inline-copy">
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      <TrackEasyIcon name="chevron-right" size={16} className="dashboard-empty-inline-arrow" />
    </Card>
  );

  if (href) return <Link href={href} className="dashboard-empty-link">{body}</Link>;
  if (onClick) return <button type="button" className="dashboard-empty-link dashboard-empty-button" onClick={onClick}>{body}</button>;
  return body;
}

export default function DashboardQuickLog({ onLogged }) {
  const { data: meals, error: mealsError } = useSWR('/api/meals');
  const { data: ingredients, error: ingredientsError } = useSWR('/api/ingredients');
  const [mode, setMode] = useState('meal');
  const [selectedMealId, setSelectedMealId] = useState('');
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [mealServings, setMealServings] = useState('1');
  const [ingredientAmount, setIngredientAmount] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('grams');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const selectedMeal = useMemo(
    () => (meals || []).find(meal => meal._id === selectedMealId) || null,
    [meals, selectedMealId]
  );
  const selectedIngredient = useMemo(
    () => (ingredients || []).find(item => item._id === selectedIngredientId) || null,
    [ingredients, selectedIngredientId]
  );
  const ingredientPreview = useMemo(() => {
    if (!selectedIngredient) return null;
    const amount = Number(ingredientAmount);
    if (!amount || amount <= 0) return getIngredientServingNutrition(selectedIngredient);
    return calculateNutritionWithUnit(amount, ingredientUnit, selectedIngredient);
  }, [ingredientAmount, ingredientUnit, selectedIngredient]);

  useEffect(() => {
    if (!selectedMeal) return;
    setMealServings('1');
  }, [selectedMealId]);

  useEffect(() => {
    if (!selectedIngredient) return;
    setIngredientAmount(String(selectedIngredient.quantity || ''));
    setIngredientUnit(selectedIngredient.unit || 'grams');
  }, [selectedIngredientId]);

  async function logMeal(event) {
    event.preventDefault();
    if (!selectedMeal) return;

    const servings = Number(mealServings);
    if (!servings || servings <= 0) {
      setFeedback('Servings must be greater than 0.');
      return;
    }

    setSaving(true);
    setFeedback('');
    try {
      await apiFetch('/api/tracker/log', {
        method: 'POST',
        body: JSON.stringify({
          mealId: selectedMeal._id,
          servings
        })
      });
      setFeedback('Meal logged.');
      await onLogged?.();
      setSelectedMealId('');
      setMealServings('1');
    } catch (error) {
      setFeedback(error.message || 'Could not log meal.');
    } finally {
      setSaving(false);
    }
  }

  async function logIngredient(event) {
    event.preventDefault();
    if (!selectedIngredient) return;

    const amount = Number(ingredientAmount);
    if (!amount || amount <= 0) {
      setFeedback('Amount must be greater than 0.');
      return;
    }

    setSaving(true);
    setFeedback('');
    try {
      await apiFetch('/api/tracker/log', {
        method: 'POST',
        body: JSON.stringify({
          type: 'ingredient',
          ingredientId: selectedIngredient._id,
          amount,
          unit: ingredientUnit
        })
      });
      setFeedback('Ingredient logged.');
      await onLogged?.();
      setSelectedIngredientId('');
      setIngredientAmount('');
      setIngredientUnit('grams');
    } catch (error) {
      setFeedback(error.message || 'Could not log ingredient.');
    } finally {
      setSaving(false);
    }
  }

  const mealPreview = selectedMeal ? {
    calories: (Number(selectedMeal.totalCalories) || 0) * (Number(mealServings) || 0),
    protein: (Number(selectedMeal.totalProtein) || 0) * (Number(mealServings) || 0),
    carbs: (Number(selectedMeal.totalCarbs) || 0) * (Number(mealServings) || 0),
    fats: (Number(selectedMeal.totalFats) || 0) * (Number(mealServings) || 0),
    sugar: (Number(selectedMeal.totalSugar) || 0) * (Number(mealServings) || 0)
  } : null;

  const mealOptions = meals || [];
  const ingredientOptions = ingredients || [];
  const mealCategory = selectedMeal ? normalizeMealCategory(selectedMeal.category) : 'Meal';
  const ingredientCategory = selectedIngredient?.category || 'Other';

  return (
    <Card className="app-card dashboard-quick-log-card">
      <div className="dashboard-section-header">
        <div>
          <span className="dashboard-section-kicker">
            <TrackEasyIcon name="bolt" size={14} />
            Quick log
          </span>
          <h3>Log in seconds</h3>
        </div>
        <Link href="/tracker" className="dashboard-section-link">
          Open tracker
          <TrackEasyIcon name="chevron-right" size={14} />
        </Link>
      </div>

      <div className="quick-log-tabs" role="tablist" aria-label="Quick log mode">
        <button type="button" className={mode === 'meal' ? 'active' : ''} onClick={() => setMode('meal')}>
          Log Meal
        </button>
        <button type="button" className={mode === 'ingredient' ? 'active' : ''} onClick={() => setMode('ingredient')}>
          Log Ingredient
        </button>
      </div>

      {(mealsError || ingredientsError) && <Alert variant="warning" className="dashboard-inline-alert">Some log data could not be loaded.</Alert>}
      {feedback && <div className="dashboard-quick-log-feedback">{feedback}</div>}

      {mode === 'meal' && (
        <Form onSubmit={logMeal} className="dashboard-quick-log-form">
          <Form.Group className="mb-2">
            <Form.Label className="dashboard-mini-label">Choose meal</Form.Label>
            {mealOptions.length === 0 ? (
              <OptionEmpty
                icon="bowl"
                title="No saved meals yet"
                text="Create a meal first, then log it here."
                href="/create-meal-component"
              />
            ) : (
              <Form.Select
                value={selectedMealId}
                onChange={e => setSelectedMealId(e.target.value)}
                className="dashboard-select"
              >
                <option value="">Choose a meal or ingredient.</option>
                {mealOptions.map(meal => (
                  <option key={meal._id} value={meal._id}>
                    {meal.name}
                  </option>
                ))}
              </Form.Select>
            )}
          </Form.Group>

          {selectedMeal ? (
            <>
              <div className="dashboard-log-preview">
                <FoodImage
                  src={selectedMeal.imageUrl}
                  alt={selectedMeal.name}
                  category={mealCategory}
                  className="dashboard-log-thumb"
                  placeholderClassName="dashboard-log-thumb-placeholder"
                />
                <div className="dashboard-log-copy">
                  <div className="dashboard-log-title-row">
                    <h4>{selectedMeal.name}</h4>
                    <span className="dashboard-chip dashboard-chip-green">{mealCategory}</span>
                  </div>
                  <div className="dashboard-log-meta">
                    <span>{formatCalories(mealPreview.calories)} cal</span>
                    <span>{formatMacro(mealPreview.protein)}g protein</span>
                    <span>{mealServings} serving{Number(mealServings) === 1 ? '' : 's'}</span>
                  </div>
                </div>
              </div>

              <div className="dashboard-amount-grid">
                <Form.Group>
                  <Form.Label className="dashboard-mini-label">Servings</Form.Label>
                  <Form.Control
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={mealServings}
                    onChange={e => setMealServings(e.target.value)}
                    className="dashboard-select"
                  />
                </Form.Group>
              </div>

              <Button type="submit" variant="success" className="dashboard-log-button" disabled={saving || !selectedMeal}>
                <TrackEasyIcon name="plus" size={16} />
                Log Food
              </Button>
            </>
          ) : (
            <div className="dashboard-quick-log-empty">
              <TrackEasyIcon name="sparkle" size={18} />
              <span>Choose a meal or ingredient.</span>
            </div>
          )}
        </Form>
      )}

      {mode === 'ingredient' && (
        <Form onSubmit={logIngredient} className="dashboard-quick-log-form">
          <Form.Group className="mb-2">
            <Form.Label className="dashboard-mini-label">Choose ingredient</Form.Label>
            {ingredientOptions.length === 0 ? (
              <OptionEmpty
                icon="leaf"
                title="No ingredients yet"
                text="Add ingredients to your inventory first."
                href="/ingredients/add"
              />
            ) : (
              <Form.Select
                value={selectedIngredientId}
                onChange={e => setSelectedIngredientId(e.target.value)}
                className="dashboard-select"
              >
                <option value="">Choose a meal or ingredient.</option>
                {ingredientOptions.map(item => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </Form.Select>
            )}
          </Form.Group>

          {selectedIngredient ? (
            <>
              <div className="dashboard-log-preview">
                <FoodImage
                  src={getFoodImage(selectedIngredient)}
                  alt={selectedIngredient.name}
                  category={ingredientCategory}
                  className="dashboard-log-thumb"
                  placeholderClassName="dashboard-log-thumb-placeholder"
                />
                <div className="dashboard-log-copy">
                  <div className="dashboard-log-title-row">
                    <h4>{selectedIngredient.name}</h4>
                    <span className="dashboard-chip dashboard-chip-pink">{ingredientCategory}</span>
                  </div>
                  <div className="dashboard-log-meta">
                    <span>{formatCalories(ingredientPreview?.calories || 0)} cal</span>
                    <span>{formatMacro(ingredientPreview?.protein || 0)}g protein</span>
                    <span>{formatServingLabel(selectedIngredient)}</span>
                  </div>
                </div>
              </div>

              <div className="dashboard-amount-grid dashboard-amount-grid-ingredient">
                <Form.Group>
                  <Form.Label className="dashboard-mini-label">Amount</Form.Label>
                  <Form.Control
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={ingredientAmount}
                    onChange={e => setIngredientAmount(e.target.value)}
                    className="dashboard-select"
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label className="dashboard-mini-label">Unit</Form.Label>
                  <Form.Select
                    value={ingredientUnit}
                    onChange={e => setIngredientUnit(e.target.value)}
                    className="dashboard-select"
                  >
                    <option value="grams">grams</option>
                    <option value="kilograms">kilograms</option>
                    <option value="milliliters">milliliters</option>
                    <option value="liters">liters</option>
                    <option value="teaspoons">teaspoons</option>
                    <option value="tablespoons">tablespoons</option>
                    <option value="cups">cups</option>
                    <option value="pieces">pieces</option>
                  </Form.Select>
                </Form.Group>
              </div>

              <Button type="submit" variant="success" className="dashboard-log-button" disabled={saving || !selectedIngredient}>
                <TrackEasyIcon name="plus" size={16} />
                Log Food
              </Button>
            </>
          ) : (
            <div className="dashboard-quick-log-empty">
              <TrackEasyIcon name="sparkle" size={18} />
              <span>Choose a meal or ingredient.</span>
            </div>
          )}
        </Form>
      )}
    </Card>
  );
}
