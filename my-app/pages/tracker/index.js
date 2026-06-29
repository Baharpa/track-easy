import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR, { useSWRConfig } from 'swr';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row } from 'react-bootstrap';
import RouteGuard from '../../components/RouteGuard';
import PortionSelector from '../../components/PortionSelector';
import ServingAmountSelector from '../../components/ServingAmountSelector';
import AppSearchBar from '../../components/AppSearchBar';
import UnitSelect from '../../components/UnitSelect';
import FoodImage from '../../components/FoodImage';
import MealPickerModal from '../../components/MealPickerModal';
import UnsavedChangesModal from '../../components/UnsavedChangesModal';
import { ErrorMessage, LoadingMessage } from '../../components/StateMessage';
import { apiFetch } from '../../lib/api';
import { formatAmount, formatCalories, formatMacro, formatServingLabel, getIngredientServingNutrition } from '../../lib/formatNutrition';
import { calculateNutritionWithUnit, getConversionWarning, getIngredientServingOptions, getIngredientServingUnits, normalizeUnit } from '../../lib/unitConverter';
import { getFoodImage } from '../../lib/foodVisuals';
import { normalizeMealCategory } from '../../lib/mealCategoryHelpers';
import { APP_CATEGORIES, normalizeCategory } from '../../lib/categoryHelpers';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';

function sameCategory(ingredient, category) {
  return !category || normalizeCategory(ingredient.category) === category;
}

