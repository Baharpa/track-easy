const cloudinary = require('../config/cloudinary');

const SEARCH_TIMEOUT_MS = 4500;
let missingConfigWarningShown = false;

function hasRequiredConfig() {
  return Boolean(
    process.env.PEXELS_API_KEY &&
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function buildSearchQuery({ name, type, restaurantName }) {
  const cleanName = String(name || '').trim();
  const cleanRestaurant = String(restaurantName || '').trim();
  if (type === 'meal' && cleanRestaurant) return `${cleanRestaurant} ${cleanName} food`;
  return `${cleanName} food`;
}

async function searchPexelsPhoto(query, excludedSourceUrl = '') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      query,
      orientation: 'landscape',
      size: 'medium',
      per_page: '5'
    });
    const response = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: { Authorization: process.env.PEXELS_API_KEY },
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`Pexels search returned ${response.status}.`);
    const data = await response.json();
    const photo = data.photos?.find((item) => item.url !== excludedSourceUrl) || data.photos?.[0];
    const remoteUrl = photo?.src?.large || photo?.src?.medium || photo?.src?.original;
    if (!photo || !remoteUrl) return null;

    return {
      remoteUrl,
      attribution: {
        provider: 'Pexels',
        photographer: photo.photographer || '',
        photographerUrl: photo.photographer_url || '',
        sourceUrl: photo.url || ''
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function findAndUploadFoodImage({ name, type = 'meal', restaurantName = '', excludedSourceUrl = '' }) {
  if (!hasRequiredConfig()) throw new Error('Automatic image lookup is not configured.');
  const cleanType = type === 'ingredient' ? 'ingredients' : 'meals';
  const query = buildSearchQuery({ name, type, restaurantName });
  const photo = await searchPexelsPhoto(query, excludedSourceUrl);
  if (!photo) return null;

  const uploaded = await cloudinary.uploader.upload(photo.remoteUrl, {
    folder: `track-easy/auto/${cleanType}`,
    resource_type: 'image',
    tags: ['track-easy', 'auto-food-image']
  });

  return {
    imageUrl: uploaded.secure_url,
    publicId: uploaded.public_id,
    attribution: photo.attribution,
    query
  };
}

function queueAutoFoodImage({ model, documentId, userId, name, type, restaurantName }) {
  if (!hasRequiredConfig()) {
    if (!missingConfigWarningShown) {
      console.warn('Automatic food images are disabled. Configure PEXELS_API_KEY and Cloudinary credentials.');
      missingConfigWarningShown = true;
    }
    return;
  }

  setImmediate(async () => {
    let result;
    try {
      result = await findAndUploadFoodImage({ name, type, restaurantName });
      if (!result) return;

      const updated = await model.findOneAndUpdate(
        {
          _id: documentId,
          userId,
          $or: [{ imageUrl: '' }, { imageUrl: null }, { imageUrl: { $exists: false } }]
        },
        {
          $set: {
            imageUrl: result.imageUrl,
            imagePublicId: result.publicId,
            imageSource: 'pexels-auto',
            imageSourceUrl: result.attribution?.sourceUrl || '',
            imageAuthor: result.attribution?.photographer || '',
            imageAttribution: result.attribution
          }
        },
        { new: true }
      );

      if (!updated) await cloudinary.uploader.destroy(result.publicId).catch(() => {});
    } catch (error) {
      if (result?.publicId) await cloudinary.uploader.destroy(result.publicId).catch(() => {});
      const reason = error.name === 'AbortError' ? 'provider request timed out' : error.message;
      console.warn(`Automatic ${type} image lookup failed for "${name}": ${reason}`);
    }
  });
}

module.exports = {
  findAndUploadFoodImage,
  queueAutoFoodImage
};
