import { useState } from 'react';
import Link from 'next/link';
import { Button, Card } from 'react-bootstrap';
import { apiFetch } from '../lib/api';
import { formatCalories, formatMacro } from '../lib/formatNutrition';
import { normalizeMealCategory } from '../lib/mealCategoryHelpers';
import FoodImage from './FoodImage';
import ConfirmDeleteModal from './ConfirmDeleteModal';

const mealStats = [
  { label: 'Calories', icon: '🔥', color: 'orange', getValue: meal => `${formatCalories(meal.totalCalories)} cal` },
  { label: 'Protein', icon: '💪', color: 'green', getValue: meal => `${formatMacro(meal.totalProtein)}g` },
  { label: 'Carbs', icon: '🍯', color: 'yellow', getValue: meal => `${formatMacro(meal.totalCarbs)}g` },
  { label: 'Fats', icon: '💜', color: 'purple', getValue: meal => `${formatMacro(meal.totalFats)}g` },
  { label: 'Sugar', icon: '🍬', color: 'pink', getValue: meal => `${formatMacro(meal.totalSugar)}g` }
];

export default function MealCard({
  meal,
  isFavourite = false,
  onFavouriteChange,
  onDeleted,
  onQuickAdd
}) {
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
      <Card className="app-card meal-display-card">
        <div className="meal-display-image-wrap">
          <FoodImage
            src={meal.imageUrl}
            alt={meal.name}
            category={mealCategory}
            className="meal-display-image"
            placeholderClassName="meal-display-image meal-display-placeholder"
          />
        </div>

        <Card.Body className="meal-display-body">
          <div className="meal-display-top">
            <div className="meal-display-title-wrap">
              <Card.Title className="meal-display-title">{meal.name}</Card.Title>
            </div>

            <Button
              as={Link}
              href={`/meals/${meal._id}`}
              variant="link"
              size="sm"
              className="meal-more-button"
            >
              more
            </Button>
          </div>

          <div className="meal-display-stats">
            {mealStats.map(stat => (
              <div className="meal-display-stat" key={stat.label}>
                <span className={`meal-display-stat-icon meal-stat-${stat.color}`}>
                  {stat.icon}
                </span>

                <span className="meal-display-stat-label">{stat.label}</span>

                <strong className="meal-display-stat-value">
                  {stat.getValue(meal)}
                </strong>
              </div>
            ))}
          </div>

          <div className="meal-display-actions">
            {onQuickAdd && (
              <Button
                variant="success"
                size="sm"
                className="meal-quick-add-button"
                onClick={() => onQuickAdd(meal)}
              >
                Quick Add
              </Button>
            )}

            <Button
              variant="link"
              size="sm"
              className={`meal-favourite-button ${isFavourite ? 'active' : ''}`}
              onClick={toggleFavourite}
              disabled={saving}
              aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
              title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            >
              <span aria-hidden="true">{isFavourite ? '♥' : '♡'}</span>
            </Button>
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