import { useForm, Controller } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, Row } from "react-bootstrap";
import MealImageUpload from "./MealImageUpload";
import ImageManagementActions from "./ImageManagementActions";
import SmartFoodSuggestionCard from "./SmartFoodSuggestionCard";
import UnitSelect from "./UnitSelect";
import { CATEGORY_LIBRARY } from "../lib/foodVisuals";
import { normalizeCategory } from "../lib/categoryHelpers";
import { getIngredientServingNutrition } from "../lib/formatNutrition";
import { getSmartFoodMatch, normalizeFoodQuery } from "../lib/smartFoodBuilder";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import NutritionLabelScanner from "./NutritionLabelScanner";
import UnsavedChangesModal from "./UnsavedChangesModal";
import {
  clearIngredientDraft,
  getIngredientDraftKey,
  loadIngredientDraft,
  saveIngredientDraft,
} from "../lib/mealDraft";

const CONVERSION_UNIT_OPTIONS = [
  { value: "cup", label: "cup" },
  { value: "tbsp", label: "tbsp" },
  { value: "tsp", label: "tsp" },
  { value: "scoop", label: "scoop" },
  { value: "piece", label: "piece" },
  { value: "slice", label: "slice" },
  { value: "serving", label: "serving" },
  { value: "oz", label: "oz" },
  { value: "ml", label: "ml" },
  { value: "custom", label: "custom" },
];

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function buildDefaultValues(defaultValues) {
  const servingNutrition = getIngredientServingNutrition(defaultValues);
  const valueOrServing = (field) => {
    return hasValue(defaultValues[field])
      ? defaultValues[field]
      : servingNutrition[field];
  };

  return {
    ...defaultValues,
    imageUrl:
      defaultValues.imageUrl || defaultValues.image || defaultValues.photoUrl || "",
    category: hasValue(defaultValues.category)
      ? normalizeCategory(defaultValues.category)
      : "",
    calories: valueOrServing("calories"),
    protein: valueOrServing("protein"),
    carbs: valueOrServing("carbs"),
    fats: valueOrServing("fats"),
    sugar: valueOrServing("sugar"),
  };
}

function normalizeConversion(option) {
  if (!option) return null;

  const amount = Number(option.amount);
  const gramsEquivalent =
    option.gramsEquivalent !== undefined && option.gramsEquivalent !== ""
      ? Number(option.gramsEquivalent)
      : option.grams !== undefined && option.grams !== ""
        ? Number(option.grams)
        : null;
  const unit = String(option.unit || "")
    .trim()
    .toLowerCase();

  if (!unit || amount <= 0) return null;

  return {
    amount,
    unit,
    gramsEquivalent:
      Number.isFinite(gramsEquivalent) && gramsEquivalent > 0
        ? gramsEquivalent
        : null,
  };
}

