/**
 * Location Routes for Car Crash Lawyer AI
 * Handles what3words integration and location services
 */

const express = require('express');
const locationController = require('../controllers/location.controller');
const router = express.Router();

/**
 * Convert coordinates to what3words
 * GET /api/location/convert?lat=...&lng=...
 */
router.get('/convert', locationController.convertToWhat3Words);

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
 * Convert coordinates to what3words (POST version)
 * POST /api/location/what3words
 * Body: { latitude, longitude }
 */
router.post('/what3words', locationController.convertToWhat3WordsPost);

/**
 * Upload what3words image
 * POST /api/location/upload-image
 * Body: { imageData: base64 | file upload, what3words, latitude, longitude, userId }
 */
router.post('/upload-image', locationController.uploadWhat3wordsImage);

module.exports = router;