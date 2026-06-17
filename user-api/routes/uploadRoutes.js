const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const auth = require('../config/auth');

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', 'uploads');
const allowedMimeTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/gif', '.gif'],
  ['image/webp', '.webp']
]);

fs.mkdirSync(uploadsDir, { recursive: true });

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

module.exports = router;
