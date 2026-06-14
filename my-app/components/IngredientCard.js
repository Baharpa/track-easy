import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from 'react-bootstrap';
import { apiFetch } from '../lib/api';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { formatAmount, formatIngredientServingNutrition } from '../lib/formatNutrition';
import FoodImage from './FoodImage';

export default function IngredientCard({ ingredient, onDeleted }) {
  const [showDelete, setShowDelete] = useState(false);

  async function deleteIngredient() {
    await apiFetch(`/api/ingredients/${ingredient._id}`, { method: 'DELETE' });
    setShowDelete(false);
    onDeleted();
  }

  return (
    <>
      <Card className="app-card picker-row">
        <FoodImage src={ingredient.imageUrl} alt={ingredient.name} category={ingredient.category || 'Other'} className="thumb-md" placeholderClassName="emoji-thumb thumb-md" />
        <Card.Body className="picker-row-body">
          <div className="picker-row-main">
            <Card.Title>{ingredient.name}</Card.Title>
            <div className="mini-stat-row">
              <span>{formatAmount(ingredient.quantity)} {ingredient.unit}</span>
              <span>{formatIngredientServingNutrition(ingredient)}</span>
            </div>
            <div className="mini-stat-row">
              <Badge className="soft-pill soft-pill-beige">{ingredient.category || 'Other'}</Badge>
            </div>
          </div>
          <div className="action-wrap">
            <Button as={Link} href={`/ingredients/${ingredient._id}`} variant="warning" size="sm">Edit</Button>
            <Button variant="outline-danger" size="sm" onClick={() => setShowDelete(true)}>Delete</Button>
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
