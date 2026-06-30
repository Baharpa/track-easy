import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import {
  Alert,
  Button,
} from "react-bootstrap";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import PortionSelector from "../../components/PortionSelector";
import RouteGuard from "../../components/RouteGuard";
import ServingAmountSelector from "../../components/ServingAmountSelector";
import UnsavedChangesModal from "../../components/UnsavedChangesModal";
import useUnsavedChanges from "../../hooks/useUnsavedChanges";
import { ErrorMessage, LoadingMessage } from "../../components/StateMessage";
import { apiFetch } from "../../lib/api";
import {
  calculateNutritionWithUnit,
  getIngredientServingOptions,
  getIngredientServingUnits,
  normalizeUnit,
} from "../../lib/unitConverter";
import {
  formatAmount,
} from "../../lib/formatNutrition";
import { getIngredientServingNutrition } from "../../lib/formatNutrition";
import FoodImage from "../../components/FoodImage";
import FoodNutritionOverview from "../../components/FoodNutritionOverview";
import MealDetails from "../../components/MealDetails";
import {
  DetailDangerZone,
  DetailHeroCard,
  DetailIngredientRow,
  DetailMealPartCard,
  DetailNutritionSummary,
  DetailPageShell,
  DetailSectionCard,
} from "../../components/DetailPageSystem";

function isIngredientLog(log) {
  return log?.type === "ingredient" || Boolean(log?.ingredientId);
}

