import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from 'react-bootstrap';
import { apiFetch } from '../lib/api';
import { formatCalories, formatMacro } from '../lib/formatNutrition';
import { normalizeMealCategory } from '../lib/mealCategoryHelpers';
import FoodImage from './FoodImage';
import ConfirmDeleteModal from './ConfirmDeleteModal';

export default function MealCard({ meal, isFavourite = false, onFavouriteChange, onDeleted, onQuickAdd }) {
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const mealCategory = normalizeMealCategory(meal.category);

  async function toggleFavourite() {
    setSaving(true);
    if (isFavourite) {
      await apiFetch(`/api/user/favourites/${meal._id}`, { method: 'DELETE' });
    } else {
      await apiFetch(`/api/user/favourites/${meal._id}`, { method: 'PUT' });
    }
    setSaving(false);
    if (onFavouriteChange) onFavouriteChange();
  }

  async function deleteMeal() {
    await apiFetch(`/api/meals/${meal._id}`, { method: 'DELETE' });
    setShowDelete(false);
    if (onDeleted) onDeleted();
    if (onFavouriteChange) onFavouriteChange();
  }

  return (
    <>
      <Card className="page-card compact-meal-card">
        <FoodImage
          src={meal.imageUrl}
          alt={meal.name}
          category={mealCategory}
          className="compact-meal-image"
          placeholderClassName="meal-placeholder-thumb"
        />
        <Card.Body className="meal-card-body">
          <div className="meal-card-main">
            <Card.Title>{meal.name}</Card.Title>
            <div className="meal-stat-row">
              <span>🔥 {formatCalories(meal.totalCalories)} cal</span>
              <span>💪 {formatMacro(meal.totalProtein)}g</span>
              <span>🍞 {formatMacro(meal.totalCarbs)}g</span>
              <span>🥑 {formatMacro(meal.totalFats)}g</span>
              <span>🍬 {formatMacro(meal.totalSugar)}g</span>
            </div>
            <div className="meal-tag-row">
              <Badge className="soft-pill soft-pill-beige">{mealCategory}</Badge>
            </div>
          </div>
          <div className="meal-card-actions">
            <Button as={Link} href={`/meals/${meal._id}`} variant="success" size="sm">Details</Button>
            {onQuickAdd && <Button variant="outline-success" size="sm" onClick={() => onQuickAdd(meal)}>Quick Add</Button>}
            <Button
              variant="link"
              size="sm"
              className={`favourite-icon-button ${isFavourite ? 'active' : ''}`}
              onClick={toggleFavourite}
              disabled={saving}
              aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
              title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            >
              <span aria-hidden="true">{isFavourite ? '♥' : '♡'}</span>
            </Button>
            <Button variant="outline-danger" size="sm" onClick={() => setShowDelete(true)}>Delete</Button>
          </div>
        </Card.Body>
      </Card>

      <ConfirmDeleteModal
        show={showDelete}
        title="Delete Meal"
        message={`Delete ${meal.name}? This cannot be undone.`}
        onCancel={() => setShowDelete(false)}
        onConfirm={deleteMeal}
      />
    </>
  );
}
