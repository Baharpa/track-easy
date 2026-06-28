import { useState } from 'react';
import Link from 'next/link';
import { Button } from 'react-bootstrap';
import { apiFetch } from '../lib/api';
import { formatCalories, formatMacro } from '../lib/formatNutrition';
import { normalizeMealCategory } from '../lib/mealCategoryHelpers';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import FoodInfoCard from './FoodInfoCard';
import { TrackEasyIcon } from './TrackEasyIcons';

const mealStats = [
  { label: 'Calories', displayLabel: 'cal', getValue: meal => formatCalories(meal.totalCalories) },
  { label: 'Protein', displayLabel: 'protein', getValue: meal => `${formatMacro(meal.totalProtein)}g` },
  { label: 'Carbs', displayLabel: 'carbs', getValue: meal => `${formatMacro(meal.totalCarbs)}g` },
  { label: 'Sugar', displayLabel: 'sugar', getValue: meal => `${formatMacro(meal.totalSugar)}g` },
  { label: 'Fats', displayLabel: 'fats', getValue: meal => `${formatMacro(meal.totalFats)}g` }
];

export default function MealCard({ meal, isFavourite = false, onFavouriteChange, onQuickAdd }) {
  const [saving, setSaving] = useState(false);
  const [showFavouriteRemove, setShowFavouriteRemove] = useState(false);
  const mealCategory = normalizeMealCategory(meal.category);
  const nutritionRows = mealStats.map(stat => ({ label: stat.label, displayLabel: stat.displayLabel, value: stat.getValue(meal) }));

  async function toggleFavourite() {
    if (isFavourite) {
      setShowFavouriteRemove(true);
      return;
    }

    setSaving(true);
    await apiFetch(`/api/user/favourites/${meal._id}`, { method: 'PUT' });
    setSaving(false);
    if (onFavouriteChange) onFavouriteChange();
  }

  async function removeFavourite() {
    setSaving(true);
    await apiFetch(`/api/user/favourites/${meal._id}`, { method: 'DELETE' });
    setSaving(false);
    setShowFavouriteRemove(false);
    if (onFavouriteChange) onFavouriteChange();
  }

  return (
    <>
      <FoodInfoCard
        title={meal.name}
        imageSrc={meal.imageUrl}
        category={mealCategory}
        nutritionRows={nutritionRows}
        premium
        showNutritionIcons
        className="meal-display-card"
        actions={(
          <>
            <Button
              variant="link"
              size="sm"
              className={`food-info-action food-info-action--heart ${isFavourite ? 'active' : ''}`}
              onClick={toggleFavourite}
              disabled={saving}
              aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
              title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            >
              <TrackEasyIcon name={isFavourite ? 'heart' : 'heart-outline'} size={22} />
            </Button>
            <Button
              as={Link}
              href={`/meals/edit/${meal._id}`}
              variant="link"
              size="sm"
              className="food-info-action"
              aria-label={`Edit ${meal.name}`}
            >
              <TrackEasyIcon name="pen" size={21} />
            </Button>
          </>
        )}
        footer={onQuickAdd && (
          <Button variant="success" size="sm" className="food-info-quick-add" onClick={() => onQuickAdd(meal)}>
            <TrackEasyIcon name="plus" size={18} />
            <span>Quick Add</span>
          </Button>
        )}
      />

      <ConfirmDeleteModal
        show={showFavouriteRemove}
        title="Remove from favourites?"
        message="This meal will be removed from your favourites."
        confirmLabel="Remove"
        confirmVariant="danger"
        onCancel={() => setShowFavouriteRemove(false)}
        onConfirm={removeFavourite}
      />
    </>
  );
}
