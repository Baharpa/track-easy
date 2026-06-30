const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Tesseract = require('tesseract.js');
const auth = require('../config/auth');
const { findAndUploadFoodImage } = require('../utils/autoFoodImage');
const { extractNutritionLabelFields, hasDetectedValues } = require('../utils/nutritionLabelParser');

const router = express.Router();
const scanUploadsDir = path.join(__dirname, '..', 'tmp', 'nutrition-scans');
let ocrWorkerPromise = null;
const maxUploadSize = 5 * 1024 * 1024;
const allowedMimeTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp']
]);

fs.mkdirSync(scanUploadsDir, { recursive: true });

const cloudinaryImageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req) => {
    const uploadType = ['ingredient', 'meal'].includes(req.body?.type)
      ? `${req.body.type}s`
      : null;
    const userFolder = req.user?._id ? `users/${req.user._id}` : null;

    return {
      folder: ['track-easy', userFolder, uploadType].filter(Boolean).join('/'),
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    };
  }
});

const imageUpload = multer({
  storage: cloudinaryImageStorage,
  limits: { fileSize: maxUploadSize },
  fileFilter(req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error('Only image files are allowed.'));
    }
    callback(null, true);
  }
});

// OCR scans remain temporary local files because Tesseract needs a file path.
const nutritionScanUpload = multer({
  storage: multer.diskStorage({
    destination: scanUploadsDir,
    filename(req, file, callback) {
      const extension = allowedMimeTypes.get(file.mimetype) || '.jpg';
      callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`);
    }
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error('Only image files are allowed.'));
    }
    callback(null, true);
  }
});

async function scanNutritionLabel(filePath) {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: () => {}
      });

      await worker.setParameters({
        preserve_interword_spaces: '1',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK
      });

      return worker;
    })().catch(error => {
      ocrWorkerPromise = null;
      throw error;
    });
  }

  const worker = await ocrWorkerPromise;
  const result = await worker.recognize(filePath, {
    rotateAuto: true
  });

  return result?.data?.text || '';
}

router.post('/image', auth, (req, res) => {
  imageUpload.single('image')(req, res, (err) => {
    if (err) {
      const isClientError = err instanceof multer.MulterError || err.message === 'Only image files are allowed.';
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be 5MB or smaller.'
        : isClientError
          ? err.message
          : 'Image upload failed. Please try again.';
      if (!isClientError) console.error('Cloudinary image upload failed:', err.message);
      return res.status(isClientError ? 400 : 500).json({ message });
    }

    if (!req.file) return res.status(400).json({ message: 'Please choose an image to upload.' });

    res.status(201).json({
      imageUrl: req.file.path,
      publicId: req.file.filename
    });
  });
});

router.get('/test-auto-image', auth, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found.' });
  }

  const name = String(req.query.name || '').trim();
  const type = req.query.type === 'ingredient' ? 'ingredient' : 'meal';
  if (!name) return res.status(400).json({ message: 'A food name is required.' });

  try {
    const result = await findAndUploadFoodImage({ name, type });
    if (!result) return res.status(404).json({ message: 'No matching image was found.' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Automatic image test failed.' });
  }
});

router.post('/nutrition-scan', auth, (req, res) => {
  nutritionScanUpload.single('image')(req, res, async (err) => {
    const uploadedPath = req.file?.path;

    try {
      if (err) {
        const message = err.code === 'LIMIT_FILE_SIZE'
          ? 'Image must be 8MB or smaller.'
          : err.message || 'Nutrition scan failed.';
        return res.status(400).json({ message });
      }

      if (!req.file) return res.status(400).json({ message: 'Please choose an image to scan.' });

      const ocrText = await scanNutritionLabel(uploadedPath);
      const parsed = extractNutritionLabelFields(ocrText);

      if (!hasDetectedValues(parsed)) {
        return res.status(422).json({ message: 'No nutrition values were detected. Try a clearer photo.' });
      }

      const response = {
        calories: parsed.calories,
        protein: parsed.protein,
        fat: parsed.fat,
        carbohydrates: parsed.carbohydrates,
        sugar: parsed.sugar
      };

      res.status(200).json(response);
    } catch (scanErr) {
      res.status(400).json({ message: scanErr.message || 'Nutrition scan failed.' });
    } finally {
      if (uploadedPath) {
        await fs.promises.unlink(uploadedPath).catch(() => {});
      }
    }
  });
});

module.exports = router;
