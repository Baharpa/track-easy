import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { Alert, Badge, Button, Card, Col, Form, Row } from 'react-bootstrap';
import PageHeader from '../../components/PageHeader';
import RouteGuard from '../../components/RouteGuard';
import NutritionSummary from '../../components/NutritionSummary';
import GoalProgress from '../../components/GoalProgress';
import PortionSelector from '../../components/PortionSelector';
import UnitSelect from '../../components/UnitSelect';
import FoodImage from '../../components/FoodImage';
import MealPickerModal from '../../components/MealPickerModal';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '../../components/StateMessage';
import { apiFetch } from '../../lib/api';
import { formatAmount, formatCalories, formatMacro } from '../../lib/formatNutrition';
import { normalizeMealCategory } from '../../lib/mealCategoryHelpers';

export default function DailyTracker() {
  const router = useRouter();
  const { data: meals, error: mealError } = useSWR('/api/meals');
  const { data: today, error: todayError, mutate } = useSWR('/api/tracker/today');
  const { data: weekLogs } = useSWR('/api/tracker/week');
  const { data: goals } = useSWR('/api/user/goals');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm();
  const [portionInfo, setPortionInfo] = useState({ portion: 1, portionLabel: '1 whole meal' });
  const [componentPortions, setComponentPortions] = useState({});
  const [showMealPicker, setShowMealPicker] = useState(false);

  const selectedMealId = watch('mealId');
  const selectedMeal = (meals || []).find(meal => meal._id === selectedMealId);
  const hasComponents = selectedMeal?.components?.length > 0;

  function selectMeal(meal) {
    setValue('mealId', meal._id, { shouldValidate: true });
    setComponentPortions({});
  }

  function updateComponentPortion(index, field, value) {
    setComponentPortions({
      ...componentPortions,
      [index]: {
        eatenAmount: field === 'eatenAmount' ? value : componentPortions[index]?.eatenAmount,
        unit: field === 'unit' ? value : componentPortions[index]?.unit || 'grams'
      }
    });
  }

  async function logMeal(data) {
    const body = { mealId: data.mealId, ...portionInfo };

    if (hasComponents) {
      body.componentPortions = selectedMeal.components.map((component, index) => ({
        componentIndex: index,
        eatenAmount: Number(componentPortions[index]?.eatenAmount || component.totalWeight),
        unit: componentPortions[index]?.unit || 'grams'
      }));
    }

    await apiFetch('/api/tracker/log', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    reset({ mealId: '' });
    setPortionInfo({ portion: 1, portionLabel: '1 whole meal' });
    setComponentPortions({});
    mutate();
  }

  function handleClickMeal(logMealId) {
    router.push(`/logs/${logMealId}`);
  }

  return <RouteGuard>
    <PageHeader title="Daily Tracker" text="Log meals and view today's totals." />
    {(mealError || todayError) && <ErrorMessage text="Failed to load tracker data." />}
    {(!meals || !today) && !(mealError || todayError) && <LoadingMessage text="Loading tracker..." />}

    {today && <NutritionSummary item={today} />}
    {meals && today && <Row className="tracker-layout">
      <Col md={5}>
        <Card className="page-card tracker-log-card">
          <h4>Log a Meal</h4>
          {Object.keys(errors).length > 0 && <Alert variant="warning">Please fix the errors below.</Alert>}
          <Form onSubmit={handleSubmit(logMeal)}>
            <input type="hidden" {...register('mealId', { required: 'Please choose a meal.' })} />
            <Form.Group className="tracker-form-section">
              <Form.Label>Choose Meal</Form.Label>
              {meals.length === 0 && (
                <Card className="tracker-empty-picker-card">
                  <Card.Body>
                    <h5>No saved meals yet.</h5>
                    <p className="text-muted">Create a meal first, then come back to log it.</p>
                    <Button as={Link} href="/create-meal-component" variant="success">Create Meal</Button>
                  </Card.Body>
                </Card>
              )}

              {meals.length > 0 && !selectedMeal && (
                <button type="button" className="tracker-select-meal-card" onClick={() => setShowMealPicker(true)}>
                  <span className="tracker-select-meal-icon">+</span>
                  <span>
                    <strong>Select a meal</strong>
                    <small>Open your meal library to search and filter saved meals.</small>
                  </span>
                </button>
              )}

              {selectedMeal && <SelectedMealPreview meal={selectedMeal} onChange={() => setShowMealPicker(true)} />}
              {errors.mealId && <div className="text-danger small field-error">{errors.mealId.message}</div>}
            </Form.Group>

            {!selectedMeal && meals.length > 0 && <div className="tracker-picker-hint">Choose a meal to start logging.</div>}
            {selectedMeal && !hasComponents && <PortionSelector value={portionInfo.portion} onChange={setPortionInfo} />}

            {selectedMeal && hasComponents && <div className="component-portion-section">
              <Form.Label>Component Amounts Eaten</Form.Label>
              {selectedMeal.components.map((component, index) => (
                <Row key={`${component.name}-${index}`} className="component-portion-row">
                  <Col md={5}>
                    <div className="component-portion-name">{component.name}</div>
                    <small className="text-muted">Original: {formatAmount(component.totalWeight)}g</small>
                  </Col>
                  <Col md={3}>
                    <Form.Control
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={componentPortions[index]?.eatenAmount ?? component.totalWeight}
                      onChange={e => updateComponentPortion(index, 'eatenAmount', e.target.value)}
                    />
                  </Col>
                  <Col md={4}>
                    <UnitSelect value={componentPortions[index]?.unit || 'grams'} onChange={e => updateComponentPortion(index, 'unit', e.target.value)} />
                  </Col>
                </Row>
              ))}
            </div>}

            <Button type="submit" variant="success" disabled={isSubmitting || meals.length === 0 || !selectedMeal} className="tracker-submit-button">
              Log Meal
            </Button>
          </Form>

          <MealPickerModal
            show={showMealPicker}
            onHide={() => setShowMealPicker(false)}
            meals={meals}
            selectedMealId={selectedMealId}
            weekLogs={weekLogs}
            onSelect={selectMeal}
          />
        </Card>

        {goals && <Card className="page-card tracker-goals-card goal-card">
          <h4>Goals</h4>
          <GoalProgress label="Calories" current={today.totalCalories} goal={goals.calorieGoal} />
          <GoalProgress label="Protein" current={today.totalProtein} goal={goals.proteinGoal} />
          <GoalProgress label="Carbs" current={today.totalCarbs} goal={goals.carbsGoal} />
          <GoalProgress label="Fats" current={today.totalFats} goal={goals.fatsGoal} />
          <GoalProgress label="Sugar" current={today.totalSugar} goal={goals.sugarGoal} />
        </Card>}
      </Col>

      <Col md={7}>
        <Card className="page-card tracker-today-card">
          <h4>Meals Eaten Today</h4>
          {today.meals.length === 0 && <EmptyMessage text="No logs yet. Log a meal to see it here." />}
          {today.meals.length > 0 && (
            <div className="daily-log-list">
              {today.meals.map((meal, index) => (
                <Card
                  key={index}
                  className="daily-log-card"
                  onClick={() => handleClickMeal(meal._id)}
                >
                  <Row className="daily-log-row">
                    <Col md={3}>
                      <h6>{meal.name}</h6>
                      <small className="text-muted">{meal.portionLabel || `${meal.servings}x`}</small>
                    </Col>
                    <Col md={9}>
                      <Row className="daily-log-stats">
                        <Col xs={4} sm={2}>
                          <div><strong>{formatCalories(meal.calories)}</strong></div>
                          <small className="text-muted">cal</small>
                        </Col>
                        <Col xs={4} sm={2}>
                          <div><strong>{formatMacro(meal.protein)}</strong></div>
                          <small className="text-muted">protein</small>
                        </Col>
                        <Col xs={4} sm={2}>
                          <div><strong>{formatMacro(meal.carbs)}</strong></div>
                          <small className="text-muted">carbs</small>
                        </Col>
                        <Col xs={4} sm={2}>
                          <div><strong>{formatMacro(meal.fats)}</strong></div>
                          <small className="text-muted">fats</small>
                        </Col>
                        <Col xs={4} sm={2}>
                          <div><strong>{formatMacro(meal.sugar)}</strong></div>
                          <small className="text-muted">sugar</small>
                        </Col>
                        <Col xs={12} className="daily-log-hint">
                          <small className="text-muted">Click to view, edit, or delete</small>
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </Col>
    </Row>}
  </RouteGuard>;
}

function SelectedMealPreview({ meal, onChange }) {
  const mealCategory = normalizeMealCategory(meal.category);

  return (
    <Card className="tracker-selected-meal-card">
      <FoodImage
        src={meal.imageUrl}
        alt={meal.name}
        category={mealCategory}
        className="tracker-selected-meal-thumb"
        placeholderClassName="meal-placeholder-thumb"
      />
      <Card.Body className="tracker-selected-meal-body">
        <div className="tracker-selected-meal-header">
          <div>
            <h5>{meal.name}</h5>
            <Badge className="soft-pill soft-pill-beige">{mealCategory}</Badge>
          </div>
          <Button variant="outline-success" size="sm" onClick={onChange}>Change</Button>
        </div>
        <div className="meal-stat-row">
          <span>cal {formatCalories(meal.totalCalories)}</span>
          <span>protein {formatMacro(meal.totalProtein)}g</span>
          <span>carbs {formatMacro(meal.totalCarbs)}g</span>
          <span>fats {formatMacro(meal.totalFats)}g</span>
          <span>sugar {formatMacro(meal.totalSugar)}g</span>
        </div>
      </Card.Body>
    </Card>
  );
}
