import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Alert, Button, Card, Modal } from 'react-bootstrap';
import AppBackButton from '../../components/AppBackButton';
import FoodImage from '../../components/FoodImage';
import FoodInfoCard from '../../components/FoodInfoCard';
import AppSearchBar from '../../components/AppSearchBar';
import RouteGuard from '../../components/RouteGuard';
import ServingAmountSelector from '../../components/ServingAmountSelector';
import { TrackEasyIcon } from '../../components/TrackEasyIcons';
import { apiFetch } from '../../lib/api';
import {
  buildCustomServing,
  formatLibraryIngredientPayload,
  findPopularFoods,
  getPopularFoodById,
  getPopularFoodVariation,
  getNutritionPreview,
  getServingOption,
  normalizeNutrition
} from '../../lib/popularFoods';

const SEARCH_RESULT_LIMIT = 20;
const MIN_SEARCH_LENGTH = 2;
const RECENT_RESULTS_KEY = 'trackeasy.foodLibrary.previousResults';
const PREVIOUS_RESULT_DISPLAY_LIMIT = 5;
const RECENT_RESULT_LIMIT = 25;

function getDefaultServingLabel(variation) {
  return variation?.servingOptions?.[0]?.label || '';
}

function getDefaultVariation(food) {
  return food?.variations?.find(variation => variation.id === food.defaultVariationId) || food?.variations?.[0] || null;
}

function hasMultipleVariations(food) {
  return Boolean(food?.hasMeaningfulVariations) && (food?.variations || []).length > 1;
}

function getVariationServingAmount(variation) {
  const defaultServing = variation?.servingOptions?.find(option => !option.custom);
  return Number(defaultServing?.amount || variation?.referenceAmount?.amount) || 0;
}

function getVariationServingText(variation) {
  const defaultServing = getDefaultServingLabel(variation);
  if (defaultServing) return defaultServing;
  if (variation?.referenceAmount) return `${variation.referenceAmount.amount} ${variation.referenceAmount.unit}`;
  return '';
}

function formatMacro(value) {
  const rounded = Math.round((Number(value) || 0) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function buildNutritionRows(nutrition) {
  if (!nutrition) return [];

  return [
    { label: 'Calories', value: `${nutrition.calories} cal` },
    { label: 'Protein', value: `${nutrition.protein}g` },
    { label: 'Carbs', value: `${nutrition.carbs}g` },
    { label: 'Sugar', value: `${nutrition.sugar}g` },
    { label: 'Fats', value: `${nutrition.fats}g` }
  ];
}

function getLibraryNutritionRows(food, variation) {
  return buildNutritionRows(normalizeNutrition(food, variation, getVariationServingAmount(variation)));
}

function getFoodRowMeta(food) {
  const variation = getDefaultVariation(food);
  const serving = variation?.servingOptions?.find(option => !option.custom) || variation?.servingOptions?.[0];
  const amount = Number(serving?.amount || variation?.referenceAmount?.amount) || 0;
  const unit = serving?.unit || variation?.referenceAmount?.unit || 'g';
  const nutrition = normalizeNutrition(food, variation, amount);

  return {
    servingLabel: serving?.label || food?.displayServing || `${amount} ${unit}`,
    amount,
    unit,
    nutrition
  };
}

function readPreviousResultIds() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_RESULTS_KEY) || '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter(Boolean))].slice(0, RECENT_RESULT_LIMIT) : [];
  } catch {
    return [];
  }
}

function writePreviousResultIds(ids) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RECENT_RESULTS_KEY, JSON.stringify(ids.slice(0, RECENT_RESULT_LIMIT)));
}

