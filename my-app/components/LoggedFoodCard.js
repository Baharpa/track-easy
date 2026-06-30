import Link from "next/link";
import { useState } from "react";
import { Button, Dropdown } from "react-bootstrap";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import FoodInfoCard from "./FoodInfoCard";
import { TrackEasyIcon } from "./TrackEasyIcons";
import { getFoodImage } from "../lib/foodVisuals";

function whole(value) {
  return Math.round(Number(value) || 0);
}

function loggedFoodDescription(item = {}) {
  if (item.portionLabel) return item.portionLabel;
  if (item.type === "ingredient")
    return `${whole(item.amount || item.quantityUsed)} ${item.unit || ""}`.trim();
  return `${item.servings || item.portion || 1} serving`;
}

export default function LoggedFoodCard({
  item,
  onOpen,
  onRemove,
  detailHref,
  from = "tracker",
  className = "",
  compact = false,
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const imageSrc = getFoodImage(item);
  const logHref = detailHref || (item?._id ? { pathname: `/logs/${item._id}`, query: { from } } : "");
  const editHref =
    typeof logHref === "string"
      ? { pathname: logHref, query: { mode: "edit" } }
      : {
          pathname: logHref?.pathname || "",
          query: { ...(logHref?.query || {}), mode: "edit" },
        };
  const nutritionRows = [
    { label: "Calories", value: `${whole(item?.calories)} cal` },
    { label: "Protein", value: `${whole(item?.protein)}g` },
    { label: "Carbs", value: `${whole(item?.carbs)}g` },
    { label: "Sugar", value: `${whole(item?.sugar)}g` },
    { label: "Fats", value: `${whole(item?.fats)}g` },
  ];

  async function confirmRemove() {
    await onRemove(item);
    setShowConfirm(false);
  }

  function handleOpen() {
    if (typeof onOpen === "function") {
      onOpen(item);
    }
  }

  return (
    <>
      <FoodInfoCard
        title={item?.name || "Logged food"}
        subtitle={loggedFoodDescription(item)}
        imageSrc={imageSrc}
        category={
          item?.type === "ingredient" ? "Other" : item?.category || "Meal"
        }
        nutritionRows={compact ? [] : nutritionRows}
        variant={compact ? "compact" : "premium"}
        showNutritionIcons
        className={`${className} ${compact ? "logged-food-card--compact" : ""}`.trim()}
        detailHref={logHref || undefined}
        onCardClick={!logHref && typeof onOpen === "function" ? handleOpen : undefined}
        actions={
          <>
            {onRemove && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="food-info-action food-info-action--danger"
                onClick={() => setShowConfirm(true)}
                aria-label={`Remove ${item?.name || "logged food"}`}
              >
                <TrackEasyIcon name="trash" size={20} />
              </Button>
            )}
            <Dropdown align="end">
              <Dropdown.Toggle
                variant="link"
                size="sm"
                className="food-info-action food-info-action--menu"
                aria-label={`More actions for ${item?.name || "logged food"}`}
              >
                <TrackEasyIcon name="ellipsis" size={22} />
              </Dropdown.Toggle>
              <Dropdown.Menu className="food-info-menu">
                {logHref ? (
                  <>
                    <Dropdown.Item as={Link} href={logHref}>
                      View details
                    </Dropdown.Item>
                    <Dropdown.Item as={Link} href={editHref}>
                      Edit log
                    </Dropdown.Item>
                  </>
                ) : (
                  <Dropdown.Item
                    onClick={handleOpen}
                    disabled={typeof onOpen !== "function"}
                  >
                    View details
                  </Dropdown.Item>
                )}
                {onRemove && (
                  <Dropdown.Item
                    className="text-danger"
                    onClick={() => setShowConfirm(true)}
                  >
                    Remove
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown>
          </>
        }
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
        <span
          className="empty-logged-food-card__icon"
          aria-hidden="true"
        ></span>
        <strong className="empty-logged-food-card__title">
          No food logged today
        </strong>
        <span className="empty-logged-food-card__text">
          Log a meal or ingredient to see it here.
        </span>
      </div>
    </div>
  );
}