function buildConversions(defaultValues) {
  const fromConversions = Array.isArray(defaultValues?.conversions)
    ? defaultValues.conversions.map(normalizeConversion).filter(Boolean)
    : [];
  const fromServingOptions = Array.isArray(defaultValues?.servingOptions)
    ? defaultValues.servingOptions
        .map((option) =>
          normalizeConversion({
            amount: option.amount,
            unit: option.unit,
            gramsEquivalent: option.gramsEquivalent ?? option.grams,
          }),
        )
        .filter((option) => option && option.gramsEquivalent)
    : [];
  const fromMeasuringOptions = Array.isArray(defaultValues?.measuringOptions)
    ? defaultValues.measuringOptions
        .map((option) =>
          normalizeConversion({
            amount: option.amount,
            unit: option.unit,
            gramsEquivalent: option.gramsEquivalent ?? option.grams,
          }),
        )
        .filter((option) => option && option.gramsEquivalent)
    : [];

  const merged = [
    ...fromConversions,
    ...fromServingOptions,
    ...fromMeasuringOptions,
  ];
  const seen = new Set();

  return merged.filter((option) => {
    const key = `${option.amount}|${option.unit}|${option.gramsEquivalent ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createEmptyConversion() {
  return { amount: "", unit: "", gramsEquivalent: "" };
}

function formatConversionLabel(option) {
  const amount = hasValue(option.amount) ? option.amount : "";
  const unit = String(option.unit || "").trim();
  const gramsEquivalent = hasValue(option.gramsEquivalent)
    ? option.gramsEquivalent
    : "?";
  if (!amount || !unit) return "Add a conversion";
  return `${amount} ${unit} = ${gramsEquivalent} grams`;
}

function isPresetConversionUnit(unit) {
  const normalized = String(unit || "")
    .trim()
    .toLowerCase();
  return CONVERSION_UNIT_OPTIONS.some(
    (option) => option.value === normalized && option.value !== "custom",
  );
}

export default function IngredientForm({
  defaultValues = {},
  onSubmit,
  onSuccess,
  buttonText = "Save Ingredient",
  draftKey: draftKeyProp = "",
}) {
  const [imageUploading, setImageUploading] = useState(false);
  const [dismissedSmartQuery, setDismissedSmartQuery] = useState("");
  const initialConversions = useMemo(
    () => buildConversions(defaultValues),
    [defaultValues],
  );
  const [conversions, setConversions] = useState(() => initialConversions);
  const [optionError, setOptionError] = useState("");
  const draftKey =
    draftKeyProp || getIngredientDraftKey(defaultValues?._id || "new");
  const initialValues = useMemo(
    () => buildDefaultValues(defaultValues),
    [defaultValues],
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    control,
    setValue,
    watch,
    reset,
    getValues,
  } = useForm({ defaultValues: initialValues });
  const [draftState, setDraftState] = useState(null);
  const [showDraftCard, setShowDraftCard] = useState(false);
  const hasConversionChanges = useMemo(
    () => JSON.stringify(conversions) !== JSON.stringify(initialConversions),
    [conversions, initialConversions],
  );
  const { showModal, keepEditing, discardChanges, saveDraft, markSaved } =
    useUnsavedChanges((isDirty || hasConversionChanges) && !isSubmitting, {
      onDiscard: () => clearIngredientDraft(draftKey),
      onSaveDraft: async () => {
        const draft = { ...getValues(), conversions };
        saveIngredientDraft(draft, draftKey);
        setDraftState(draft);
      },
    });
  const imageUrl = watch("imageUrl");
  const imagePublicId = watch("imagePublicId");
  const imageSource = watch("imageSource");
  const imageSourceUrl = watch("imageSourceUrl");
  const imageAuthor = watch("imageAuthor");
  const imageUrlRegistration = register("imageUrl");

  function applyImageFields(item = {}) {
    setValue("imageUrl", item.imageUrl || "", { shouldDirty: true });
    setValue("imagePublicId", item.imagePublicId || "", { shouldDirty: true });
    setValue("imageSource", item.imageSource || "", { shouldDirty: true });
    setValue("imageSourceUrl", item.imageSourceUrl || "", { shouldDirty: true });
    setValue("imageAuthor", item.imageAuthor || "", { shouldDirty: true });
    setValue("imageAttribution", item.imageAttribution || {}, { shouldDirty: true });
  }
  const nameValue = watch("name") || "";
  const normalizedName = normalizeFoodQuery(nameValue);
  const smartFoodMatch = useMemo(
    () => getSmartFoodMatch(nameValue),
    [nameValue],
  );
  const smartSuggestion =
    smartFoodMatch.suggestion && normalizedName !== dismissedSmartQuery
      ? smartFoodMatch.suggestion
      : null;
  const smartMealHref = smartSuggestion
    ? {
        pathname: "/create-meal-component",
        query: { smartMeal: smartSuggestion.id, name: nameValue },
      }
    : null;

  useEffect(() => {
    const storedDraft = loadIngredientDraft(draftKey);
    setDraftState(storedDraft);
    setShowDraftCard(Boolean(storedDraft));
    if (
      storedDraft?.conversions ||
      storedDraft?.servingOptions ||
      storedDraft?.measuringOptions
    ) {
      setConversions(buildConversions(storedDraft));
    }
  }, [draftKey]);

  function restoreDraft() {
    if (!draftState) return;
    reset(buildDefaultValues(draftState));
    setConversions(buildConversions(draftState));
    setOptionError("");
    setShowDraftCard(false);
  }

  function updateConversion(index, field, value) {
    if (optionError) setOptionError("");
    setConversions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [field]: value } : option,
      ),
    );
  }

  function addConversion() {
    if (optionError) setOptionError("");
    setConversions((current) => [...current, createEmptyConversion()]);
  }

  function deleteConversion(index) {
    if (optionError) setOptionError("");
    setConversions((current) =>
      current.filter((_, optionIndex) => optionIndex !== index),
    );
  }

  function applyScannedNutrition(result = {}) {
    const fieldMap = {
      calories: "calories",
      protein: "protein",
      carbs: "carbs",
      carbohydrates: "carbs",
      fat: "fats",
      fats: "fats",
      sugar: "sugar",
    };

    Object.entries(fieldMap).forEach(([sourceField, targetField]) => {
      const numericValue = Number(result?.[sourceField]);
      if (!Number.isFinite(numericValue)) return;
      setValue(targetField, numericValue, {
        shouldDirty: true,
        shouldValidate: true,
      });
    });
  }

  function buildSubmissionConversions() {
    const cleaned = [];
    const seen = new Set();

    for (const option of conversions) {
      const normalized = normalizeConversion(option);
      const hasPartialInput =
        hasValue(option.amount) ||
        hasValue(option.unit) ||
        hasValue(option.gramsEquivalent);

      if (!normalized) {
        if (hasPartialInput) {
          return { error: "Please complete every conversion before saving." };
        }
        continue;
      }

      const key = `${normalized.amount}|${normalized.unit}`;
      if (seen.has(key)) {
        return { error: "Conversion rows must be unique." };
      }
      if (normalized.amount <= 0) {
        return { error: "Amount must be greater than 0." };
      }
      if (!normalized.unit) {
        return { error: "Unit is required." };
      }
      if (
        normalized.gramsEquivalent === null ||
        normalized.gramsEquivalent <= 0
      ) {
        return { error: "Equals grams must be greater than 0." };
      }

      seen.add(key);
      cleaned.push(normalized);
    }

    return { cleaned };
  }

  return (
    <>
      <Card className="page-card p-4">
        {showDraftCard && draftState && (
          <Card className="draft-restore-card mb-3">
            <Card.Body className="draft-restore-card-body">
              <div>
                <strong>Continue draft</strong>
                <p className="text-muted mb-0">
                  A saved ingredient draft was found. Restore it or delete it.
                </p>
              </div>
              <div className="draft-restore-card-actions">
                <Button variant="success" size="sm" onClick={restoreDraft}>
                  Continue draft
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => {
                    clearIngredientDraft(draftKey);
                    setDraftState(null);
                    setShowDraftCard(false);
                  }}
                >
                  Delete draft
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}

        <Form
          onSubmit={handleSubmit(async (data) => {
            const { cleaned, error } = buildSubmissionConversions();
            if (error) {
              setOptionError(error);
              return;
            }

            setOptionError("");
            const payload = {
              ...defaultValues,
              ...data,
            };
            delete payload.servingOptions;
            delete payload.measuringOptions;
            if (cleaned.length > 0 || initialConversions.length > 0) {
              payload.conversions = cleaned;
            } else {
              delete payload.conversions;
            }
            await onSubmit(payload);
            markSaved();
            clearIngredientDraft(draftKey);
            if (onSuccess) await onSuccess(payload);
          })}
        >
          {Object.keys(errors).length > 0 && (
            <Alert variant="warning">Please fix the highlighted fields.</Alert>
          )}
          {optionError && <Alert variant="warning">{optionError}</Alert>}

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  isInvalid={!!errors.name}
                  {...register("name", {
                    required: "Ingredient name is required.",
                  })}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.name?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Category</Form.Label>
                <Form.Select
                  isInvalid={!!errors.category}
                  {...register("category", {
                    required: "Category is required.",
                  })}
                >
                  <option value="">Choose category</option>
                  {CATEGORY_LIBRARY.map((category) => (
                    <option key={category.name} value={category.name}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.category?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <SmartFoodSuggestionCard
            suggestion={smartSuggestion}
            primaryHref={smartMealHref}
            onDismiss={() => setDismissedSmartQuery(normalizedName)}
          />

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Amount</Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  isInvalid={!!errors.quantity}
                  {...register("quantity", {
                    required: "Amount is required.",
                    min: {
                      value: 0.1,
                      message: "Please enter a positive number.",
                    },
                  })}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.quantity?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Unit</Form.Label>
                <Controller
                  name="unit"
                  control={control}
                  rules={{ required: "Unit is required." }}
                  render={({ field }) => (
                    <UnitSelect {...field} isInvalid={!!errors.unit} />
                  )}
                />
                <Form.Control.Feedback
                  type="invalid"
                  className="field-feedback-block"
                >
                  {errors.unit?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Card className="ingredient-measuring-card mb-3">
            <Card.Body>
              <div className="mb-3">
                <Form.Label className="fw-bold mb-1">
                  Nutritional values
                </Form.Label>
                <div className="text-muted small">
                  For the inventory quantity and unit above.
                </div>
                <div className="mt-3">
                  <NutritionLabelScanner onDetected={applyScannedNutrition} />
                </div>
              </div>

              <Row className="g-3">
                {[
                  { field: "calories", label: "Calories" },
                  { field: "protein", label: "Protein" },
                  { field: "carbs", label: "Carbs" },
                  { field: "fats", label: "Fats" },
                  { field: "sugar", label: "Sugar" },
                ].map((nutrient) => (
                  <Col xs={6} md={4} lg={2} key={nutrient.field}>
                    <Form.Group>
                      <Form.Label>{nutrient.label}</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        step="0.1"
                        isInvalid={!!errors[nutrient.field]}
                        {...register(nutrient.field, {
                          min: {
                            value: 0,
                            message: "Nutrition cannot be negative.",
                          },
                        })}
                        placeholder="0"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors[nutrient.field]?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>

          <Card className="ingredient-measuring-card mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-2">
                <div>
                  <Form.Label className="fw-bold mb-1">
                    Add conversions
                  </Form.Label>
                  <div className="text-muted small">
                    Add custom units so Track Easy can convert them to grams.
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline-success"
                  size="sm"
                  onClick={addConversion}
                >
                  Add conversion
                </Button>
              </div>

              {conversions.length === 0 && (
                <div className="ingredient-measuring-empty text-muted">
                  No conversions yet.
                </div>
              )}

              {conversions.map((option, index) => (
                <Card
                  className="ingredient-serving-option-card"
                  key={`conversion-${index}`}
                >
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-2">
                      <div>
                        <strong>Conversion {index + 1}</strong>
                        <div className="text-muted small">
                          {formatConversionLabel(option)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline-danger"
                        size="sm"
                        onClick={() => deleteConversion(index)}
                      >
                        Remove
                      </Button>
                    </div>

                    <Row className="g-3">
                      <Col xs={4} md={3}>
                        <Form.Group>
                          <Form.Label>Amount</Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            step="0.1"
                            value={option.amount}
                            onChange={(event) =>
                              updateConversion(
                                index,
                                "amount",
                                event.target.value,
                              )
                            }
                            placeholder="1"
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={4} md={4}>
                        <Form.Group>
                          <Form.Label>Unit</Form.Label>
                          <Form.Select
                            value={
                              isPresetConversionUnit(option.unit)
                                ? String(option.unit).trim().toLowerCase()
                                : "custom"
                            }
                            onChange={(event) => {
                              const nextUnit = event.target.value;
                              updateConversion(
                                index,
                                "unit",
                                nextUnit === "custom" ? "" : nextUnit,
                              );
                            }}
                          >
                            {CONVERSION_UNIT_OPTIONS.map((unitOption) => (
                              <option
                                key={unitOption.value}
                                value={unitOption.value}
                              >
                                {unitOption.label}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col xs={4} md={5}>
                        <Form.Group>
                          <Form.Label>Equals grams</Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            step="0.1"
                            value={option.gramsEquivalent ?? ""}
                            onChange={(event) =>
                              updateConversion(
                                index,
                                "gramsEquivalent",
                                event.target.value,
                              )
                            }
                            placeholder="150"
                          />
                        </Form.Group>
                      </Col>
                      {!isPresetConversionUnit(option.unit) && (
                        <Col xs={12}>
                          <Form.Group>
                            <Form.Label>Custom unit name</Form.Label>
                            <Form.Control
                              type="text"
                              value={option.unit}
                              onChange={(event) =>
                                updateConversion(
                                  index,
                                  "unit",
                                  event.target.value,
                                )
                              }
                              placeholder="cup"
                            />
                          </Form.Group>
                        </Col>
                      )}
                    </Row>
                  </Card.Body>
                </Card>
              ))}
            </Card.Body>
          </Card>

          <Form.Group className="mb-3">
            <Form.Label>Image URL</Form.Label>
            <Form.Control
              {...imageUrlRegistration}
              onChange={(event) => {
                imageUrlRegistration.onChange(event);
                setValue("imagePublicId", "", { shouldDirty: true });
                setValue("imageSource", event.target.value.trim() ? "manual-url" : "", { shouldDirty: true });
                setValue("imageSourceUrl", "", { shouldDirty: true });
                setValue("imageAuthor", "", { shouldDirty: true });
                setValue("imageAttribution", {}, { shouldDirty: true });
              }}
              placeholder="https://example.com/food.jpg"
            />
            <input type="hidden" {...register("imagePublicId")} />
            <input type="hidden" {...register("imageSource")} />
            <input type="hidden" {...register("imageSourceUrl")} />
            <input type="hidden" {...register("imageAuthor")} />
            <MealImageUpload
              imageUrl={imageUrl}
              uploadType="ingredient"
              onUploaded={(uploadedUrl, publicId) => applyImageFields({
                imageUrl: uploadedUrl,
                imagePublicId: publicId,
                imageSource: "cloudinary-upload"
              })}
              onUploadingChange={setImageUploading}
            />
            <ImageManagementActions
              item={{
                ...defaultValues,
                imageUrl,
                imagePublicId,
                imageSource,
                imageSourceUrl,
                imageAuthor
              }}
              itemType="ingredient"
              onChanged={applyImageFields}
            />
          </Form.Group>

          <Button
            type="submit"
            variant="success"
            className="ingredient-form-submit"
            disabled={isSubmitting || imageUploading}
          >
            {imageUploading
              ? "Uploading photo..."
              : isSubmitting
                ? "Saving..."
                : buttonText}
          </Button>
        </Form>
      </Card>

      <UnsavedChangesModal
        show={showModal}
        onKeepEditing={keepEditing}
        onDiscardChanges={discardChanges}
        onSaveDraft={saveDraft}
      />
    </>
  );
}
