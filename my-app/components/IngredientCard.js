import { useState } from 'react';
import Link from 'next/link';
import { Button } from 'react-bootstrap';
import { apiFetch } from '../lib/api';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { formatAmount, formatCalories, formatMacro } from '../lib/formatNutrition';
import { normalizeCategory } from '../lib/categoryHelpers';
import FoodInfoCard from './FoodInfoCard';
import { TrackEasyIcon } from './TrackEasyIcons';

export default function IngredientCard({ ingredient, onDeleted }) {
  const [showDelete, setShowDelete] = useState(false);
  const category = normalizeCategory(ingredient.category);
  const nutritionRows = [
    { label: 'Calories', value: `${formatCalories(ingredient.calories)} cal` },
    { label: 'Protein', value: `${formatMacro(ingredient.protein)}g` },
    { label: 'Carbs', value: `${formatMacro(ingredient.carbs)}g` },
    { label: 'Sugar', value: `${formatMacro(ingredient.sugar)}g` },
    { label: 'Fats', value: `${formatMacro(ingredient.fats)}g` }
  ];

  async function deleteIngredient() {
    await apiFetch(`/api/ingredients/${ingredient._id}`, { method: 'DELETE' });
    setShowDelete(false);
    onDeleted();
  }

  return (
    <>
      <FoodInfoCard
        title={ingredient.name}
        subtitle={`${formatAmount(ingredient.quantity)} ${ingredient.unit}`}
        imageSrc={ingredient.imageUrl}
        category={category}
        nutritionRows={nutritionRows}
        className="ingredient-card"
        actions={(
          <>
            <Button
              as={Link}
              href={`/ingredients/${ingredient._id}`}
              variant="link"
              className="food-info-action"
              size="sm"
              aria-label={`Edit ${ingredient.name}`}
            >
              <TrackEasyIcon name="pen" size={21} />
            </Button>
            <Button
              variant="link"
              className="food-info-action food-info-action--danger"
              size="sm"
              aria-label={`Delete ${ingredient.name}`}
              onClick={() => setShowDelete(true)}
            >
              <TrackEasyIcon name="trash" size={21} />
            </Button>
          </>
        )}
      />

      <ConfirmDeleteModal
        show={showDelete}
        title="Delete Ingredient"
        message={`Delete ${ingredient.name}? This cannot be undone.`}
        onCancel={() => setShowDelete(false)}
        onConfirm={deleteIngredient}
      />
    </>
  );
}
