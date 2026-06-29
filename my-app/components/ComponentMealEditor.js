import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
} from "react-bootstrap";
import FoodImage from "./FoodImage";
import MealImageUpload from "./MealImageUpload";
import {
  buildOutsideFoodPayload,
  ManualNutritionCard,
  OutsideFoodToggle,
} from "./OutsideFoodControls";
import ServingAmountSelector from "./ServingAmountSelector";
import UnitSelect from "./UnitSelect";
import { addTotals, buildPreviewComponents } from "../lib/mealMath";
import {
  formatAmount,
  formatCalories,
  formatMacro,
  formatServingLabel,
  getIngredientServingNutrition,
} from "../lib/formatNutrition";
import {
  CATEGORY_LIBRARY,
  getCategoryClass,
  getCategoryIcon,
  getFoodImage,
} from "../lib/foodVisuals";
import { getCategoryLabel } from "../lib/categoryHelpers";
import {
  MEAL_CATEGORIES,
  normalizeMealCategory,
} from "../lib/mealCategoryHelpers";
import {
  calculateNutritionWithUnit,
  getConversionWarning,
  getIngredientServingOptions,
  getIngredientServingUnits,
  normalizeUnit,
} from "../lib/unitConverter";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import UnsavedChangesModal from "./UnsavedChangesModal";
import {
  clearMealDraft,
  getMealDraftKey,
  loadMealDraft,
  saveMealDraft,
} from "../lib/mealDraft";
import {
  createDefaultMealPart,
  createMealPartId,
  mealToMealParts,
  normalizeMealParts,
} from "../lib/mealParts";

function sameCategory(ingredient, categoryName) {
  const ingredientCategory = getCategoryLabel(
    ingredient.category || "Other",
  ).toLowerCase();
  const selectedCategory = getCategoryLabel(
    categoryName || "Other",
  ).toLowerCase();
  const knownCategories = CATEGORY_LIBRARY.map((item) =>
    item.name.toLowerCase(),
  );

  if (selectedCategory === "other") {
    return (
      ingredientCategory === "other" ||
      !knownCategories.includes(ingredientCategory)
    );
  }

  return ingredientCategory === selectedCategory;
}

function ingredientIdOf(item) {
  return String(
    item?.ingredientId?._id || item?.ingredientId || item?._id || "",
  );
}

function normalizeMealIngredient(item) {
  return {
    ingredientId: ingredientIdOf(item),
    quantityUsed: Number(
      item?.originalQuantityUsed ?? item?.quantityUsed ?? "",
    ),
    unit: item?.originalUnit || item?.unit || "grams",
  };
}

export function mealToEditorState(meal) {
  const mealParts = normalizeMealParts(
    mealToMealParts(meal).map((component) => ({
      ...component,
      ingredients: (component?.ingredients || [])
        .map(normalizeMealIngredient)
        .filter((item) => item.ingredientId),
    })),
    meal?.category || "Main",
  );

  return {
    meal: {
      name: meal?.name || "",
      category: meal?.category ? normalizeMealCategory(meal.category) : "",
      imageUrl: meal?.imageUrl || "",
      outsideFood: Boolean(meal?.outsideFood),
      restaurantName: meal?.restaurantName || "",
      totalCalories: meal?.totalCalories || "",
      totalProtein: meal?.totalProtein || "",
      totalCarbs: meal?.totalCarbs || "",
      totalFats: meal?.totalFats || "",
      totalSugar: meal?.totalSugar || "",
    },
    mealParts,
    components: mealParts,
  };
}

function componentIngredientLabel(count) {
  return `${count} ingredient${count === 1 ? "" : "s"}`;
}

function getUsedAmountLabel(originalItem, calculatedItem) {
  if (originalItem?.quantityUsed && originalItem?.unit) {
    return `${formatAmount(originalItem.quantityUsed)} ${originalItem.unit}`;
  }

  return `${formatAmount(calculatedItem?.quantityUsed || 0)}g`;
}

function findIngredient(ingredients, ingredientId) {
  return ingredients.find((ingredient) => ingredient._id === ingredientId);
}

