import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
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
import AppBackButton from "../components/AppBackButton";
import PageHeader from "../components/PageHeader";
import RouteGuard from "../components/RouteGuard";
import ServingAmountSelector from "../components/ServingAmountSelector";
import SmartFoodSuggestionCard from "../components/SmartFoodSuggestionCard";
import UnitSelect from "../components/UnitSelect";
import FoodImage from "../components/FoodImage";
import MealImageUpload from "../components/MealImageUpload";
import {
  buildOutsideFoodPayload,
  ManualNutritionCard,
  OutsideFoodToggle,
} from "../components/OutsideFoodControls";
import { ErrorMessage, LoadingMessage } from "../components/StateMessage";
import { apiFetch } from "../lib/api";
import {
  clearMealDraft,
  getMealDraftKey,
  hasMealDraftContent,
  loadMealDraft,
  saveMealDraft,
} from "../lib/mealDraft";
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
import { getSmartFoodSuggestion } from "../lib/smartFoodBuilder";
import {
  calculateNutritionWithUnit,
  getConversionWarning,
  getIngredientServingOptions,
  getIngredientServingUnits,
  normalizeUnit,
} from "../lib/unitConverter";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import UnsavedChangesModal from "../components/UnsavedChangesModal";
import {
  createDefaultMealPart,
  MEAL_PART_NAME_OPTIONS,
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

function findIngredient(ingredients, ingredientId) {
  return ingredients.find((ingredient) => ingredient._id === ingredientId);
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

export default function CreateMealComponentPage() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data: ingredients, error } = useSWR("/api/ingredients");
  const [meal, setMeal] = useState({ name: "", category: "", imageUrl: "" });
  const [imageUploading, setImageUploading] = useState(false);
  const [components, setComponents] = useState([createDefaultMealPart()]);
  const [outsideFood, setOutsideFood] = useState(false);
  const [manualNutrition, setManualNutrition] = useState({
    restaurantName: "",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    sugar: "",
  });
  const [message, setMessage] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [activeIngredient, setActiveIngredient] = useState(null);
  const [amountUsed, setAmountUsed] = useState("");
  const [unitUsed, setUnitUsed] = useState("grams");
  const [editingItem, setEditingItem] = useState(null);
  const [libraryError, setLibraryError] = useState("");
  const [librarySuccess, setLibrarySuccess] = useState("");
  const successTimerRef = useRef(null);
  const [draftReady, setDraftReady] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [showClearDraft, setShowClearDraft] = useState(false);
  const [createdOutsideFoodMeal, setCreatedOutsideFoodMeal] = useState(null);
  const [showAddTodayPrompt, setShowAddTodayPrompt] = useState(false);
  const [addTodaySaving, setAddTodaySaving] = useState(false);
  const [addTodaySuccess, setAddTodaySuccess] = useState("");
  const [addTodayError, setAddTodayError] = useState("");
  const [selectedMealPart, setSelectedMealPart] = useState("Main");

  useEffect(() => {
    const createDraft = loadMealDraft(getMealDraftKey({ outsideFood: false }));
    const outsideFoodDraft = loadMealDraft(
      getMealDraftKey({ outsideFood: true }),
    );
    const draft = [createDraft, outsideFoodDraft]
      .filter(Boolean)
      .sort(
        (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
      )[0];
    if (draft) {
      setMeal({
        ...(draft.meal || { name: "", category: "", imageUrl: "" }),
        category: draft.meal?.category
          ? normalizeMealCategory(draft.meal.category)
          : "",
      });
      setComponents(
        draft.outsideFood
          ? []
          : normalizeMealParts(
              draft.components || [],
              draft.meal?.category || "Main",
            ),
      );
      setOutsideFood(Boolean(draft.outsideFood));
      setManualNutrition({
        restaurantName: draft.manualNutrition?.restaurantName || "",
        calories: draft.manualNutrition?.calories || "",
        protein: draft.manualNutrition?.protein || "",
        carbs: draft.manualNutrition?.carbs || "",
        fats: draft.manualNutrition?.fats || "",
        sugar: draft.manualNutrition?.sugar || "",
      });
      setSelectedMealPart(draft.components?.[0]?.name || "Main");
      setShowDraftBanner(true);
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;

    // Keep the unfinished meal safe when the user refreshes or leaves to add an ingredient.
    saveMealDraft(
      { meal, components, outsideFood, manualNutrition },
      getMealDraftKey({ outsideFood }),
    );
  }, [draftReady, meal, components, outsideFood, manualNutrition]);

  useEffect(() => {
    if (outsideFood || components.length > 0) return;
    setComponents([createDefaultMealPart()]);
    setSelectedMealPart("Main");
  }, [components.length, outsideFood]);

  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    },
    [],
  );

  const previewComponents = useMemo(
    () => (ingredients ? buildPreviewComponents(ingredients, components) : []),
    [ingredients, components],
  );
  const hasMealIngredients = previewComponents.some(
    (component) => component.ingredients.length > 0,
  );
  const mealTotals = addTotals(
    previewComponents.map((item) => item.nutritionTotals || {}),
  );
  const flatIngredients = components.flatMap(
    (component) => component.ingredients,
  );
  const summaryRows = previewComponents.flatMap((componentPreview) => {
    const originalComponent = components.find(
      (component) => component.name === componentPreview.name,
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
    !imageUploading;
  const smartMealQuery =
    typeof router.query.smartMeal === "string"
      ? router.query.smartMeal
      : typeof router.query.name === "string"
        ? router.query.name
        : "";
  const smartMealSuggestion = useMemo(
    () => getSmartFoodSuggestion(smartMealQuery),
    [smartMealQuery],
  );
  const hasLibraryDraft = Boolean(
    showLibrary &&
      (selectedCategory ||
        activeIngredient ||
        amountUsed ||
        unitUsed !== "grams" ||
        editingItem),
  );
  const hasUnsavedChanges =
    draftReady &&
    (hasMealDraftContent({ meal, components, outsideFood, manualNutrition }) ||
      hasLibraryDraft);
  const { showModal, keepEditing, discardChanges, markSaved } =
    useUnsavedChanges(hasUnsavedChanges, {
      onDiscard: () => {
        clearMealDraft(getMealDraftKey({ outsideFood }));
        clearMealDraft(getMealDraftKey({ outsideFood: !outsideFood }));
      },
    });

  function resetLibraryForm() {
    setSelectedCategory("");
    setActiveIngredient(null);
    setAmountUsed("");
    setUnitUsed("grams");
    setEditingItem(null);
    setLibraryError("");
    setLibrarySuccess("");
  }

  function ensureMealPart(partName = "") {
    const cleanName = partName.trim();
    if (!cleanName) return "";
    setComponents((current) => {
      if (current.some((component) => component.name === cleanName))
        return current;
      return [
        ...current,
        { name: cleanName, category: cleanName, ingredients: [] },
      ];
    });
    return cleanName;
  }

  function openLibrary(partName = "") {
    resetLibraryForm();
    const targetPart =
      partName || selectedMealPart || components[0]?.name || "";
    if (targetPart) {
      setSelectedMealPart(targetPart);
      ensureMealPart(targetPart);
    }
    setShowLibrary(true);
  }

  function saveCurrentDraft() {
    saveMealDraft(
      { meal, components, outsideFood, manualNutrition },
      getMealDraftKey({ outsideFood }),
    );
  }

  function resetDraft() {
    clearMealDraft(getMealDraftKey({ outsideFood }));
    clearMealDraft(getMealDraftKey({ outsideFood: !outsideFood }));
    setMeal({ name: "", category: "", imageUrl: "" });
    setComponents([createDefaultMealPart()]);
    setOutsideFood(false);
    setManualNutrition({
      restaurantName: "",
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
      sugar: "",
    });
    setMessage("");
    resetLibraryForm();
    setSelectedMealPart("Main");
    setShowDraftBanner(false);
    setShowClearDraft(false);
  }

  function closeLibrary() {
    setShowLibrary(false);
    resetLibraryForm();
  }

  function applySmartMealSuggestion() {
    if (!smartMealSuggestion) return;

    setMeal((currentMeal) => ({
      ...currentMeal,
      name: currentMeal.name || smartMealSuggestion.name,
      category:
        currentMeal.category ||
        normalizeMealCategory(smartMealSuggestion.category || "Other"),
    }));
    setMessage(
      "Review the suggested components, then add matching ingredients from your library before saving.",
    );
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
    const nextName =
      MEAL_PART_NAME_OPTIONS.find(
        (name) => !components.some((component) => component.name === name),
      ) || `Meal Part ${components.length + 1}`;
    setComponents((current) => [
      ...current,
      { name: nextName, category: nextName, ingredients: [] },
    ]);
    setSelectedMealPart(nextName);
  }

  function removeMealPart(partName) {
    if (components.length <= 1) return;
    setComponents((current) =>
      current.filter((component) => component.name !== partName),
    );
    setSelectedMealPart((current) => (current === partName ? "" : current));
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

  function groupNameFromForm() {
    return selectedMealPart || components[0]?.name || "Main";
  }

  function addIngredientToMeal() {
    const groupName = groupNameFromForm();
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

    if (!groupName) {
      setLibraryError("Please choose a category.");
      return;
    }

    const newItem = {
      ingredientId: activeIngredient._id,
      quantityUsed: amount,
      unit: unitUsed || activeIngredient.unit || "grams",
    };

    if (!selectedMealPart) {
      setSelectedMealPart(groupName);
    }

    setComponents((currentComponents) => {
      let nextComponents = currentComponents.map((component) => ({
        ...component,
        ingredients:
          editingItem && component.name === editingItem.componentName
            ? component.ingredients.filter(
                (item, index) => index !== editingItem.ingredientIndex,
              )
            : component.ingredients,
      }));

      const existingIndex = nextComponents.findIndex(
        (component) => component.name === groupName,
      );
      if (existingIndex >= 0) {
        nextComponents[existingIndex] = {
          ...nextComponents[existingIndex],
          ingredients: [...nextComponents[existingIndex].ingredients, newItem],
        };
      } else {
        nextComponents.push({
          name: groupName,
          category: groupName,
          ingredients: [newItem],
        });
      }

      return nextComponents;
    });

    setMessage("");
    setLibraryError("");
    setLibrarySuccess(`${ingredientName} added to ${groupName}.`);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setLibrarySuccess(""), 2500);
    setActiveIngredient(null);
    setAmountUsed("");
    setUnitUsed("grams");
    setEditingItem(null);
  }

  function removeIngredient(componentName, ingredientIndex) {
    setComponents((currentComponents) =>
      currentComponents.map((component) => {
        if (component.name !== componentName) return component;
        return {
          ...component,
          ingredients: component.ingredients.filter(
            (item, index) => index !== ingredientIndex,
          ),
        };
      }),
    );
  }

  function renameComponent(oldName, newName) {
    const cleanName = newName.trim();
    if (!cleanName) return;

    setComponents(
      components.map((component) =>
        component.name === oldName
          ? { ...component, name: cleanName, category: cleanName }
          : component,
      ),
    );
    if (selectedMealPart === oldName) {
      setSelectedMealPart(cleanName);
    }
  }

  function editIngredient(componentName, ingredientIndex) {
    const component = components.find((item) => item.name === componentName);
    const item = component?.ingredients[ingredientIndex];
    const ingredient = ingredients.find(
      (ingredientItem) => ingredientItem._id === item?.ingredientId,
    );
    if (!component || !item || !ingredient) return;

    setSelectedCategory(
      getCategoryLabel(ingredient.category || componentName || "Other"),
    );
    setSelectedMealPart(componentName);
    setActiveIngredient(ingredient);
    setAmountUsed(item.quantityUsed);
    setUnitUsed(
      normalizeUnit(item.unit || ingredient.unit || "grams") ||
        item.unit ||
        ingredient.unit ||
        "grams",
    );
    setEditingItem({ componentName, ingredientIndex });
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
    const createdMeal = await apiFetch("/api/meals", {
      method: "POST",
      body: JSON.stringify({
        ...meal,
        category: meal.category
          ? normalizeMealCategory(meal.category)
          : "Other",
        outsideFood,
        ...(outsideFood
          ? outsideFoodPayload
          : {
              ingredients: flatIngredients,
              components,
              mealParts: components,
            }),
      }),
    });
    markSaved();
    clearMealDraft(getMealDraftKey({ outsideFood }));
    clearMealDraft(getMealDraftKey({ outsideFood: !outsideFood }));
    if (outsideFood) {
      setCreatedOutsideFoodMeal(createdMeal);
      setShowAddTodayPrompt(true);
      return;
    }
    router.push("/meals");
  }

  function closeAddTodayPrompt() {
    setShowAddTodayPrompt(false);
    router.push("/meals");
  }

  async function addCreatedOutsideFoodToToday() {
    if (addTodaySaving || addTodaySuccess || !createdOutsideFoodMeal?._id)
      return;

    setAddTodaySaving(true);
    setAddTodayError("");
    try {
      await apiFetch("/api/tracker/log", {
        method: "POST",
        body: JSON.stringify({
          mealId: createdOutsideFoodMeal._id,
          servings: 1,
        }),
      });
      await mutate("/api/tracker/today");
      await mutate(
        (key) => typeof key === "string" && key.startsWith("/api/tracker/week"),
      );
      setAddTodaySuccess("Meal added");
      window.setTimeout(() => router.push("/meals"), 900);
    } catch (err) {
      setAddTodayError(err.message || "Could not add meal.");
    } finally {
      setAddTodaySaving(false);
    }
  }

  const ingredientsInCategory =
    ingredients?.filter((ingredient) =>
      sameCategory(ingredient, selectedCategory),
    ) || [];

  return (
    <RouteGuard>
      <AppBackButton href="/meals" label="Back to Meals" />
      <PageHeader
        title="Build Component Meal"
        text="Create one meal and organize its ingredients into simple groups."
      />
      {error && <ErrorMessage text="Failed to load ingredients." />}
      {!ingredients && !error && (
        <LoadingMessage text="Loading ingredients..." />
      )}

      {ingredients && (
        <>
          {message && <Alert variant="warning">{message}</Alert>}

          <SmartFoodSuggestionCard
            suggestion={smartMealSuggestion}
            primaryLabel="Use meal name"
            onPrimary={applySmartMealSuggestion}
          />

          <Card className="page-card p-4 mb-4 meal-setup-card">
            <Row className="g-4 align-items-stretch">
              <Col lg={8}>
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                  <div>
                    <h4 className="mb-1">Meal Setup</h4>
                    <p className="text-muted mb-0">
                      Name the meal first, then add ingredients into groups.
                    </p>
                  </div>
                  {hasMealDraftContent({
                    meal,
                    components,
                    outsideFood,
                    manualNutrition,
                  }) && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => setShowClearDraft(true)}
                    >
                      Clear Draft
                    </Button>
                  )}
                </div>
                <Row className="mt-3">
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Meal Name</Form.Label>
                      <Form.Control
                        value={meal.name}
                        onChange={(e) =>
                          setMeal({ ...meal, name: e.target.value })
                        }
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
                        onUploaded={(imageUrl) =>
                          setMeal({ ...meal, imageUrl })
                        }
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

          {showDraftBanner && (
            <Alert variant="success" className="draft-saved-alert">
              <div>
                <strong>You have an unsaved meal draft.</strong>
                <span> Draft saved automatically.</span>
              </div>
              <div className="draft-alert-actions">
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setShowDraftBanner(false)}
                >
                  Continue Draft
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => setShowClearDraft(true)}
                >
                  Clear Draft
                </Button>
              </div>
            </Alert>
          )}

          {!outsideFood && (
            <div className="meal-builder-toolbar">
              <div>
                <h4>Meal Parts</h4>
                <p className="text-muted">
                  Build the meal as separate parts like Flatbread, Eggs,
                  Avocado, Pasta, Meat sauce, or Toppings.
                </p>
              </div>
            </div>
          )}

          {!outsideFood && previewComponents.length > 0 && (
            <Row className="g-4 mb-4">
              {previewComponents.map((componentPreview) => {
                const originalComponent = components.find(
                  (component) => component.name === componentPreview.name,
                );
                const componentCategory =
                  componentPreview.category || componentPreview.name;

                return (
                  <Col lg={6} key={componentPreview.name}>
                    <Card
                      className={`page-card component-builder-card ${selectedMealPart === componentPreview.name ? "active" : ""}`}
                    >
                      <Card.Body>
                        <div className="component-card-header">
                          <div className="component-card-title-block">
                            <div className="component-card-eyebrow">
                              Meal Part
                            </div>
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
                                  renameComponent(
                                    componentPreview.name,
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
                              · {formatAmount(componentPreview.totalWeight)}g
                              total
                            </div>
                          </div>
                          <div className="component-card-actions">
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => openLibrary(componentPreview.name)}
                            >
                              Add Ingredient
                            </Button>
                            {components.length > 1 && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() =>
                                  removeMealPart(componentPreview.name)
                                }
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
                                    fullIngredient?.category ||
                                    componentCategory
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
                                    {formatCalories(item.calories)} cal ·{" "}
                                    {formatMacro(item.protein)}g protein
                                  </div>
                                </div>
                                <div className="ingredient-actions">
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() =>
                                      editIngredient(
                                        componentPreview.name,
                                        index,
                                      )
                                    }
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() =>
                                      removeIngredient(
                                        componentPreview.name,
                                        index,
                                      )
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
            <>
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
                                (sum, item) =>
                                  sum + Number(item.totalWeight || 0),
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
                      <span>
                        Calories: {formatCalories(mealTotals.calories)}
                      </span>
                      <span>Protein: {formatMacro(mealTotals.protein)}g</span>
                      <span>Carbs: {formatMacro(mealTotals.carbs)}g</span>
                      <span>Fats: {formatMacro(mealTotals.fats)}g</span>
                      <span>Sugar: {formatMacro(mealTotals.sugar)}g</span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </>
          )}

          <div className="meal-save-actions">
            <Button variant="success" onClick={saveMeal} disabled={!canSave}>
              {imageUploading ? "Uploading photo..." : "Save Meal"}
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
            onSaveDraft={saveCurrentDraft}
          />

          <UnsavedChangesModal
            show={showModal}
            onKeepEditing={keepEditing}
            onDiscardChanges={discardChanges}
            onSaveDraft={saveCurrentDraft}
          />

          <Modal
            show={showClearDraft}
            onHide={() => setShowClearDraft(false)}
            centered
          >
            <Modal.Header closeButton>
              <Modal.Title>Clear Draft?</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              This will remove your unsaved meal draft and reset the builder.
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="outline-secondary"
                onClick={() => setShowClearDraft(false)}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={resetDraft}>
                Clear Draft
              </Button>
            </Modal.Footer>
          </Modal>

          <Modal
            show={showAddTodayPrompt}
            onHide={closeAddTodayPrompt}
            centered
            contentClassName="confirm-delete-modal-content"
          >
            <Modal.Header closeButton>
              <Modal.Title>Add to today?</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p>Do you want to log this outside food meal for today?</p>
              {addTodaySuccess && (
                <div className="quick-add-success-alert" role="status">
                  &#10003; {addTodaySuccess}
                </div>
              )}
              {addTodayError && (
                <Alert variant="warning" className="mt-3">
                  {addTodayError}
                </Alert>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="outline-secondary"
                onClick={closeAddTodayPrompt}
                disabled={addTodaySaving}
              >
                Not now
              </Button>
              <Button
                variant="success"
                onClick={addCreatedOutsideFoodToToday}
                disabled={addTodaySaving || !!addTodaySuccess}
              >
                {addTodaySaving ? "Adding..." : "Add to today"}
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      )}
    </RouteGuard>
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
  onSaveDraft,
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
    query: { category: selectedCategory, returnTo: "/create-meal-component" },
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
                  meal part.
                </div>
              </div>
              <div className="ingredient-library-actions">
                <Button
                  as={Link}
                  href={addIngredientHref}
                  variant="success"
                  onClick={onSaveDraft}
                >
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
