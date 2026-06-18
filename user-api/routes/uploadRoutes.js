const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const auth = require('../config/auth');
const { extractNutritionLabelFields, hasDetectedValues } = require('../utils/nutritionLabelParser');

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', 'uploads');
const scanUploadsDir = path.join(__dirname, '..', 'tmp', 'nutrition-scans');
let ocrWorkerPromise = null;
const allowedMimeTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp']
]);

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(scanUploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename(req, file, callback) {
    const extension = allowedMimeTypes.get(file.mimetype) || '.jpg';
    callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error('Only image files are allowed.'));
    }
    callback(null, true);
  }
});

const scanUpload = multer({
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
  upload.single('image')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be 5MB or smaller.'
        : err.message || 'Image upload failed.';
      return res.status(400).json({ message });
    }

    if (!req.file) return res.status(400).json({ message: 'Please choose an image to upload.' });

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(201).json({ imageUrl });
  });
});

router.post('/nutrition-scan', auth, (req, res) => {
  scanUpload.single('image')(req, res, async (err) => {
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