export default function LogFood() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data: meals, error: mealError } = useSWR('/api/meals');
  const { data: ingredients, error: ingredientError } = useSWR('/api/ingredients');
  const { data: weekLogs } = useSWR('/api/tracker/week');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm();
  const [activeTab, setActiveTab] = useState('meal');
  const [portionInfo, setPortionInfo] = useState({ portion: 1, portionLabel: '1 whole meal' });
  const [customMealGrams, setCustomMealGrams] = useState('');
  const [componentPortions, setComponentPortions] = useState({});
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [ingredientAmount, setIngredientAmount] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('grams');
  const [ingredientErrorMessage, setIngredientErrorMessage] = useState('');
  const [logSuccess, setLogSuccess] = useState('');
  const selectedMealId = watch('mealId');
  const selectedMeal = (meals || []).find(meal => meal._id === selectedMealId);
  const selectedMealParts = selectedMeal?.mealParts?.length
    ? selectedMeal.mealParts
    : selectedMeal?.components || [];
  const hasComponents = selectedMealParts.length > 0;
  const hasUnsavedChanges = useMemo(() => Boolean(
    activeTab === 'meal'
      ? selectedMealId
        || Object.keys(componentPortions).length > 0
        || portionInfo.portion !== 1
        || portionInfo.portionLabel !== '1 whole meal'
        || customMealGrams
      : selectedIngredient
        || ingredientAmount
        || ingredientUnit !== 'grams'
  ), [activeTab, componentPortions, customMealGrams, ingredientAmount, ingredientUnit, portionInfo.portion, portionInfo.portionLabel, selectedIngredient, selectedMealId]);
  const { showModal, keepEditing, discardChanges, markSaved } = useUnsavedChanges(hasUnsavedChanges);

  useEffect(() => {
    if (router.query.tab === 'ingredient') setActiveTab('ingredient');
  }, [router.query.tab]);

  const ingredientPreview = selectedIngredient && ingredientAmount
    ? calculateNutritionWithUnit(Number(ingredientAmount), ingredientUnit, selectedIngredient)
    : getIngredientServingNutrition(selectedIngredient || {});
  const ingredientConversionWarning = selectedIngredient
    ? getConversionWarning(ingredientAmount, ingredientUnit, selectedIngredient)
    : '';
  const ingredientServingOptions = useMemo(() => getIngredientServingOptions(selectedIngredient), [selectedIngredient]);
  const ingredientServingUnits = useMemo(() => getIngredientServingUnits(selectedIngredient), [selectedIngredient]);

  function selectMeal(meal) {
    setValue('mealId', meal._id, { shouldValidate: true });
    setComponentPortions({});
    setCustomMealGrams('');
  }

  function getMealWeight(meal) {
    const ingredientsWeight = (meal?.ingredients || []).reduce((sum, item) => sum + Number(item.gramsUsed || item.quantityUsed || 0), 0);
    const mealParts = meal?.mealParts?.length ? meal.mealParts : meal?.components || [];
    const componentsWeight = mealParts.reduce((sum, component) => sum + Number(component.totalWeight || 0), 0);
    return ingredientsWeight || componentsWeight || 0;
  }

  function selectIngredient(ingredient) {
    const primaryServing = getIngredientServingOptions(ingredient)[0];
    setSelectedIngredient(ingredient);
    setIngredientAmount(primaryServing?.amount || ingredient.quantity || '');
    setIngredientUnit(normalizeUnit(primaryServing?.unit || ingredient.unit || 'grams') || primaryServing?.unit || ingredient.unit || 'grams');
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
    const body = { type: 'meal', mealId: data.mealId, ...portionInfo, portionMode: 'whole' };
    const customGrams = Number(customMealGrams || 0);
    const mealWeight = getMealWeight(selectedMeal);

    if (customGrams > 0 && mealWeight > 0) {
      const factor = customGrams / mealWeight;
      body.portion = factor;
      body.portionFactor = factor;
      body.loggedGrams = customGrams;
      body.portionMode = 'grams';
      body.portionLabel = `${customGrams}g of meal`;
    }

    if (hasComponents && customGrams <= 0) {
      body.componentPortions = selectedMealParts.map((component, index) => ({
        componentIndex: index,
        eatenAmount: Number(componentPortions[index]?.eatenAmount || component.totalWeight),
        unit: componentPortions[index]?.unit || 'grams'
      }));
    }

    await apiFetch('/api/tracker/log', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    markSaved();
    reset({ mealId: '' });
    setPortionInfo({ portion: 1, portionLabel: '1 whole meal' });
    setCustomMealGrams('');
    setComponentPortions({});
    setLogSuccess('Meal added');
    window.setTimeout(() => setLogSuccess(''), 2600);
    mutate('/api/tracker/today');
    mutate(key => typeof key === 'string' && key.startsWith('/api/tracker/week'));
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

    markSaved();
    setSelectedIngredient(null);
    setIngredientAmount('');
    setIngredientUnit('grams');
    setLogSuccess('Ingredient added');
    window.setTimeout(() => setLogSuccess(''), 2600);
    mutate('/api/tracker/today');
    mutate(key => typeof key === 'string' && key.startsWith('/api/tracker/week'));
  }

  return <RouteGuard>
    <div className="tracker-page">
      <div className="mobile-page-header">
        <div>
          <h1 className="mobile-page-title">Log Food</h1>
          <p className="mobile-page-subtitle">Log saved meals or single ingredients.</p>
        </div>
      </div>
      <div className="segmented-control" role="tablist" aria-label="Log food type">
        <button type="button" className={`segmented-control-button ${activeTab === 'meal' ? 'active' : ''}`} onClick={() => setActiveTab('meal')}>Log Meal</button>
        <button type="button" className={`segmented-control-button ${activeTab === 'ingredient' ? 'active' : ''}`} onClick={() => setActiveTab('ingredient')}>Log Ingredient</button>
      </div>
      {(mealError || ingredientError) && <ErrorMessage text="Failed to load food tracker data." />}
      {logSuccess && <div className="quick-add-success-alert" role="status">✓ {logSuccess}</div>}
      {(!meals || !ingredients) && !(mealError || ingredientError) && <LoadingMessage text="Loading food tracker..." />}

      {meals && ingredients && <Row className="tracker-layout log-food-layout">
        <Col md={8} lg={7}>
          <Card className="app-card section-card tracker-log-card log-food-card">
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
            {selectedMeal && (
              <Form.Group className="tracker-form-section">
                <Form.Label>Custom Meal Grams</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.1"
                  value={customMealGrams}
                  onChange={e => setCustomMealGrams(e.target.value)}
                  placeholder="Optional custom grams for the whole meal"
                />
                <Form.Text className="text-muted">
                  {getMealWeight(selectedMeal) > 0
                    ? 'Enter grams to log a partial meal by weight.'
                    : 'Add ingredient weights to log by grams accurately.'}
                </Form.Text>
              </Form.Group>
            )}
            {selectedMeal && hasComponents && <div className="component-portion-section">
              <Form.Label>Customize Meal Parts</Form.Label>
              {selectedMealParts.map((component, index) => (
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
                <ServingAmountSelector
                  options={ingredientServingOptions}
                  selectedOption={selectedIngredient && ingredientServingOptions.find(option => Number(option.amount) === Number(ingredientAmount) && normalizeUnit(option.unit) === normalizeUnit(ingredientUnit))?.servingName}
                  onOptionChange={option => {
                    const nextAmount = option.custom && normalizeUnit(option.unit) === 'grams' ? '' : option.amount;
                    setIngredientAmount(String(nextAmount));
                    setIngredientUnit(normalizeUnit(option.unit) || option.unit);
                  }}
                amount={ingredientAmount}
                onAmountChange={setIngredientAmount}
                unit={ingredientUnit}
                onUnitChange={setIngredientUnit}
                extraUnits={ingredientServingUnits}
                nutrition={ingredientPreview}
                conversionWarning={ingredientConversionWarning}
              />
            </>}

            <Button type="submit" variant="success" disabled={!selectedIngredient} className="tracker-submit-button">Log Ingredient</Button>
          </Form>}

          <MealPickerModal show={showMealPicker} onHide={() => setShowMealPicker(false)} meals={meals} selectedMealId={selectedMealId} weekLogs={weekLogs} onSelect={selectMeal} />
          <IngredientPickerModal show={showIngredientPicker} onHide={() => setShowIngredientPicker(false)} ingredients={ingredients} onSelect={selectIngredient} />
          </Card>
        </Col>
      </Row>}

      <UnsavedChangesModal
        show={showModal}
        onKeepEditing={keepEditing}
        onDiscardChanges={discardChanges}
      />
    </div>
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
  const category = normalizeCategory(ingredient.category);
  return (
    <Card className="compact-card picker-row">
      <FoodImage src={getFoodImage(ingredient)} alt={ingredient.name} category={category} className="thumb-sm" placeholderClassName="emoji-thumb thumb-sm" />
      <Card.Body className="picker-row-body">
        <div className="picker-row-header">
          <div>
            <h5>{ingredient.name}</h5>
            <Badge className="soft-pill soft-pill-beige">{category}</Badge>
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
  const categories = APP_CATEGORIES;
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
          <AppSearchBar
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ingredients..."
            ariaLabel="Search ingredients"
            size="compact"
          />
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
                <FoodImage src={getFoodImage(ingredient)} alt={ingredient.name} category={normalizeCategory(ingredient.category)} className="meal-picker-thumb" placeholderClassName="emoji-thumb meal-picker-thumb" />
                <Card.Body className="meal-picker-card-body">
                  <div className="meal-picker-card-main">
                    <div className="meal-picker-card-title">
                      <h6>{ingredient.name}</h6>
                      <Badge className="soft-pill soft-pill-beige">{normalizeCategory(ingredient.category)}</Badge>
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
