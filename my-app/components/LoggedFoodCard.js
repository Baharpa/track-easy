import Link from 'next/link';
import { useState } from 'react';
import { Button, Dropdown } from 'react-bootstrap';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import FoodInfoCard from './FoodInfoCard';
import { TrackEasyIcon } from './TrackEasyIcons';

function whole(value) {
  return Math.round(Number(value) || 0);
}

function loggedFoodDescription(item = {}) {
  if (item.portionLabel) return item.portionLabel;
  if (item.type === 'ingredient') return `${whole(item.amount || item.quantityUsed)} ${item.unit || ''}`.trim();
  return `${item.servings || item.portion || 1} serving`;
}

function loggedFoodImage(item = {}) {
  return item.imageUrl || item.image || item.photoUrl || item.thumbnailUrl || item.mealImageUrl || item.ingredientImageUrl || '';
}

export default function LoggedFoodCard({ item, onOpen, onRemove, className = '' }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const imageSrc = loggedFoodImage(item);
  const logHref = item?._id ? `/logs/${item._id}` : '';
  const nutritionRows = [
    { label: 'Calories', value: `${whole(item?.calories)} cal` },
    { label: 'Protein', value: `${whole(item?.protein)}g` },
    { label: 'Carbs', value: `${whole(item?.carbs)}g` },
    { label: 'Sugar', value: `${whole(item?.sugar)}g` },
    { label: 'Fats', value: `${whole(item?.fats)}g` }
  ];

  async function confirmRemove() {
    await onRemove(item);
    setShowConfirm(false);
  }

  function handleOpen() {
    if (typeof onOpen === 'function') {
      onOpen(item);
    }
  }

  return (
    <>
      <FoodInfoCard
        title={item?.name || 'Logged food'}
        subtitle={loggedFoodDescription(item)}
        imageSrc={imageSrc}
        category={item?.type === 'ingredient' ? 'Other' : item?.category || 'Meal'}
        nutritionRows={nutritionRows}
        className={`logged-food-card ${className}`.trim()}
        actions={(
          <>
            {onRemove && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="food-info-action food-info-action--danger"
                onClick={() => setShowConfirm(true)}
                aria-label={`Remove ${item?.name || 'logged food'}`}
              >
                <TrackEasyIcon name="trash" size={20} />
              </Button>
            )}
            <Dropdown align="end">
              <Dropdown.Toggle variant="link" size="sm" className="food-info-action food-info-action--menu" aria-label={`More actions for ${item?.name || 'logged food'}`}>
                <TrackEasyIcon name="ellipsis" size={22} />
              </Dropdown.Toggle>
              <Dropdown.Menu className="food-info-menu">
                {logHref ? (
                  <>
                    <Dropdown.Item as={Link} href={logHref}>View details</Dropdown.Item>
                    <Dropdown.Item as={Link} href={{ pathname: logHref, query: { mode: 'edit' } }}>Edit log</Dropdown.Item>
                  </>
                ) : (
                  <Dropdown.Item onClick={handleOpen} disabled={typeof onOpen !== 'function'}>View details</Dropdown.Item>
                )}
                {onRemove && <Dropdown.Item className="text-danger" onClick={() => setShowConfirm(true)}>Remove</Dropdown.Item>}
              </Dropdown.Menu>
            </Dropdown>
          </>
        )}
      />

      {onRemove && (
        <ConfirmDeleteModal
          show={showConfirm}
          title="Remove this food?"
          message="This action cannot be undone."
          confirmLabel="Remove"
          confirmVariant="danger"
          onCancel={() => setShowConfirm(false)}
          onConfirm={confirmRemove}
        />
      )}
    </>
  );
}

export function EmptyLoggedFoodCard() {
  return (
    <div className="empty-logged-food-card">
      <div className="empty-logged-food-card__inner">
        <span className="empty-logged-food-card__icon" aria-hidden="true">
          <TrackEasyIcon name="plus" size={34} />
        </span>
        <strong className="empty-logged-food-card__title">No food logged today</strong>
        <span className="empty-logged-food-card__text">Log a meal or ingredient to see it here.</span>
      </div>
    </div>
  );
}
