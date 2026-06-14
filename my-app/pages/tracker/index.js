import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row } from 'react-bootstrap';
import PageHeader from '../../components/PageHeader';
import RouteGuard from '../../components/RouteGuard';
import NutritionSummary from '../../components/NutritionSummary';
import PortionSelector from '../../components/PortionSelector';
import UnitSelect from '../../components/UnitSelect';
import FoodImage from '../../components/FoodImage';
import MealPickerModal from '../../components/MealPickerModal';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '../../components/StateMessage';
import { apiFetch } from '../../lib/api';
import { formatAmount, formatCalories, formatMacro, formatServingLabel, getIngredientServingNutrition } from '../../lib/formatNutrition';
import { calculateNutritionWithUnit } from '../../lib/unitConverter';
import { getFoodImage } from '../../lib/foodVisuals';
import { normalizeMealCategory } from '../../lib/mealCategoryHelpers';

function sameCategory(ingredient, category) {
  return !category || (ingredient.category || 'Other') === category;
}

function logTypeLabel(item) {
  return item.type === 'ingredient' ? 'Ingredient' : 'Meal';
}

function logAmountLabel(item) {
  if (item.type === 'ingredient') return `${formatAmount(item.amount || item.quantityUsed)} ${item.unit || ''}`;
  return item.portionLabel || `${item.servings || item.portion || 1} serving`;
}

