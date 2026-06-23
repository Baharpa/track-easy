import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from 'react-bootstrap';
import { apiFetch } from '../lib/api';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { formatAmount, formatIngredientServingNutrition } from '../lib/formatNutrition';
import FoodImage from './FoodImage';
import { normalizeCategory } from '../lib/categoryHelpers';

export default function IngredientCard({ ingredient, onDeleted }) {
  const [showDelete, setShowDelete] = useState(false);
  const hasImage = Boolean(ingredient.imageUrl && String(ingredient.imageUrl).trim());
  const category = normalizeCategory(ingredient.category);

  async function deleteIngredient() {
    await apiFetch(`/api/ingredients/${ingredient._id}`, { method: 'DELETE' });
    setShowDelete(false);
    onDeleted();
  }

  return (
    <>
      <Card className="ingredient-card">
        {hasImage && (
          <FoodImage
            src={ingredient.imageUrl}
            alt={ingredient.name}
            category={category}
            className="ingredient-card-thumb"
            placeholderClassName="ingredient-card-thumb"
          />
        )}

        <Card.Body className="ingredient-card-body">
          <div className="ingredient-card-main">
            <div className="ingredient-card-top">
              <Card.Title className="ingredient-card-title">{ingredient.name}</Card.Title>
            </div>

            <div className="ingredient-card-meta">
              <span>{formatAmount(ingredient.quantity)} {ingredient.unit}</span>
              <span>{formatIngredientServingNutrition(ingredient)}</span>
            </div>

            <Badge className="ingredient-card-badge">{category}</Badge>
          </div>

          <div className="ingredient-card-actions">
            <Button
              as={Link}
              href={`/ingredients/${ingredient._id}`}
              className="ingredient-edit-btn"
              size="sm"
            >
              Edit
            </Button>
            <Button
              className="ingredient-delete-btn"
              size="sm"
              onClick={() => setShowDelete(true)}
            >
              Delete
            </Button>
          </div>
        </Card.Body>
      </Card>

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