export default function LoggedMealDetail() {
  const router = useRouter();
  const { id, mode, date } = router.query;
  const { mutate } = useSWRConfig();
  const from = typeof router.query.from === "string" ? router.query.from : "tracker";
  const logDateQuery =
    typeof date === "string" ? `?date=${encodeURIComponent(date)}` : "";
  const logFromQuery = `${logDateQuery ? "&" : "?"}from=${encodeURIComponent(from)}`;
  const logDetailPath = id ? `/api/tracker/log/${id}${logDateQuery}` : null;
  const logPageHref = id ? `/logs/${id}${logDateQuery}${logFromQuery}` : "";
  const logEditHref = id
    ? `/logs/${id}?${new URLSearchParams({
        ...(typeof date === "string" ? { date } : {}),
        from,
        mode: "edit",
      }).toString()}`
    : "";
  const { data: log, error } = useSWR(logDetailPath);
  const { data: ingredient } = useSWR(
    log?.ingredientId ? `/api/ingredients/${log.ingredientId}` : null,
  );
  const { data: meal } = useSWR(
    log?.mealId ? `/api/meals/${log.mealId}` : null,
  );
  const loggedMealParts = log?.mealParts?.length
    ? log.mealParts
    : log?.components || [];
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [ingredientAmount, setIngredientAmount] = useState("");
  const [ingredientUnit, setIngredientUnit] = useState("grams");
  const [portion, setPortion] = useState(1);
  const [portionLabel, setPortionLabel] = useState("1 whole meal");
  const [initializedLogId, setInitializedLogId] = useState("");

  const editMode = mode === "edit";
  const ingredientPreview =
    ingredient && ingredientAmount
      ? calculateNutritionWithUnit(
          Number(ingredientAmount),
          ingredientUnit,
          ingredient,
        )
      : getIngredientServingNutrition(ingredient || {});
  const ingredientServingOptions = useMemo(
    () => getIngredientServingOptions(ingredient),
    [ingredient],
  );
  const ingredientServingUnits = useMemo(
    () => getIngredientServingUnits(ingredient),
    [ingredient],
  );
  const canEditMeal = Boolean(
    log &&
      !isIngredientLog(log) &&
      !log.componentPortions?.length &&
      log.portionLabel !== "custom component amounts",
  );
  const isDirty =
    editMode &&
    ((isIngredientLog(log) &&
      (String(ingredientAmount) !==
        String(log?.amount ?? log?.quantityUsed ?? "") ||
        String(ingredientUnit) !==
          String(log?.unit || ingredient?.unit || "grams"))) ||
      (canEditMeal &&
        (Number(portion) !== Number(log?.portion || log?.servings || 1) ||
          String(portionLabel) !==
            String(log?.portionLabel || "1 whole meal"))));
  const { showModal, keepEditing, discardChanges, markSaved, requestNavigation } =
    useUnsavedChanges(isDirty);

  useEffect(() => {
    if (!log) return;
    if (!editMode) {
      setInitializedLogId("");
      return;
    }
    if (initializedLogId === log._id) return;

    if (isIngredientLog(log)) {
      setIngredientAmount(String(log.amount ?? log.quantityUsed ?? ""));
      setIngredientUnit(
        normalizeUnit(log.unit || ingredient?.unit || "grams") ||
          log.unit ||
          ingredient?.unit ||
          "grams",
      );
    } else {
      setPortion(Number(log.portion || log.servings || 1));
      setPortionLabel(log.portionLabel || "1 whole meal");
    }
    setInitializedLogId(log._id);
  }, [editMode, ingredient?.unit, initializedLogId, log]);

  if (!id || (!log && !error)) {
    return (
      <RouteGuard>
        <LoadingMessage text="Loading..." />
      </RouteGuard>
    );
  }

  if (!log) {
    return (
      <RouteGuard>
        <ErrorMessage text="Logged food not found." />
      </RouteGuard>
    );
  }

  const loggedFoodName =
    log.name || ingredient?.name || meal?.name || "Logged food";
  const loggedTimestamp = log.loggedAt || log.createdAt;
  const loggedDateText = loggedTimestamp ? new Date(loggedTimestamp).toLocaleString() : "";
  const loggedAmountText = log.portionLabel || `${formatAmount(log.amount || 0)} ${log.unit || ""}`.trim();
  const showIngredientEditor = editMode && isIngredientLog(log);
  const showMealEditor = editMode && canEditMeal && !isIngredientLog(log);

  async function handleSaveIngredient() {
    if (!ingredient || !ingredientAmount || Number(ingredientAmount) <= 0)
      return;

    await apiFetch(logDetailPath, {
      method: "PUT",
      body: JSON.stringify({
        amount: Number(ingredientAmount),
        unit: ingredientUnit,
      }),
    });

    markSaved();
    await mutate("/api/tracker/today");
    await mutate(
      (key) => typeof key === "string" && key.startsWith("/api/tracker/week"),
    );
    router.replace(logPageHref);
  }

  async function handleSaveMeal() {
    await apiFetch(logDetailPath, {
      method: "PUT",
      body: JSON.stringify({
        portion,
        portionLabel,
      }),
    });

    markSaved();
    await mutate("/api/tracker/today");
    await mutate(
      (key) => typeof key === "string" && key.startsWith("/api/tracker/week"),
    );
    router.replace(logPageHref);
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError("");
    try {
      await apiFetch(logDetailPath, { method: "DELETE" });
      await mutate("/api/tracker/today");
      await mutate(
        (key) => typeof key === "string" && key.startsWith("/api/tracker/week"),
      );
      const destinations = { history: "/history", dashboard: "/dashboard", tracker: "/tracker" };
      router.push(destinations[from] || "/tracker");
    } catch (err) {
      setDeleteError(err.message || "Failed to delete logged food.");
      setIsDeleting(false);
    }
  }

  return (
    <RouteGuard>
      <DetailPageShell title={editMode ? "Edit Logged Food" : "Logged Food Details"} subtitle={editMode ? "Update this logged item." : "Review this logged food and its nutrition."} defaultFrom="tracker">
      {editMode && <DetailHeroCard
        item={log}
        title={loggedFoodName}
        subtitle={isIngredientLog(log) ? "Logged ingredient" : "Logged meal"}
        meta={[loggedAmountText, loggedDateText].filter(Boolean).join(" · ")}
        category={meal?.category || ingredient?.category || "Other"}
        actions={!editMode && <Button as={Link} href={logEditHref} variant="success">Edit Log</Button>}
      />}
      {!editMode && !isIngredientLog(log) && <MealDetails meal={{ ...(meal || {}), ...log, name: loggedFoodName, imageUrl: log.imageUrl || meal?.imageUrl, image: log.image || meal?.image }} />}
      {!editMode && isIngredientLog(log) && <>
        <section className="meal-overview-hero ingredient-overview-hero">
          <FoodImage src={{ ...(ingredient || {}), ...log }} alt={loggedFoodName} category={ingredient?.category || 'Other'} variant="detail" className="meal-overview-hero-image" placeholderClassName="meal-overview-hero-placeholder" />
          <div className="meal-overview-hero-overlay"><span>Logged ingredient</span><h2>{loggedFoodName}</h2><strong>{loggedAmountText}</strong></div>
        </section>
        <FoodNutritionOverview item={log} amount={loggedAmountText} amountLabel="logged amount" />
      </>}

      {showIngredientEditor && ingredient && (
        <DetailSectionCard title="Edit Log">
          <ServingAmountSelector
            options={ingredientServingOptions}
            selectedOption={
              ingredientServingOptions.find(
                (option) =>
                  Number(option.amount) === Number(ingredientAmount) &&
                  normalizeUnit(option.unit) === normalizeUnit(ingredientUnit),
              )?.servingName
            }
            onOptionChange={(option) => {
              const nextAmount =
                option.custom && normalizeUnit(option.unit) === "grams"
                  ? ""
                  : option.amount;
              setIngredientAmount(String(nextAmount));
              setIngredientUnit(normalizeUnit(option.unit) || option.unit);
            }}
            amount={ingredientAmount}
            onAmountChange={setIngredientAmount}
            unit={ingredientUnit}
            onUnitChange={setIngredientUnit}
            extraUnits={ingredientServingUnits}
            nutrition={ingredientPreview}
            customLabel="Logged amount"
            amountLabel="Amount"
            conversionWarning=""
          />
          <div className="d-flex gap-2">
            <Button variant="success" onClick={handleSaveIngredient}>
              Save
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => requestNavigation(() => router.replace(logPageHref))}
            >
              Cancel
            </Button>
          </div>
        </DetailSectionCard>
      )}

      {showMealEditor && meal && (
        <DetailSectionCard title="Edit Log">
          <PortionSelector
            value={portion}
            onChange={({ portion: nextPortion, portionLabel: nextLabel }) => {
              setPortion(nextPortion);
              setPortionLabel(nextLabel || "");
            }}
          />
          <div className="d-flex gap-2">
            <Button variant="success" onClick={handleSaveMeal}>
              Save
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => requestNavigation(() => router.replace(logPageHref))}
            >
              Cancel
            </Button>
          </div>
        </DetailSectionCard>
      )}

      {editMode && !showIngredientEditor && !showMealEditor && (
        <Alert variant="info" className="mb-4">
          This logged item cannot be edited here.
        </Alert>
      )}

      {false && !editMode && loggedMealParts.length > 0 && (
        <DetailSectionCard title="Meal Parts" subtitle="Parts and amounts included in this log.">
          <div className="detail-meal-part-list">
            {loggedMealParts.map((component, index) => <DetailMealPartCard part={component} key={`${component.id || component.name}-${index}`} />)}
          </div>
        </DetailSectionCard>
      )}

      {false && !editMode && log.ingredients?.length > 0 && (
        <DetailSectionCard title="Ingredient Breakdown" subtitle="Ingredients included in this logged amount.">
          <div className="detail-ingredient-list">
            {log.ingredients.map((item, index) => <DetailIngredientRow ingredient={item} key={`${item.ingredientId || item.name}-${index}`} />)}
          </div>
        </DetailSectionCard>
      )}

      {!editMode && (
        <>
          {deleteError && <Alert variant="danger">{deleteError}</Alert>}
          <DetailDangerZone text="Once deleted, this logged food cannot be recovered." buttonLabel="Delete Logged Food" onDelete={() => setShowDeleteModal(true)} />
        </>
      )}
      </DetailPageShell>

      <ConfirmDeleteModal
        show={showDeleteModal}
        title="Delete Logged Food?"
        message="Are you sure you want to delete this logged food?"
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        confirmVariant="danger"
        confirmDisabled={isDeleting}
      />

      <UnsavedChangesModal
        show={showModal}
        onKeepEditing={keepEditing}
        onDiscardChanges={discardChanges}
      />
    </RouteGuard>
  );
}