export default function IngredientLibrary() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [previousResultIds, setPreviousResultIds] = useState([]);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [selectedVariationId, setSelectedVariationId] = useState('');
  const [selectedServingLabel, setSelectedServingLabel] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [showAllPrevious, setShowAllPrevious] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const cleanSearch = search.trim();
  const canSearch = cleanSearch.length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    setPreviousResultIds(readPreviousResultIds());
  }, []);

  useEffect(() => {
    const querySearch = typeof router.query.search === 'string' ? router.query.search : '';
    if (querySearch) setSearch(querySearch);
  }, [router.query.search]);

  const searchResults = useMemo(() => (
    canSearch ? findPopularFoods(cleanSearch).slice(0, SEARCH_RESULT_LIMIT) : []
  ), [canSearch, cleanSearch]);

  const allPreviousResults = useMemo(() => (
    previousResultIds.map(id => getPopularFoodById(id)).filter(Boolean)
  ), [previousResultIds]);
  const previousResults = allPreviousResults.slice(0, PREVIOUS_RESULT_DISPLAY_LIMIT);

  const selectedFood = getPopularFoodById(selectedFoodId);
  const selectedVariation = selectedFood && getPopularFoodVariation(selectedFood.id, selectedVariationId);
  const selectedServing = selectedFood && selectedVariation
    ? getServingOption(selectedFood.id, selectedVariation.id, selectedServingLabel)
    : null;
  const customAmountNumber = Number(customAmount);
  const finalServing = selectedServing?.custom
    ? buildCustomServing(selectedServing.label, Number.isFinite(customAmountNumber) ? customAmountNumber : 0, selectedServing.unit, { allowZero: true })
    : selectedServing;
  const ingredientPayload = selectedFood && selectedVariation && finalServing
    ? formatLibraryIngredientPayload(selectedFood, selectedVariation, finalServing)
    : null;
  const nutritionPreview = selectedFood && selectedVariation && finalServing
    ? getNutritionPreview(selectedFood.id, selectedVariation.id, finalServing)
    : null;
  const customAmountReady = !selectedServing?.custom || Number(customAmount) > 0;
  const canAdd = selectedFood && selectedVariation && finalServing && customAmountReady && !adding;
  const selectedIngredientName = ingredientPayload?.name || '';
  const nutritionRows = buildNutritionRows(nutritionPreview?.nutrition);

  function rememberFood(foodId) {
    if (!foodId) return;
    const nextIds = [foodId, ...previousResultIds.filter(id => id !== foodId)].slice(0, RECENT_RESULT_LIMIT);
    setPreviousResultIds(nextIds);
    writePreviousResultIds(nextIds);
  }

  function selectFood(food) {
    rememberFood(food.id);
    setSelectedFoodId(food.id);
    const defaultVariation = getDefaultVariation(food);
    if (defaultVariation && !hasMultipleVariations(food)) {
      setSelectedVariationId(defaultVariation.id);
      setSelectedServingLabel(getDefaultServingLabel(defaultVariation));
    } else {
      setSelectedVariationId('');
      setSelectedServingLabel('');
    }
    setCustomAmount('');
    setError('');
  }

  function selectVariation(variationId) {
    const variation = getPopularFoodVariation(selectedFoodId, variationId);
    rememberFood(selectedFoodId);
    setSelectedVariationId(variationId);
    setSelectedServingLabel(getDefaultServingLabel(variation));
    setCustomAmount('');
    setError('');
  }

  function goBack() {
    setError('');
    if (selectedVariationId) {
      if (selectedFood && !hasMultipleVariations(selectedFood)) {
        setSelectedFoodId('');
      } else {
        setSelectedVariationId('');
      }
      setSelectedServingLabel('');
      setCustomAmount('');
      return;
    }
    if (selectedFoodId) setSelectedFoodId('');
  }

  async function addToInventory() {
    if (!canAdd) return;

    try {
      setAdding(true);
      setError('');
      rememberFood(selectedFood.id);
      await apiFetch('/api/ingredients', {
        method: 'POST',
        body: JSON.stringify(ingredientPayload)
      });

      router.push({
        pathname: '/ingredients',
        query: { added: selectedIngredientName }
      });
    } catch (err) {
      setError(err.message || 'Could not add this ingredient to your inventory.');
      setAdding(false);
    }
  }

  const showingSelectionStep = Boolean(selectedFood);
  const stepTitle = selectedVariation ? selectedVariation.name : selectedFood?.name || '';

  return <RouteGuard>
    <div className="library-page library-search-page">
      <div className="library-page-top library-search-hero">
        <AppBackButton href="/ingredients" label="Back to Ingredients" />
        <div>
          <h1>Food Library</h1>
          <p>Search a natural food and add it to your inventory.</p>
        </div>
        {!showingSelectionStep && (
          <div className="library-premium-search-wrap">
            <AppSearchBar
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search vegetables, fruits, grains..."
              ariaLabel="Search natural foods"
              size="large"
              className="library-premium-search"
              inputClassName="library-premium-search-input"
              autoFocus
            />
            <div className="library-search-helper">
              <TrackEasyIcon name="tracker" size={18} />
              <span>Start typing to see instant matches.</span>
            </div>
          </div>
        )}
      </div>

      {!showingSelectionStep && (
        <LibraryResultsPanel
          title={canSearch ? 'Search results' : 'Previous results'}
          foods={canSearch ? searchResults : previousResults}
          emptyTitle={canSearch ? 'No foods match your search.' : 'No previous results yet'}
          emptyText={canSearch ? 'Try a different natural food name.' : 'Search for a food to start building your library.'}
          showViewAll={!canSearch && allPreviousResults.length > PREVIOUS_RESULT_DISPLAY_LIMIT}
          onViewAll={() => setShowAllPrevious(true)}
          onSelect={selectFood}
        />
      )}

      {selectedFood && (
        <Card className="page-card library-page-card library-serving-card">
 

          {selectedFood && !selectedVariation && (
            <div className="library-option-list">
              {selectedFood.variations.map(variation => (
                <button type="button" className="library-option-card" key={variation.id} onClick={() => selectVariation(variation.id)}>
                  <FoodInfoCard
                    title={variation.name}
                    subtitle={getVariationServingText(variation)}
                    imageSrc={selectedFood.image}
                    category={selectedFood.category}
                    nutritionRows={getLibraryNutritionRows(selectedFood, variation)}
                    className="library-food-info-card"
                    footer={!normalizeNutrition(selectedFood, variation, getVariationServingAmount(variation)) && <span className="library-card-note">Nutrition needs review</span>}
                    actions={<span className="food-info-action" aria-hidden="true"><TrackEasyIcon name="plus" size={20} /></span>}
                  />
                </button>
              ))}
            </div>
          )}

          {selectedFood && selectedVariation && (
            <div className="library-serving-step">
              <div className="library-selected-food">
                <div>
                  {selectedIngredientName}
                  {`     `}
                  <small> {selectedVariation.referenceAmount.amount} {selectedVariation.referenceAmount.unit}</small>
                </div>
              </div>

              <ServingAmountSelector
                options={selectedVariation.servingOptions}
                selectedOption={selectedServingLabel}
                onOptionChange={option => {
                  setSelectedServingLabel(option.label);
                  setCustomAmount('');
                  setError('');
                }}
                amount={selectedServing?.custom ? customAmount : undefined}
                onAmountChange={selectedServing?.custom ? setCustomAmount : undefined}
                unit={selectedServing?.unit === 'ml' ? 'milliliters' : 'grams'}
                showUnitSelect={false}
                customLabel={selectedServing?.unit === 'ml' ? 'Custom volume' : 'Custom weight'}
                customPlaceholder={selectedServing?.unit === 'ml' ? 'Amount in ml' : 'Amount in g'}
                nutrition={nutritionPreview?.nutrition}
                className="library-serving-selector"
              />

              {finalServing && (
                <FoodInfoCard
                  title={selectedIngredientName || selectedVariation.name}
                  subtitle={`${finalServing.amount} ${finalServing.unit} selected`}
                  imageSrc={selectedFood.image}
                  category={selectedFood.category}
                  nutritionRows={nutritionRows}
                  className="library-food-info-card library-serving-preview-card"
                  footer={!nutritionPreview?.hasNutrition && <span className="library-card-note">Nutrition needs review</span>}
                  actions={<span className="food-info-action" aria-hidden="true"><TrackEasyIcon name="plus" size={20} /></span>}
                />
              )}

              {nutritionPreview && !nutritionPreview.hasNutrition && (
                <Alert variant="warning" className="mb-0">Nutrition needs review for this item.</Alert>
              )}

              {error && <Alert variant="warning" className="mb-0">{error}</Alert>}

              <div className="library-sticky-action library-page-action">
                <small className="library-action-note">Direct logging needs an inventory ingredient first. Add it to inventory, then log it from Tracker.</small>
                <Button type="button" variant="success" disabled={!canAdd} onClick={addToInventory} className="library-inventory-action">
                  {adding ? 'Adding...' : 'Add to My Inventory'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Modal show={showAllPrevious} onHide={() => setShowAllPrevious(false)} centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Previous results</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <LibraryResultsPanel
            title="Previous results"
            foods={allPreviousResults}
            emptyTitle="No previous results yet"
            emptyText="Search for a food to start building your library."
            onSelect={food => {
              setShowAllPrevious(false);
              selectFood(food);
            }}
            compact
          />
        </Modal.Body>
      </Modal>
    </div>
  </RouteGuard>;
}

function LibraryResultsPanel({ title, foods = [], emptyTitle, emptyText, onSelect, showViewAll = false, onViewAll, compact = false }) {
  return (
    <Card className={`library-results-panel ${compact ? 'library-results-panel-compact' : ''}`}>
      <div className="library-results-heading">
        <div>
          <TrackEasyIcon name={title === 'Previous results' ? 'tracker' : 'bolt'} size={22} />
          <h2>{title}</h2>
        </div>
      </div>

      {foods.length === 0 && (
        <div className="library-results-empty">
          <strong>{emptyTitle}</strong>
          <span>{emptyText}</span>
        </div>
      )}

      {foods.length > 0 && (
        <div className="library-picker-list">
          {foods.map(food => (
            <LibraryPickerRow key={food.id} food={food} onSelect={() => onSelect(food)} />
          ))}
        </div>
      )}

      {showViewAll && (
        <Button type="button" variant="outline-success" className="library-view-all-button" onClick={onViewAll}>
          View all
        </Button>
      )}
    </Card>
  );
}

function LibraryPickerRow({ food, onSelect }) {
  const meta = getFoodRowMeta(food);
  const nutrition = meta.nutrition;
  const servingText = meta.amount ? `${meta.servingLabel} (${meta.amount} ${meta.unit})` : meta.servingLabel;

  return (
    <button type="button" className="library-picker-row" onClick={onSelect}>
      <FoodImage
        src={food.image}
        alt={food.name}
        category={food.category}
        className="library-picker-row-image"
        placeholderClassName="library-picker-row-placeholder"
      />
      <span className="library-picker-row-main">
        <strong>{food.name}</strong>
        <span>{servingText}{nutrition ? ` - ${nutrition.calories} kcal` : ''}</span>
        {nutrition ? (
          <small>{formatMacro(nutrition.carbs)}g carbs - {formatMacro(nutrition.protein)}g protein - {formatMacro(nutrition.fats)}g fat</small>
        ) : (
          <small>Nutrition needs review</small>
        )}
      </span>
      <span className="library-picker-add" aria-hidden="true">
        <TrackEasyIcon name="plus" size={25} strokeWidth={2.6} />
      </span>
    </button>
  );
}
