const express = require('express');
const auth = require('../config/auth');
const Ingredient = require('../models/Ingredient');
const { isValidUnit, normalizeUnit } = require('../utils/unitConverter');
const { queueAutoFoodImage } = require('../utils/autoFoodImage');
const {
  deleteCloudinaryImageIfUnused,
  refreshDocumentImage,
  removeDocumentImage
} = require('../utils/imageManagement');
const router = express.Router();

function validateIngredient(body) {
  if (!body.name) return 'Ingredient name is required.';
  if (!body.category) return 'Category is required.';
  if (Number(body.quantity) <= 0) return 'Quantity must be a positive number.';
  if (!isValidUnit(body.unit)) return 'Please choose a valid unit.';

  const nutritionFields = [
    'calories',
    'protein',
    'carbs',
    'fats',
    'sugar',
    'caloriesPer100g',
    'proteinPer100g',
    'carbsPer100g',
    'fatsPer100g',
    'sugarPer100g'
  ];
  if (nutritionFields.some(field => Number(body[field]) < 0)) return 'Nutrition values cannot be negative.';

  const conversions = Array.isArray(body.conversions)
    ? body.conversions
    : Array.isArray(body.servingOptions)
      ? body.servingOptions
      : body.measuringOptions;
  if (Array.isArray(conversions)) {
    const seenKeys = new Set();
    for (const option of conversions) {
      const unit = String(option?.unit || '').trim().toLowerCase();
      const amount = Number(option?.amount);
      const gramsEquivalent = option?.gramsEquivalent !== undefined && option?.gramsEquivalent !== ''
        ? Number(option.gramsEquivalent)
        : option?.grams !== undefined && option?.grams !== ''
          ? Number(option.grams)
          : null;

      if (!unit) return 'Each conversion needs a unit.';
      if (!amount || amount <= 0) return 'Each conversion amount must be greater than 0.';
      if (gramsEquivalent === null || Number.isNaN(gramsEquivalent)) return 'Each conversion needs an equals grams value.';
      if (gramsEquivalent <= 0) return 'Grams equivalent must be greater than 0.';

      const dedupeKey = `${amount}|${unit}|${gramsEquivalent}`;
      if (seenKeys.has(dedupeKey)) return 'Conversion rows must be unique.';
      seenKeys.add(dedupeKey);
    }
  }

  return '';
}

function normalizeConversion(option) {
  if (!option) return null;
  const unit = String(option.unit || '').trim().toLowerCase();
  const amount = Number(option.amount);
  const gramsEquivalent = option.gramsEquivalent !== undefined && option.gramsEquivalent !== ''
    ? Number(option.gramsEquivalent)
    : option.grams !== undefined && option.grams !== ''
      ? Number(option.grams)
      : null;

  if (!unit || amount <= 0) return null;

  return {
    unit,
    amount,
    gramsEquivalent: Number.isFinite(gramsEquivalent) && gramsEquivalent > 0 ? gramsEquivalent : null
  };
}

function cleanIngredientBody(body) {
  const imageUrl = String(body.imageUrl || body.image || body.photoUrl || '').trim();
  const cleaned = {
    ...body,
    imageUrl,
    imagePublicId: body.imagePublicId || '',
    imageSource: body.imageSource || (body.imageAttribution?.provider === 'Pexels'
      ? 'pexels-auto'
      : imageUrl
        ? body.imagePublicId ? 'cloudinary-upload' : 'manual-url'
        : ''),
    unit: normalizeUnit(body.unit)
  };
  delete cleaned.image;
  delete cleaned.photoUrl;
  ['calories', 'protein', 'carbs', 'fats', 'sugar', 'caloriesPer100g', 'proteinPer100g', 'carbsPer100g', 'fatsPer100g', 'sugarPer100g', 'gramsPerTeaspoon', 'gramsPerTablespoon', 'gramsPerCup', 'gramsPerPiece', 'quantity'].forEach(field => {
    if (cleaned[field] === '') cleaned[field] = undefined;
  });
  if (Array.isArray(cleaned.conversions) || Array.isArray(cleaned.servingOptions) || Array.isArray(cleaned.measuringOptions)) {
    const source = Array.isArray(cleaned.conversions)
      ? cleaned.conversions
      : Array.isArray(cleaned.servingOptions)
        ? cleaned.servingOptions
        : cleaned.measuringOptions;
    cleaned.conversions = source
      .map(normalizeConversion)
      .filter(Boolean);
    cleaned.servingOptions = cleaned.conversions.map(option => ({
      label: `${option.amount} ${option.unit}`,
      amount: option.amount,
      unit: option.unit,
      gramsEquivalent: option.gramsEquivalent
    }));
    delete cleaned.measuringOptions;
  }
  return cleaned;
}

router.get('/', auth, async (req, res) => {
  const ingredients = await Ingredient.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(ingredients);
});

router.post('/', auth, async (req, res) => {
  try {
    const validationMessage = validateIngredient(req.body);
    if (validationMessage) return res.status(400).json({ message: validationMessage });

    const ingredient = await Ingredient.create({ ...cleanIngredientBody(req.body), userId: req.user._id });
    res.status(201).json(ingredient);
    if (!ingredient.imageUrl) {
      queueAutoFoodImage({
        model: Ingredient,
        documentId: ingredient._id,
        userId: req.user._id,
        name: ingredient.name,
        type: 'ingredient'
      });
    }
  } catch (err) {
    res.status(400).json({ message: 'Could not create ingredient.', error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  const ingredient = await Ingredient.findOne({ _id: req.params.id, userId: req.user._id });
  if (!ingredient) return res.status(404).json({ message: 'Ingredient not found.' });
  res.json(ingredient);
});

router.put('/:id', auth, async (req, res) => {
  const validationMessage = validateIngredient(req.body);
  if (validationMessage) return res.status(400).json({ message: validationMessage });

  const previousIngredient = await Ingredient.findOne({ _id: req.params.id, userId: req.user._id });
  const ingredient = await Ingredient.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    cleanIngredientBody(req.body),
    { new: true }
  );
  if (!ingredient) return res.status(404).json({ message: 'Ingredient not found.' });
  res.json(ingredient);
  if (previousIngredient?.imagePublicId && previousIngredient.imagePublicId !== ingredient.imagePublicId) {
    deleteCloudinaryImageIfUnused(previousIngredient.imagePublicId).catch(error => {
      console.warn(`Could not check old ingredient image usage: ${error.message}`);
    });
  }
});

router.post('/:id/image/refresh', auth, async (req, res) => {
  try {
    const result = await refreshDocumentImage({
      model: Ingredient,
      documentId: req.params.id,
      userId: req.user._id,
      type: 'ingredient',
      confirmReplace: Boolean(req.body.confirmReplace)
    });
    if (!result.document) return res.status(result.status).json(result);
    res.json(result.document);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not refresh image.' });
  }
});

router.delete('/:id/image', auth, async (req, res) => {
  try {
    const result = await removeDocumentImage({
      model: Ingredient,
      documentId: req.params.id,
      userId: req.user._id,
      type: 'ingredient'
    });
    if (!result.document) return res.status(result.status).json(result);
    res.json(result.document);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not remove image.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  const ingredient = await Ingredient.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!ingredient) return res.status(404).json({ message: 'Ingredient not found.' });
  res.json({ message: 'Ingredient deleted.' });
  if (ingredient.imagePublicId) {
    deleteCloudinaryImageIfUnused(ingredient.imagePublicId).catch(error => {
      console.warn(`Could not clean up deleted ingredient image: ${error.message}`);
    });
  }
});

module.exports = router;
