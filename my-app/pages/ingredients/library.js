import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Badge, Button, Card, Form } from 'react-bootstrap';
import PageHeader from '../../components/PageHeader';
import RouteGuard from '../../components/RouteGuard';
import { EmptyMessage } from '../../components/StateMessage';
import { apiFetch } from '../../lib/api';
import {
  buildCustomServing,
  formatLibraryIngredientPayload,
  findPopularFoods,
  foodLibraryCategories,
  getFoodsByCategory,
  getPopularFoodById,
  getPopularFoodVariation,
  getNutritionPreview,
  getServingOption
} from '../../lib/popularFoods';

function getDefaultServingLabel(variation) {
  return variation?.servingOptions?.[0]?.label || '';
}

export default function IngredientLibrary() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [selectedVariationId, setSelectedVariationId] = useState('');
  const [selectedServingLabel, setSelectedServingLabel] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const searchedFoods = useMemo(() => findPopularFoods(search), [search]);

  const visibleCategories = useMemo(() => {
    if (!search.trim()) return foodLibraryCategories;
    return foodLibraryCategories.filter(category => searchedFoods.some(food => food.category === category.name));
  }, [search, searchedFoods]);

  const categoryCounts = useMemo(() => {
    return foodLibraryCategories.reduce((counts, category) => {
      counts[category.name] = getFoodsByCategory(category.name).length;
      return counts;
    }, {});
  }, []);

  const foodsInCategory = useMemo(() => {
    const source = search.trim() ? searchedFoods : getFoodsByCategory(selectedCategory);
    return source.filter(food => !selectedCategory || food.category === selectedCategory);
  }, [search, searchedFoods, selectedCategory]);

  const selectedFood = getPopularFoodById(selectedFoodId);
  const selectedVariation = selectedFood && getPopularFoodVariation(selectedFood.id, selectedVariationId);
  const selectedServing = selectedFood && selectedVariation
    ? getServingOption(selectedFood.id, selectedVariation.id, selectedServingLabel)
    : null;
  const finalServing = selectedServing?.custom
    ? buildCustomServing(selectedServing.label, customAmount, selectedServing.unit)
    : selectedServing;
  const ingredientPayload = selectedFood && selectedVariation && finalServing
    ? formatLibraryIngredientPayload(selectedFood, selectedVariation, finalServing)
    : null;
  const nutritionPreview = selectedFood && selectedVariation && finalServing
    ? getNutritionPreview(selectedFood.id, selectedVariation.id, finalServing.amount)
    : null;
  const canAdd = selectedFood && selectedVariation && finalServing && nutritionPreview?.hasNutrition && !adding;
  const selectedIngredientName = ingredientPayload?.name || '';

  function selectCategory(categoryName) {
    setSelectedCategory(categoryName);
    setSelectedFoodId('');
    setSelectedVariationId('');
    setSelectedServingLabel('');
    setCustomAmount('');
    setError('');
  }

  function selectFood(food) {
    setSelectedFoodId(food.id);
    setSelectedVariationId('');
    setSelectedServingLabel('');
    setCustomAmount('');
    setError('');
  }

  function selectVariation(variationId) {
    const variation = getPopularFoodVariation(selectedFoodId, variationId);
    setSelectedVariationId(variationId);
    setSelectedServingLabel(getDefaultServingLabel(variation));
    setCustomAmount('');
    setError('');
  }

  function goBack() {
    setError('');
    if (selectedVariationId) {
      setSelectedVariationId('');
      setSelectedServingLabel('');
      setCustomAmount('');
      return;
    }
    if (selectedFoodId) {
      setSelectedFoodId('');
      return;
    }
    if (selectedCategory) {
      setSelectedCategory('');
    }
  }

  async function addToInventory() {
    if (!canAdd) return;

    try {
      setAdding(true);
      setError('');
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

  const stepTitle = selectedVariation
    ? selectedVariation.name
    : selectedFood
      ? selectedFood.name
      : selectedCategory || 'Food Library';

  return <RouteGuard>
    <div className="library-page">
      <div className="library-page-top">
        <Button as={Link} href="/ingredients" variant="outline-secondary" className="library-page-back">Back to Ingredients</Button>
        <PageHeader title="Food Library" text="Choose a natural food and add it to your inventory." />
        <Form.Control
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search natural foods"
          className="library-page-search"
        />
      </div>

      <Card className="page-card library-page-card">
        <div className="library-step-header">
          {(selectedCategory || selectedFoodId || selectedVariationId) && (
            <Button type="button" variant="link" className="library-page-step-back" onClick={goBack}>{'< Back'}</Button>
          )}
          <div>
            <h2>{stepTitle}</h2>
            <p>{selectedVariation ? 'Choose a serving amount.' : selectedFood ? 'Choose a variation.' : selectedCategory ? 'Choose a base food.' : 'Choose a category.'}</p>
          </div>
        </div>

        {!selectedCategory && (
          <>
            <div className="library-category-grid library-page-category-grid">
              {visibleCategories.map(category => (
                <button type="button" className="library-category-card" key={category.id} onClick={() => selectCategory(category.name)}>
                  <span>{category.emoji}</span>
                  <strong>{category.name}</strong>
                  <small>{categoryCounts[category.name] || 0} foods</small>
                </button>
              ))}
            </div>
            {visibleCategories.length === 0 && <EmptyMessage text="No categories match your search." />}
          </>
        )}

        {selectedCategory && !selectedFood && (
          <div className="library-food-list">
            {foodsInCategory.length === 0 && <EmptyMessage text="No foods match your search." />}
            {foodsInCategory.map(food => (
              <button type="button" className="library-food-row" key={food.id} onClick={() => selectFood(food)}>
                <span className="library-food-copy">
                  <strong>{food.name}</strong>
                  <span>
                    <Badge className="soft-pill soft-pill-beige">{food.subcategory || food.category}</Badge>
                  </span>
                </span>
                <span className="library-row-chevron">{'>'}</span>
              </button>
            ))}
          </div>
        )}

        {selectedFood && !selectedVariation && (
          <div className="library-option-list">
            {selectedFood.variations.map(variation => (
              <button type="button" className="library-option-card" key={variation.id} onClick={() => selectVariation(variation.id)}>
                <span>
                  <strong>{variation.name}</strong>
                  <small>{variation.referenceAmount.amount} {variation.referenceAmount.unit}</small>
                </span>
                <span className="library-row-chevron">{'>'}</span>
              </button>
            ))}
          </div>
        )}

        {selectedFood && selectedVariation && (
          <div className="library-serving-step">
            <div className="library-selected-food">
              <div>
                <strong>{selectedIngredientName}</strong>
                <small>Reference: {selectedVariation.referenceAmount.amount} {selectedVariation.referenceAmount.unit}</small>
              </div>
            </div>

            <div className="library-serving-grid">
              {selectedVariation.servingOptions.map(option => (
                <button
                  type="button"
                  className={`library-serving-option ${selectedServingLabel === option.label ? 'active' : ''}`}
                  key={option.label}
                  onClick={() => {
                    setSelectedServingLabel(option.label);
                    setCustomAmount('');
                    setError('');
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {selectedServing?.custom && (
              <Form.Group>
                <Form.Label>{selectedServing.unit === 'ml' ? 'Custom volume' : 'Custom weight'}</Form.Label>
                <Form.Control
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={customAmount}
                  onChange={event => setCustomAmount(event.target.value)}
                  placeholder={selectedServing.unit === 'ml' ? 'Amount in ml' : 'Amount in g'}
                />
              </Form.Group>
            )}

            {finalServing && (
              <div className="library-serving-summary">
                <span>Selected amount</span>
                <strong>{finalServing.amount} {finalServing.unit}</strong>
              </div>
            )}

            {nutritionPreview && (
              <div className="library-nutrition-preview">
                <div className="library-nutrition-preview-header">
                  <strong>Nutrition preview</strong>
                  <span>{finalServing.amount} {finalServing.unit} selected</span>
                </div>
                {nutritionPreview.hasNutrition ? (
                  <div className="library-nutrition-grid">
                    <span><strong>{nutritionPreview.nutrition.calories}</strong> cal</span>
                    <span><strong>{nutritionPreview.nutrition.protein}</strong>g protein</span>
                    <span><strong>{nutritionPreview.nutrition.carbs}</strong>g carbs</span>
                    <span><strong>{nutritionPreview.nutrition.fats}</strong>g fats</span>
                    <span><strong>{nutritionPreview.nutrition.sugar}</strong>g sugar</span>
                  </div>
                ) : (
                  <Alert variant="warning" className="mb-0">Nutrition needs review for this item.</Alert>
                )}
              </div>
            )}

            {error && <Alert variant="warning" className="mb-0">{error}</Alert>}

            <div className="library-sticky-action library-page-action">
              <Button type="button" variant="success" disabled className="library-log-action">
                Log as Daily Food
              </Button>
              <small className="library-action-note">Direct logging needs an inventory ingredient first. Add it to inventory, then log it from Tracker.</small>
              <Button type="button" variant="outline-warning" disabled={!canAdd} onClick={addToInventory} className="library-inventory-action">
                {adding ? 'Adding...' : 'Add to My Inventory'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  </RouteGuard>;
}
