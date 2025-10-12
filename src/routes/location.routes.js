
/**
 * Location Routes for Car Crash Lawyer AI
 * Handles what3words API integration and location services
 */

const express = require('express');
const multer = require('multer');
const config = require('../config');
const CONSTANTS = config.constants;
const locationController = require('../controllers/location.controller');

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CONSTANTS.FILE_SIZE_LIMITS.IMAGE,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`));
    }
  }
});

/**
 * Convert coordinates to what3words
 * GET /api/location/convert
 * Query params: lat, lng
 */
router.get('/convert', locationController.convertToWords);

/**
 * Get what3words autosuggest
 * GET /api/location/autosuggest
 * Query params: input
 */
router.get('/autosuggest', locationController.getAutosuggest);

/**
 * Legacy what3words endpoint (backward compatibility)
 * GET /api/location/legacy
 * Query params: lat, lng
 */
router.get('/legacy', locationController.getLegacyWhat3words);

/**
 * Upload what3words image
 * POST /api/location/upload-image
 * Body: { imageData: base64 | file upload, what3words, latitude, longitude, userId }
 */
router.post('/upload-image', upload.single('image'), locationController.uploadWhat3wordsImage);

module.exports = router;