export default function LogFood() {
  const router = useRouter();
  const { data: meals, error: mealError } = useSWR('/api/meals');
  const { data: ingredients, error: ingredientError } = useSWR('/api/ingredients');
  const { data: today, error: todayError, mutate } = useSWR('/api/tracker/today');
  const { data: weekLogs } = useSWR('/api/tracker/week');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm();
  const [activeTab, setActiveTab] = useState('meal');
  const [portionInfo, setPortionInfo] = useState({ portion: 1, portionLabel: '1 whole meal' });
  const [componentPortions, setComponentPortions] = useState({});
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [ingredientAmount, setIngredientAmount] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('grams');
  const [ingredientErrorMessage, setIngredientErrorMessage] = useState('');

  useEffect(() => {
    if (router.query.tab === 'ingredient') setActiveTab('ingredient');
  }, [router.query.tab]);

  const selectedMealId = watch('mealId');
  const selectedMeal = (meals || []).find(meal => meal._id === selectedMealId);
  const hasComponents = selectedMeal?.components?.length > 0;
  const ingredientPreview = selectedIngredient && ingredientAmount
    ? calculateNutritionWithUnit(Number(ingredientAmount), ingredientUnit, selectedIngredient)
    : getIngredientServingNutrition(selectedIngredient || {});

  function selectMeal(meal) {
    setValue('mealId', meal._id, { shouldValidate: true });
    setComponentPortions({});
  }

  function selectIngredient(ingredient) {
    setSelectedIngredient(ingredient);
    setIngredientAmount(ingredient.quantity || '');
    setIngredientUnit(ingredient.unit || 'grams');
    setIngredientErrorMessage('');
    setShowIngredientPicker(false);
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
    const body = { type: 'meal', mealId: data.mealId, ...portionInfo };

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

  async function logIngredient(event) {
    event.preventDefault();
    setIngredientErrorMessage('');

    if (!selectedIngredient) {
      setIngredientErrorMessage('Please choose an ingredient.');
      return;
    }

    const amount = Number(ingredientAmount);
    if (!amount || amount <= 0) {
      setIngredientErrorMessage('Amount must be greater than 0.');
      return;
    }

    await apiFetch('/api/tracker/log', {
      method: 'POST',
      body: JSON.stringify({
        type: 'ingredient',
        ingredientId: selectedIngredient._id,
        amount,
        unit: ingredientUnit
      })
    });

    setSelectedIngredient(null);
    setIngredientAmount('');
    setIngredientUnit('grams');
    mutate();
  }

  async function deleteLog(logId) {
    await apiFetch(`/api/tracker/log/${logId}`, { method: 'DELETE' });
    mutate();
  }

  function openLog(logItem) {
    if (logItem.type === 'ingredient') return;
    router.push(`/logs/${logItem._id}`);
  }

  return <RouteGuard>
    <PageHeader title="Log Food" text="Log saved meals or single ingredients." />
    {(mealError || ingredientError || todayError) && <ErrorMessage text="Failed to load food tracker data." />}
    {(!meals || !ingredients || !today) && !(mealError || ingredientError || todayError) && <LoadingMessage text="Loading food tracker..." />}

    {today && <NutritionSummary item={today} />}
    {meals && ingredients && today && <Row className="tracker-layout log-food-layout">
      <Col md={5}>
        <Card className="app-card section-card tracker-log-card log-food-card">
          <div className="log-food-tabs">
            <button type="button" className={activeTab === 'meal' ? 'active' : ''} onClick={() => setActiveTab('meal')}>Log Meal</button>
            <button type="button" className={activeTab === 'ingredient' ? 'active' : ''} onClick={() => setActiveTab('ingredient')}>Log Ingredient</button>
          </div>

          {activeTab === 'meal' && <Form onSubmit={handleSubmit(logMeal)}>
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
                    <Form.Control type="number" min="0.1" step="0.1" value={componentPortions[index]?.eatenAmount ?? component.totalWeight} onChange={e => updateComponentPortion(index, 'eatenAmount', e.target.value)} />
                  </Col>
                  <Col md={4}>
                    <UnitSelect value={componentPortions[index]?.unit || 'grams'} onChange={e => updateComponentPortion(index, 'unit', e.target.value)} />
                  </Col>
                </Row>
              ))}
            </div>}

            <Button type="submit" variant="success" disabled={isSubmitting || meals.length === 0 || !selectedMeal} className="tracker-submit-button">Log Meal</Button>
          </Form>}

          {activeTab === 'ingredient' && <Form onSubmit={logIngredient}>
            {ingredientErrorMessage && <Alert variant="warning">{ingredientErrorMessage}</Alert>}
            <Form.Group className="tracker-form-section">
              <Form.Label>Choose Ingredient</Form.Label>
              {!selectedIngredient && (
                <button type="button" className="tracker-select-meal-card" onClick={() => setShowIngredientPicker(true)}>
                  <span className="tracker-select-meal-icon">+</span>
                  <span>
                    <strong>Select an ingredient</strong>
                    <small>Log a snack or single food from your inventory.</small>
                  </span>
                </button>
              )}
              {selectedIngredient && <SelectedIngredientPreview ingredient={selectedIngredient} onChange={() => setShowIngredientPicker(true)} />}
            </Form.Group>

            {selectedIngredient && <>
              <Row className="component-portion-row">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Amount</Form.Label>
                    <Form.Control type="number" min="0.1" step="0.1" value={ingredientAmount} onChange={e => setIngredientAmount(e.target.value)} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Unit</Form.Label>
                    <UnitSelect value={ingredientUnit} onChange={e => setIngredientUnit(e.target.value)} />
                  </Form.Group>
                </Col>
              </Row>
              <div className="log-food-preview">
                <span>{formatCalories(ingredientPreview.calories)} cal</span>
                <span>{formatMacro(ingredientPreview.protein)}g protein</span>
                <span>{formatMacro(ingredientPreview.carbs)}g carbs</span>
                <span>{formatMacro(ingredientPreview.fats)}g fats</span>
                <span>{formatMacro(ingredientPreview.sugar)}g sugar</span>
              </div>
            </>}

            <Button type="submit" variant="success" disabled={!selectedIngredient} className="tracker-submit-button">Log Ingredient</Button>
          </Form>}

          <MealPickerModal show={showMealPicker} onHide={() => setShowMealPicker(false)} meals={meals} selectedMealId={selectedMealId} weekLogs={weekLogs} onSelect={selectMeal} />
          <IngredientPickerModal show={showIngredientPicker} onHide={() => setShowIngredientPicker(false)} ingredients={ingredients} onSelect={selectIngredient} />
        </Card>
      </Col>

      <Col md={7}>
        <Card className="app-card section-card tracker-today-card">
          <h4>Logged Food Today</h4>
          {(today.meals || []).length === 0 && <EmptyMessage text="No logs yet. Log a meal or ingredient to see it here." />}
          {(today.meals || []).length > 0 && (
            <div className="daily-log-list">
              {(today.meals || []).map(item => (
                <Card key={item._id} className={`compact-card picker-row ${item.type === 'ingredient' ? 'ingredient' : 'meal'}`}>
                  <div className="picker-row-main" onClick={() => openLog(item)} role={item.type === 'ingredient' ? undefined : 'button'}>
                    <div>
                      <Badge className="soft-pill soft-pill-beige">{logTypeLabel(item)}</Badge>
                      <h6>{item.name}</h6>
                      <small className="text-muted">{logAmountLabel(item)}</small>
                    </div>
                    <div className="mini-stat-row">
                      <span>{formatCalories(item.calories)} cal</span>
                      <span>{formatMacro(item.protein)}g protein</span>
                      <span>{formatMacro(item.carbs)}g carbs</span>
                      <span>{formatMacro(item.fats)}g fats</span>
                      <span>{formatMacro(item.sugar)}g sugar</span>
                    </div>
                  </div>
                  <Button variant="outline-danger" size="sm" onClick={() => deleteLog(item._id)}>Remove</Button>
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
    <Card className="compact-card picker-row">
      <FoodImage src={meal.imageUrl} alt={meal.name} category={mealCategory} className="thumb-sm" placeholderClassName="emoji-thumb thumb-sm" />
      <Card.Body className="picker-row-body">
        <div className="picker-row-header">
          <div>
            <h5>{meal.name}</h5>
            <Badge className="soft-pill soft-pill-beige">{mealCategory}</Badge>
          </div>
          <Button variant="outline-success" size="sm" onClick={onChange}>Change</Button>
        </div>
        <div className="mini-stat-row">
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

function SelectedIngredientPreview({ ingredient, onChange }) {
  const nutrition = getIngredientServingNutrition(ingredient);
  return (
    <Card className="compact-card picker-row">
      <FoodImage src={getFoodImage(ingredient)} alt={ingredient.name} category={ingredient.category || 'Other'} className="thumb-sm" placeholderClassName="emoji-thumb thumb-sm" />
      <Card.Body className="picker-row-body">
        <div className="picker-row-header">
          <div>
            <h5>{ingredient.name}</h5>
            <Badge className="soft-pill soft-pill-beige">{ingredient.category || 'Other'}</Badge>
          </div>
          <Button variant="outline-success" size="sm" onClick={onChange}>Change</Button>
        </div>
        <div className="mini-stat-row">
          <span>{formatCalories(nutrition.calories)} cal per {formatServingLabel(ingredient)}</span>
          <span>{formatMacro(nutrition.protein)}g protein</span>
        </div>
      </Card.Body>
    </Card>
  );
}

function IngredientPickerModal({ show, onHide, ingredients = [], onSelect }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const categories = useMemo(() => [...new Set(ingredients.map(item => item.category || 'Other'))], [ingredients]);
  const filtered = ingredients.filter(ingredient => {
    const cleanSearch = search.trim().toLowerCase();
    return (!cleanSearch || ingredient.name.toLowerCase().includes(cleanSearch)) && sameCategory(ingredient, category);
  });

  return (
    <Modal show={show} onHide={onHide} size="lg" centered dialogClassName="meal-picker-dialog">
      <Modal.Header closeButton>
        <Modal.Title>Choose Ingredient</Modal.Title>
      </Modal.Header>
      <Modal.Body className="meal-picker-body">
        <div className="meal-picker-controls">
          <Form.Control placeholder="Search ingredients..." value={search} onChange={e => setSearch(e.target.value)} />
          <Form.Select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map(item => <option key={item} value={item}>{item}</option>)}
          </Form.Select>
        </div>
        {filtered.length === 0 && <Card className="meal-picker-empty"><Card.Body><h5>No ingredients found.</h5><p className="text-muted">Add ingredients to your inventory first.</p></Card.Body></Card>}
        <div className="meal-picker-results">
          {filtered.map(ingredient => {
            const nutrition = getIngredientServingNutrition(ingredient);
            return (
              <Card className="meal-picker-card" key={ingredient._id}>
                <FoodImage src={getFoodImage(ingredient)} alt={ingredient.name} category={ingredient.category || 'Other'} className="meal-picker-thumb" placeholderClassName="emoji-thumb meal-picker-thumb" />
                <Card.Body className="meal-picker-card-body">
                  <div className="meal-picker-card-main">
                    <div className="meal-picker-card-title">
                      <h6>{ingredient.name}</h6>
                      <Badge className="soft-pill soft-pill-beige">{ingredient.category || 'Other'}</Badge>
                    </div>
                    <div className="mini-stat-row">
                      <span>{formatServingLabel(ingredient)}</span>
                      <span>{formatCalories(nutrition.calories)} cal</span>
                      <span>{formatMacro(nutrition.protein)}g protein</span>
                    </div>
                  </div>
                  <Button variant="success" size="sm" onClick={() => onSelect(ingredient)}>Select</Button>
                </Card.Body>
              </Card>
            );
          })}
        </div>
      </Modal.Body>
    </Modal>
  );
}