export default function ComponentMealEditor({
  ingredients = [],
  initialMeal,
  initialMealParts = [],
  initialComponents = [],
  onSave,
  onSaveSuccess,
  onCancel,
  saveLabel = "Save Meal",
  saving = false,
  error = "",
  draftKey: draftKeyProp = "",
}) {
  const [meal, setMeal] = useState(
    initialMeal || { name: "", category: "", imageUrl: "" },
  );
  const initialParts = initialMealParts?.length
    ? initialMealParts
    : initialComponents;
  const [mealParts, setMealParts] = useState(
    initialParts?.length > 0
      ? normalizeMealParts(initialParts, initialMeal?.category || "Main")
      : [createDefaultMealPart()],
  );
  const [outsideFood, setOutsideFood] = useState(
    Boolean(initialMeal?.outsideFood),
  );
  const [manualNutrition, setManualNutrition] = useState({
    restaurantName: initialMeal?.restaurantName || "",
    calories: initialMeal?.totalCalories || "",
    protein: initialMeal?.totalProtein || "",
    carbs: initialMeal?.totalCarbs || "",
    fats: initialMeal?.totalFats || "",
    sugar: initialMeal?.totalSugar || "",
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [activeIngredient, setActiveIngredient] = useState(null);
  const [amountUsed, setAmountUsed] = useState("");
  const [unitUsed, setUnitUsed] = useState("grams");
  const [editingItem, setEditingItem] = useState(null);
  const [libraryError, setLibraryError] = useState("");
  const [librarySuccess, setLibrarySuccess] = useState("");
  const [activeMealPartId, setActiveMealPartId] = useState(
    initialParts?.[0]?.id || "",
  );
  const [draftState, setDraftState] = useState(null);
  const [showDraftCard, setShowDraftCard] = useState(false);
  const successTimerRef = useRef(null);
  const draftKey =
    draftKeyProp || getMealDraftKey({ mealId: initialMeal?._id || "" });
  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        meal: initialMeal || { name: "", category: "", imageUrl: "" },
        mealParts: initialParts || [],
        outsideFood: Boolean(initialMeal?.outsideFood),
        manualNutrition: {
          restaurantName: initialMeal?.restaurantName || "",
          calories: initialMeal?.totalCalories || "",
          protein: initialMeal?.totalProtein || "",
          carbs: initialMeal?.totalCarbs || "",
          fats: initialMeal?.totalFats || "",
          sugar: initialMeal?.totalSugar || "",
        },
      }),
    [initialMeal, initialParts],
  );
  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        meal,
        mealParts,
        outsideFood,
        manualNutrition,
      }),
    [meal, mealParts, outsideFood, manualNutrition],
  );
  const { showModal, keepEditing, discardChanges, saveDraft, markSaved } =
    useUnsavedChanges(initialSnapshot !== currentSnapshot && !saving, {
      onDiscard: () => clearMealDraft(draftKey),
      onSaveDraft: async () => {
        saveMealDraft(
          {
            meal,
            mealParts,
            components: mealParts,
            outsideFood,
            manualNutrition,
          },
          draftKey,
        );
        setDraftState({ meal, mealParts, outsideFood, manualNutrition });
      },
    });

  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const storedDraft = loadMealDraft(draftKey);
    setDraftState(storedDraft);
    setShowDraftCard(Boolean(storedDraft));
  }, [draftKey]);

  useEffect(() => {
    if (outsideFood) return;
    if (mealParts.length === 0) {
      const mainPart = createDefaultMealPart();
      setMealParts([mainPart]);
      setActiveMealPartId(mainPart.id);
      return;
    }
    if (!mealParts.some((part) => part.id === activeMealPartId)) {
      setActiveMealPartId(mealParts[0].id);
    }
  }, [activeMealPartId, mealParts, outsideFood]);

  const previewComponents = useMemo(
    () => buildPreviewComponents(ingredients, mealParts),
    [ingredients, mealParts],
  );
  const hasMealIngredients = previewComponents.some(
    (component) => component.ingredients.length > 0,
  );
  const mealTotals = addTotals(
    previewComponents.map((item) => item.nutritionTotals || {}),
  );
  const flatIngredients = mealParts.flatMap((part) => part.ingredients);
  const summaryRows = previewComponents.flatMap((componentPreview) => {
    const originalComponent = mealParts.find(
      (part) => part.id === componentPreview.id,
    );
    return componentPreview.ingredients.map((item, index) => ({
      ...item,
      amountLabel: getUsedAmountLabel(
        originalComponent?.ingredients[index],
        item,
      ),
    }));
  });
  const canSave =
    meal.name.trim() &&
    (outsideFood || flatIngredients.length > 0) &&
    !saving &&
    !imageUploading;
  const ingredientsInCategory = ingredients.filter((ingredient) =>
    sameCategory(ingredient, selectedCategory),
  );

  function resetLibraryForm() {
    setSelectedCategory("");
    setActiveIngredient(null);
    setAmountUsed("");
    setUnitUsed("grams");
    setEditingItem(null);
    setLibraryError("");
    setLibrarySuccess("");
  }

  function openLibrary(partId) {
    resetLibraryForm();
    setActiveMealPartId(partId || activeMealPartId || mealParts[0]?.id || "");
    setShowLibrary(true);
  }

  function closeLibrary() {
    setShowLibrary(false);
    resetLibraryForm();
  }

  function chooseLibraryCategory(categoryName) {
    setSelectedCategory(categoryName);
    setActiveIngredient(null);
    setAmountUsed("");
    setUnitUsed("grams");
    setLibraryError("");
    setLibrarySuccess("");
  }

  function addMealPart() {
    const nextPart = {
      id: createMealPartId(),
      name: "",
      category: "Other",
      ingredients: [],
    };
    setMealParts((current) => [...current, nextPart]);
    setActiveMealPartId(nextPart.id);
  }

  function removeMealPart(partId) {
    if (mealParts.length <= 1) return;
    setMealParts((current) => current.filter((part) => part.id !== partId));
    if (activeMealPartId === partId) setActiveMealPartId("");
  }

  function selectIngredient(ingredient) {
    const primaryServing = getIngredientServingOptions(ingredient)[0];
    setActiveIngredient(ingredient);
    setAmountUsed(primaryServing?.amount || ingredient.quantity || "");
    setUnitUsed(
      normalizeUnit(primaryServing?.unit || ingredient.unit || "grams") ||
        primaryServing?.unit ||
        ingredient.unit ||
        "grams",
    );
    setLibraryError("");
    setLibrarySuccess("");
  }

  function addIngredientToMeal() {
    const targetPartId = activeMealPartId || mealParts[0]?.id;
    const targetPart = mealParts.find((part) => part.id === targetPartId);
    const amount = Number(amountUsed);
    const ingredientName = activeIngredient?.name;

    if (!activeIngredient) {
      setLibraryError("Please choose an ingredient.");
      return;
    }

    if (!amount || amount <= 0) {
      setLibraryError("Amount used is required and must be greater than 0.");
      return;
    }

    if (!unitUsed) {
      setLibraryError("Please choose a unit.");
      return;
    }

    if (!targetPart) {
      setLibraryError("Please choose a meal part.");
      return;
    }

    const newItem = {
      ingredientId: activeIngredient._id,
      quantityUsed: amount,
      unit: unitUsed || activeIngredient.unit || "grams",
    };

    setMealParts((currentParts) => {
      const nextParts = currentParts.map((part) => ({
        ...part,
        ingredients:
          editingItem && part.id === editingItem.partId
            ? part.ingredients.filter(
                (item, index) => index !== editingItem.ingredientIndex,
              )
            : part.ingredients,
      }));

      const targetIndex = nextParts.findIndex(
        (part) => part.id === targetPartId,
      );
      if (targetIndex < 0) return currentParts;

      nextParts[targetIndex] = {
        ...nextParts[targetIndex],
        ingredients: [...nextParts[targetIndex].ingredients, newItem],
      };

      return nextParts;
    });

    setMessage("");
    setLibraryError("");
    setLibrarySuccess(
      `${ingredientName} ${editingItem ? "updated in" : "added to"} ${targetPart.name.trim() || "this meal part"}.`,
    );
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setLibrarySuccess(""), 2500);
    setActiveIngredient(null);
    setAmountUsed("");
    setUnitUsed("grams");
    setEditingItem(null);
  }

  function removeIngredient(partId, ingredientIndex) {
    setMealParts((currentParts) =>
      currentParts.map((part) => {
        if (part.id !== partId) return part;
        return {
          ...part,
          ingredients: part.ingredients.filter(
            (item, index) => index !== ingredientIndex,
          ),
        };
      }),
    );
  }

  function renameMealPart(partId, name) {
    setMealParts((currentParts) =>
      currentParts.map((part) =>
        part.id === partId
          ? { ...part, name, category: name.trim() || "Other" }
          : part,
      ),
    );
  }

  function editIngredient(partId, ingredientIndex) {
    const part = mealParts.find((item) => item.id === partId);
    const item = part?.ingredients[ingredientIndex];
    const ingredient = ingredients.find(
      (ingredientItem) => ingredientItem._id === item?.ingredientId,
    );
    if (!part || !item || !ingredient) return;

    setSelectedCategory(
      getCategoryLabel(ingredient.category || part.name || "Other"),
    );
    setActiveMealPartId(partId);
    setActiveIngredient(ingredient);
    setAmountUsed(item.quantityUsed);
    setUnitUsed(
      normalizeUnit(item.unit || ingredient.unit || "grams") ||
        item.unit ||
        ingredient.unit ||
        "grams",
    );
    setEditingItem({ partId, ingredientIndex });
    setShowLibrary(true);
  }

  async function saveMeal() {
    if (!canSave) {
      setMessage(
        outsideFood
          ? "Please enter a meal name."
          : "Please enter a meal name and add at least one ingredient.",
      );
      return;
    }

    const outsideFoodPayload = buildOutsideFoodPayload(manualNutrition);
    const savedMealParts = mealParts.map((part, index) => ({
      ...part,
      name: part.name.trim() || `Meal Part ${index + 1}`,
      category: part.name.trim() || "Other",
    }));
    try {
      await onSave({
        ...meal,
        category: meal.category
          ? normalizeMealCategory(meal.category)
          : "Other",
        outsideFood,
        ...(outsideFood
          ? outsideFoodPayload
          : {
              ingredients: flatIngredients,
              components: savedMealParts,
              mealParts: savedMealParts,
            }),
      });
    } catch {
      return;
    }
    markSaved();
    clearMealDraft(draftKey);
    if (onSaveSuccess) {
      await onSaveSuccess();
    }
  }

  function restoreDraft() {
    if (!draftState) return;
    setMeal({
      ...(draftState.meal || { name: "", category: "", imageUrl: "" }),
      category: draftState.meal?.category
        ? normalizeMealCategory(draftState.meal.category)
        : "",
    });
    const restoredMealParts = normalizeMealParts(
      draftState.mealParts || draftState.components || [],
      draftState.meal?.category || "Main",
    );
    setMealParts(restoredMealParts);
    setOutsideFood(Boolean(draftState.outsideFood));
    setManualNutrition({
      restaurantName: draftState.manualNutrition?.restaurantName || "",
      calories: draftState.manualNutrition?.calories || "",
      protein: draftState.manualNutrition?.protein || "",
      carbs: draftState.manualNutrition?.carbs || "",
      fats: draftState.manualNutrition?.fats || "",
      sugar: draftState.manualNutrition?.sugar || "",
    });
    setActiveMealPartId(restoredMealParts[0]?.id || "");
    setShowDraftCard(false);
  }

  function deleteDraft() {
    clearMealDraft(draftKey);
    setDraftState(null);
    setShowDraftCard(false);
  }

  return (
    <>
      {message && <Alert variant="warning">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      {showDraftCard && draftState && (
        <Card className="draft-restore-card mb-4">
          <Card.Body className="draft-restore-card-body">
            <div>
              <strong>Continue draft</strong>
              <p className="text-muted mb-0">
                A saved meal draft was found. Restore it or delete it.
              </p>
            </div>
            <div className="draft-restore-card-actions">
              <Button variant="success" size="sm" onClick={restoreDraft}>
                Continue draft
              </Button>
              <Button variant="outline-danger" size="sm" onClick={deleteDraft}>
                Delete draft
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      <Card className="page-card p-4 mb-4 meal-setup-card">
        <Row className="g-4 align-items-stretch">
          <Col lg={8}>
            <div>
              <h4 className="mb-1">Meal Setup</h4>
              <p className="text-muted mb-0">
                Update the meal details, then edit ingredients inside each
                group.
              </p>
            </div>
            <Row className="mt-3">
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Meal Name</Form.Label>
                  <Form.Control
                    value={meal.name}
                    onChange={(e) => setMeal({ ...meal, name: e.target.value })}
                    placeholder="Fajitas"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Meal Category</Form.Label>
                  <Form.Select
                    value={meal.category}
                    onChange={(e) =>
                      setMeal({ ...meal, category: e.target.value })
                    }
                  >
                    <option value="">Choose meal category</option>
                    {MEAL_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Image URL</Form.Label>
                  <Form.Control
                    value={meal.imageUrl}
                    onChange={(e) =>
                      setMeal({ ...meal, imageUrl: e.target.value })
                    }
                    placeholder="https://example.com/meal.jpg"
                  />
                  <MealImageUpload
                    imageUrl={meal.imageUrl}
                    onUploaded={(imageUrl) => setMeal({ ...meal, imageUrl })}
                    onUploadingChange={setImageUploading}
                  />
                </Form.Group>
              </Col>
            </Row>
            <OutsideFoodToggle
              checked={outsideFood}
              onChange={setOutsideFood}
            />
          </Col>
          <Col lg={4}>
            <div className="meal-image-preview">
              <FoodImage
                src={meal.imageUrl}
                alt={meal.name || "Meal preview"}
                category={meal.category || "Other"}
                className="meal-preview-img"
                placeholderClassName="meal-preview-placeholder"
              />
            </div>
          </Col>
        </Row>
      </Card>

      {outsideFood && (
        <ManualNutritionCard
          values={manualNutrition}
          onChange={setManualNutrition}
        />
      )}

      {!outsideFood && (
        <div className="meal-builder-toolbar">
          <div>
            <h4>Meal Parts</h4>
            <p className="text-muted">
              Build the meal as separate parts like Flatbread, Eggs, Avocado,
              Pasta, Meat sauce, or Toppings.
            </p>
          </div>
        </div>
      )}

      {!outsideFood && previewComponents.length > 0 && (
        <Row className="g-4 mb-4">
          {previewComponents.map((componentPreview) => {
            const originalComponent = mealParts.find(
              (part) => part.id === componentPreview.id,
            );
            const componentCategory =
              componentPreview.category || componentPreview.name;
            const isActivePart = activeMealPartId === componentPreview.id;

            return (
              <Col lg={6} key={componentPreview.id}>
                <Card
                  className={`page-card component-builder-card ${isActivePart ? "active" : ""}`}
                >
                  <Card.Body>
                    <div className="component-card-header">
                      <div className="component-card-title-block">
                        <div className="component-card-eyebrow">Meal Part</div>
                        <div className="component-name-row">
                          <span className="component-title-emoji">
                            {getCategoryIcon(componentCategory)}
                          </span>
                          <Form.Control
                            value={componentPreview.name}
                            placeholder={
                              componentPreview.name === "Main"
                                ? "Main"
                                : "Flatbread"
                            }
                            onChange={(e) =>
                              renameMealPart(
                                componentPreview.id,
                                e.target.value,
                              )
                            }
                            className="component-name-input"
                          />
                        </div>
                        <div className="component-card-meta">
                          {componentIngredientLabel(
                            componentPreview.ingredients.length,
                          )}{" "}
                          - {formatAmount(componentPreview.totalWeight)}g total
                        </div>
                      </div>
                      <div className="component-card-actions">
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => openLibrary(componentPreview.id)}
                        >
                          Add Ingredient
                        </Button>
                        {mealParts.length > 1 && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => removeMealPart(componentPreview.id)}
                          >
                            Remove Part
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="component-ingredient-list">
                      {componentPreview.ingredients.length === 0 && (
                        <div className="component-empty-state">
                          <p className="text-muted mb-0">
                            No ingredients in this meal part yet.
                          </p>
                        </div>
                      )}
                      {componentPreview.ingredients.map((item, index) => {
                        const originalItem =
                          originalComponent?.ingredients[index];
                        const fullIngredient = findIngredient(
                          ingredients,
                          item.ingredientId,
                        );
                        return (
                          <div
                            className="component-ingredient-row"
                            key={`${item.ingredientId}-${index}`}
                          >
                            <FoodImage
                              src={getFoodImage(fullIngredient)}
                              alt={item.name}
                              category={
                                fullIngredient?.category || componentCategory
                              }
                              className="component-ingredient-thumb"
                              placeholderClassName="component-ingredient-placeholder"
                            />
                            <div className="component-ingredient-main">
                              <div className="component-ingredient-name">
                                {item.name}
                              </div>
                              <div className="component-ingredient-meta">
                                {formatAmount(originalItem?.quantityUsed)}{" "}
                                {originalItem?.unit}
                              </div>
                              <div className="component-ingredient-nutrition">
                                {formatCalories(item.calories)} cal -{" "}
                                {formatMacro(item.protein)}g protein
                              </div>
                            </div>
                            <div className="ingredient-actions">
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() =>
                                  editIngredient(componentPreview.id, index)
                                }
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() =>
                                  removeIngredient(componentPreview.id, index)
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {!outsideFood && (
        <div className="meal-parts-add-row">
          <Button variant="outline-success" onClick={addMealPart}>
            Add Meal Part
          </Button>
        </div>
      )}

      {!outsideFood && hasMealIngredients && (
        <Card className="page-card builder-summary-card">
          <Card.Body>
            <div className="builder-summary-header">
              <h4>Nutrition Summary</h4>
              <p className="text-muted">
                Calculated from the ingredient amounts in this meal.
              </p>
            </div>

            <div className="builder-summary-table-wrap">
              <table className="builder-summary-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Amount</th>
                    <th>Calories</th>
                    <th>Protein</th>
                    <th>Carbs</th>
                    <th>Fats</th>
                    <th>Sugar</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((item, index) => (
                    <tr key={`${item.ingredientId}-${index}`}>
                      <td>{item.name}</td>
                      <td>{item.amountLabel}</td>
                      <td>{formatCalories(item.calories)}</td>
                      <td>{formatMacro(item.protein)}g</td>
                      <td>{formatMacro(item.carbs)}g</td>
                      <td>{formatMacro(item.fats)}g</td>
                      <td>{formatMacro(item.sugar)}g</td>
                    </tr>
                  ))}
                  <tr className="summary-total-row">
                    <td>Total</td>
                    <td>
                      {formatAmount(
                        previewComponents.reduce(
                          (sum, item) => sum + Number(item.totalWeight || 0),
                          0,
                        ),
                      )}
                      g
                    </td>
                    <td>{formatCalories(mealTotals.calories)}</td>
                    <td>{formatMacro(mealTotals.protein)}g</td>
                    <td>{formatMacro(mealTotals.carbs)}g</td>
                    <td>{formatMacro(mealTotals.fats)}g</td>
                    <td>{formatMacro(mealTotals.sugar)}g</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="builder-summary-mobile">
              {summaryRows.map((item, index) => (
                <div
                  className="builder-summary-mobile-card"
                  key={`${item.ingredientId}-mobile-${index}`}
                >
                  <strong>{item.name}</strong>
                  <span>Amount: {item.amountLabel}</span>
                  <span>Calories: {formatCalories(item.calories)}</span>
                  <span>Protein: {formatMacro(item.protein)}g</span>
                  <span>Carbs: {formatMacro(item.carbs)}g</span>
                  <span>Fats: {formatMacro(item.fats)}g</span>
                  <span>Sugar: {formatMacro(item.sugar)}g</span>
                </div>
              ))}
              <div className="builder-summary-mobile-card total">
                <strong>Total</strong>
                <span>
                  Amount:{" "}
                  {formatAmount(
                    previewComponents.reduce(
                      (sum, item) => sum + Number(item.totalWeight || 0),
                      0,
                    ),
                  )}
                  g
                </span>
                <span>Calories: {formatCalories(mealTotals.calories)}</span>
                <span>Protein: {formatMacro(mealTotals.protein)}g</span>
                <span>Carbs: {formatMacro(mealTotals.carbs)}g</span>
                <span>Fats: {formatMacro(mealTotals.fats)}g</span>
                <span>Sugar: {formatMacro(mealTotals.sugar)}g</span>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      <div className="meal-save-actions">
        <Button
          variant="outline-secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button variant="success" onClick={saveMeal} disabled={!canSave}>
          {imageUploading
            ? "Uploading photo..."
            : saving
              ? "Saving..."
              : saveLabel}
        </Button>
      </div>

      <IngredientLibraryModal
        show={showLibrary}
        onHide={closeLibrary}
        ingredients={ingredients}
        selectedCategory={selectedCategory}
        setSelectedCategory={chooseLibraryCategory}
        ingredientsInCategory={ingredientsInCategory}
        activeIngredient={activeIngredient}
        selectIngredient={selectIngredient}
        amountUsed={amountUsed}
        setAmountUsed={setAmountUsed}
        unitUsed={unitUsed}
        setUnitUsed={setUnitUsed}
        onAdd={addIngredientToMeal}
        isEditing={!!editingItem}
        libraryError={libraryError}
        librarySuccess={librarySuccess}
      />
      <UnsavedChangesModal
        show={showModal}
        onKeepEditing={keepEditing}
        onDiscardChanges={discardChanges}
        onSaveDraft={saveDraft}
      />
    </>
  );
}

function IngredientLibraryModal({
  show,
  onHide,
  ingredients,
  selectedCategory,
  setSelectedCategory,
  ingredientsInCategory,
  activeIngredient,
  selectIngredient,
  amountUsed,
  setAmountUsed,
  unitUsed,
  setUnitUsed,
  onAdd,
  isEditing,
  libraryError,
  librarySuccess,
}) {
  const targetGroup = selectedCategory || "this category";
  const selectedPreview = activeIngredient
    ? calculateNutritionWithUnit(Number(amountUsed), unitUsed, activeIngredient)
    : null;
  const conversionWarning = activeIngredient
    ? getConversionWarning(amountUsed, unitUsed, activeIngredient)
    : "";
  const servingOptions = useMemo(
    () => getIngredientServingOptions(activeIngredient),
    [activeIngredient],
  );
  const servingUnits = useMemo(
    () => getIngredientServingUnits(activeIngredient),
    [activeIngredient],
  );
  const addIngredientHref = {
    pathname: "/ingredients/add",
    query: { category: selectedCategory },
  };
  function handleSelectedIngredientSubmit(event) {
    event.preventDefault();
    if (!activeIngredient) return;
    onAdd();
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      dialogClassName="ingredient-library-dialog"
    >
      <Modal.Header closeButton>
        <Modal.Title>Ingredient Library</Modal.Title>
      </Modal.Header>
      <Modal.Body className="ingredient-library-body">
        {librarySuccess && (
          <Alert variant="success" className="library-toast-alert">
            {librarySuccess}
          </Alert>
        )}

        {!selectedCategory && (
          <>
            <p className="text-muted ingredient-library-helper">
              Choose a category to browse ingredients from your inventory.
            </p>
            <Row className="g-3 ingredient-library-category-grid">
              {CATEGORY_LIBRARY.map((category) => {
                const count = ingredients.filter((ingredient) =>
                  sameCategory(ingredient, category.name),
                ).length;
                return (
                  <Col md={4} lg={3} key={category.name}>
                    <Card
                      className="h-100 border-0 shadow-sm category-card"
                      role="button"
                      onClick={() => setSelectedCategory(category.name)}
                    >
                      <Card.Body>
                        <div
                          className={`category-icon ${getCategoryClass(category.name)}`}
                        >
                          {category.icon}
                        </div>
                        <h5>{category.name}</h5>
                        <p className="text-muted small mb-2">
                          {category.description}
                        </p>
                        <Badge bg={count > 0 ? "success" : "secondary"}>
                          {count} ingredients
                        </Badge>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </>
        )}

        {selectedCategory && (
          <>
            <div className="ingredient-library-category-header">
              <div>
                <h4 className="mb-0">{selectedCategory}</h4>
                <div className="text-muted small">
                  Ingredients added here will go into the {selectedCategory}{" "}
                  component.
                </div>
              </div>
              <div className="ingredient-library-actions">
                <Button as={Link} href={addIngredientHref} variant="success">
                  + Add New
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={() => setSelectedCategory("")}
                >
                  Back
                </Button>
              </div>
            </div>

            {ingredientsInCategory.length === 0 && (
              <Card className="empty-category-card">
                <Card.Body>
                  <h5>No {selectedCategory} yet.</h5>
                  <p className="text-muted">
                    Add one now, then come back and select it for this meal.
                  </p>
                </Card.Body>
              </Card>
            )}

            {ingredientsInCategory.length > 0 && (
              <div className="ingredient-library-picker">
                <div className="ingredient-library-list">
                  {ingredientsInCategory.map((ingredient) => {
                    const nutrition = getIngredientServingNutrition(ingredient);
                    const isActive = activeIngredient?._id === ingredient._id;
                    return (
                      <Card
                        className={`ingredient-library-card ${isActive ? "selected" : ""}`}
                        role="button"
                        onClick={() => selectIngredient(ingredient)}
                        key={ingredient._id}
                      >
                        <div className="ingredient-library-row">
                          <FoodImage
                            src={getFoodImage(ingredient)}
                            alt={ingredient.name}
                            category={getCategoryLabel(
                              ingredient.category || selectedCategory,
                            )}
                            className="ingredient-library-img"
                            placeholderClassName="ingredient-library-placeholder"
                          />
                          <Card.Body className="ingredient-library-row-body">
                            <div className="ingredient-library-row-top">
                              <h5>{ingredient.name}</h5>
                              <Badge className="soft-pill soft-pill-beige">
                                {getCategoryLabel(ingredient.category)}
                              </Badge>
                            </div>
                            <div className="ingredient-library-row-meta">
                              {formatServingLabel(ingredient)}
                            </div>
                            <div className="ingredient-library-row-nutrition">
                              {formatCalories(nutrition.calories)} cal ·{" "}
                              {formatMacro(nutrition.protein)}g protein
                            </div>
                          </Card.Body>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <div className="selected-ingredient-panel">
                  <h5>
                    {activeIngredient
                      ? activeIngredient.name
                      : "Choose an ingredient"}
                  </h5>
                  {libraryError && (
                    <Alert variant="warning" className="library-status-alert">
                      {libraryError}
                    </Alert>
                  )}
                  {activeIngredient ? (
                    <>
                      <Form onSubmit={handleSelectedIngredientSubmit}>
                        <ServingAmountSelector
                          options={servingOptions}
                          selectedOption={
                            servingOptions.find(
                              (option) =>
                                Number(option.amount) === Number(amountUsed) &&
                                normalizeUnit(option.unit) ===
                                  normalizeUnit(unitUsed),
                            )?.servingName
                          }
                          onOptionChange={(option) => {
                            const nextAmount =
                              option.custom &&
                              normalizeUnit(option.unit) === "grams"
                                ? ""
                                : option.amount;
                            setAmountUsed(String(nextAmount));
                            setUnitUsed(
                              normalizeUnit(option.unit) || option.unit,
                            );
                          }}
                          amount={amountUsed}
                          onAmountChange={setAmountUsed}
                          unit={unitUsed}
                          onUnitChange={setUnitUsed}
                          extraUnits={servingUnits}
                          amountLabel="Amount used"
                          nutrition={selectedPreview}
                          conversionWarning={conversionWarning}
                          className="selected-ingredient-amount-selector"
                        />

                        <Button type="submit" variant="success">
                          {isEditing
                            ? `Update in ${targetGroup}`
                            : `Add to ${targetGroup}`}
                        </Button>
                      </Form>
                    </>
                  ) : (
                    <p className="text-muted mb-0">
                      Select an ingredient card to enter the amount used.
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}
