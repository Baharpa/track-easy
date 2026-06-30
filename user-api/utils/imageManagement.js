const cloudinary = require('../config/cloudinary');
const DailyLog = require('../models/DailyLog');
const Ingredient = require('../models/Ingredient');
const Meal = require('../models/Meal');
const { findAndUploadFoodImage } = require('./autoFoodImage');

const manualSources = new Set(['cloudinary-upload', 'manual-url']);

function imageFields(document = {}) {
  const source = typeof document.toObject === 'function' ? document.toObject() : document;
  return {
    imageUrl: source.imageUrl || source.image || source.photoUrl || '',
    imagePublicId: source.imagePublicId || '',
    imageSource: source.imageSource || '',
    imageSourceUrl: source.imageSourceUrl || source.imageAttribution?.sourceUrl || '',
    imageAuthor: source.imageAuthor || source.imageAttribution?.photographer || ''
  };
}

async function deleteCloudinaryImageIfUnused(publicId) {
  if (!publicId) return false;

  const [mealUsesImage, ingredientUsesImage, logUsesImage] = await Promise.all([
    Meal.exists({ imagePublicId: publicId }),
    Ingredient.exists({ imagePublicId: publicId }),
    DailyLog.exists({ 'meals.imagePublicId': publicId })
  ]);
  if (mealUsesImage || ingredientUsesImage || logUsesImage) return false;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    return true;
  } catch (error) {
    console.warn(`Could not delete unused Cloudinary image ${publicId}: ${error.message}`);
    return false;
  }
}

async function refreshDocumentImage({ model, documentId, userId, type, confirmReplace = false }) {
  const document = await model.findOne({ _id: documentId, userId });
  if (!document) return { status: 404, message: `${type === 'meal' ? 'Meal' : 'Ingredient'} not found.` };

  const oldImage = imageFields(document);
  if (manualSources.has(oldImage.imageSource) && !confirmReplace) {
    return { status: 409, message: 'Replace current image?', requiresConfirmation: true };
  }

  const result = await findAndUploadFoodImage({
    name: document.name,
    type,
    restaurantName: document.restaurantName,
    excludedSourceUrl: oldImage.imageSourceUrl
  });
  if (!result) return { status: 404, message: 'No matching image was found.' };

  const updated = await model.findOneAndUpdate(
    { _id: documentId, userId, imageUrl: document.imageUrl || '' },
    {
      $set: {
        imageUrl: result.imageUrl,
        imagePublicId: result.publicId,
        imageSource: 'pexels-refresh',
        imageSourceUrl: result.attribution?.sourceUrl || '',
        imageAuthor: result.attribution?.photographer || '',
        imageAttribution: result.attribution
      }
    },
    { new: true }
  );

  if (!updated) {
    await cloudinary.uploader.destroy(result.publicId).catch(() => {});
    return { status: 409, message: 'The image changed while refreshing. Please try again.' };
  }

  if (oldImage.imagePublicId && oldImage.imagePublicId !== result.publicId) {
    await deleteCloudinaryImageIfUnused(oldImage.imagePublicId);
  }
  return { status: 200, document: updated };
}

async function removeDocumentImage({ model, documentId, userId, type }) {
  const document = await model.findOne({ _id: documentId, userId });
  if (!document) return { status: 404, message: `${type === 'meal' ? 'Meal' : 'Ingredient'} not found.` };
  const oldImage = imageFields(document);

  const updated = await model.findOneAndUpdate(
    { _id: documentId, userId },
    {
      $set: {
        imageUrl: '',
        imagePublicId: '',
        imageSource: '',
        imageSourceUrl: '',
        imageAuthor: '',
        imageAttribution: {}
      }
    },
    { new: true }
  );

  if (oldImage.imagePublicId) await deleteCloudinaryImageIfUnused(oldImage.imagePublicId);
  return { status: 200, document: updated };
}

module.exports = {
  deleteCloudinaryImageIfUnused,
  imageFields,
  refreshDocumentImage,
  removeDocumentImage
};
