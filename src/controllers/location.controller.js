/**
 * Location Controller for Car Crash Lawyer AI
 * Handles what3words integration and location services
 */

const axios = require('axios');
const { sendError, redactUrl } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const gdprService = require('../services/gdprService');

/**
 * Convert coordinates to what3words
 * GET /api/location/convert
 */
async function convertToWhat3Words(req, res) {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return sendError(res, 400, 'Missing coordinates', 'MISSING_COORDS',
        'Both lat and lng parameters are required');
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude) ||
      latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180) {
      return sendError(res, 400, 'Invalid coordinates', 'INVALID_COORDS',
        'Coordinates must be valid latitude (-90 to 90) and longitude (-180 to 180)');
    }

    if (!config.what3words.apiKey) {
      logger.error('what3words API key not found');
      return sendError(res, 500, 'Configuration error', 'API_KEY_MISSING',
        'what3words API key not configured');
    }

    const what3wordsUrl = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${latitude},${longitude}&key=${config.what3words.apiKey}`;

    const response = await axios.get(what3wordsUrl, {
      timeout: 10000
    });

    const data = response.data;

    if (response.status !== 200) {
      logger.error('what3words API error:', data);
      return sendError(res, response.status, 'what3words API error', 'W3W_API_ERROR',
        data.error?.message || 'Failed to convert coordinates');
    }

    res.json({
      success: true,
      words: data.words,
      coordinates: {
        lat: latitude,
        lng: longitude
      },
      nearestPlace: data.nearestPlace || null,
      country: data.country || null,
      language: data.language || 'en',
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('what3words conversion error:', error);
    sendError(res, 500, 'Server error', 'INTERNAL_ERROR',
      'Failed to process location conversion');
  }
}

/**
 * Get what3words autosuggest
 * GET /api/location/autosuggest
 */
async function getAutosuggest(req, res) {
  try {
    const { input } = req.query;

    if (!input) {
      return sendError(res, 400, 'Missing input', 'MISSING_INPUT',
        'Input parameter is required');
    }

    if (!config.what3words.apiKey) {
      return sendError(res, 500, 'Configuration error', 'API_KEY_MISSING',
        'what3words API key not configured');
    }

    const what3wordsUrl = `https://api.what3words.com/v3/autosuggest?input=${encodeURIComponent(input)}&key=${config.what3words.apiKey}`;

    const response = await axios.get(what3wordsUrl, {
      timeout: 10000
    });

    const data = response.data;

    if (response.status !== 200) {
      logger.error('what3words autosuggest error:', data);
      return sendError(res, response.status, 'what3words API error', 'W3W_API_ERROR',
        data.error?.message || 'Failed to get suggestions');
    }

    res.json({
      success: true,
      suggestions: data.suggestions || [],
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('what3words autosuggest error:', error);
    sendError(res, 500, 'Server error', 'INTERNAL_ERROR',
      'Failed to get suggestions');
  }
}

/**
 * Legacy what3words endpoint (backward compatibility)
 * GET /api/location/legacy
 */
async function getLegacyWhat3words(req, res) {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return sendError(res, 400, 'Missing latitude or longitude', 'MISSING_COORDS');
    }

    if (!config.what3words.apiKey) {
      logger.warn('What3Words API key not configured');
      return res.json({
        words: 'location.not.configured',
        requestId: req.requestId
      });
    }

    const response = await axios.get(
      `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${config.what3words.apiKey}`,
      { timeout: 10000 }
    );

    if (response.data && response.data.words) {
      res.json({
        words: response.data.words,
        requestId: req.requestId
      });
    } else {
      res.json({
        words: 'location.not.found',
        requestId: req.requestId
      });
    }
  } catch (error) {
    logger.error('What3Words API error', error);
    res.json({
      words: 'api.error.occurred',
      requestId: req.requestId
    });
  }
}

/**
 * Upload what3words image
 * POST /api/location/upload-image
 */
async function uploadWhat3wordsImage(req, res) {
  try {
    // Get imageProcessor from app locals
    const imageProcessor = req.app.locals.imageProcessor;

    if (!imageProcessor) {
      return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
    }

    let buffer;
    let what3words, latitude, longitude, userId;

    if (req.file) {
      buffer = req.file.buffer;
      ({ what3words, latitude, longitude, userId } = req.body);
    } else {
      const { imageData } = req.body;
      if (!imageData) {
        return sendError(res, 400, 'No image data provided', 'MISSING_IMAGE');
      }

      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
      ({ what3words, latitude, longitude, userId } = req.body);
    }

    if (!userId) {
      return sendError(res, 400, 'User ID required for GDPR compliance', 'MISSING_USER_ID');
    }

    const safeWhat3Words = what3words ? what3words.replace(/[\/\\.]/g, '-') : 'unknown';
    const timestamp = Date.now();
    const fileName = `${userId}/what3words/${timestamp}_${safeWhat3Words}.png`;

    const storagePath = await imageProcessor.uploadToSupabase(buffer, fileName, 'image/png');

    const imageRecord = await imageProcessor.createImageRecord({
      create_user_id: userId,
      incident_report_id: null,
      image_type: 'what3words_screenshot',
      storage_path: storagePath,
      original_url: null,
      metadata: {
        upload_date: new Date().toISOString(),
        source: 'web_capture',
        what3words: what3words,
        latitude: parseFloat(latitude) || null,
        longitude: parseFloat(longitude) || null,
        captured_at: new Date().toISOString(),
        gdpr_consent: true
      }
    });

    const signedUrl = await imageProcessor.getSignedUrl(storagePath, 3600);

    await gdprService.logActivity(userId, 'IMAGE_UPLOADED', {
      type: 'what3words',
      location: what3words
    }, req);

    res.json({
      success: true,
      imageUrl: signedUrl,
      storagePath: storagePath,
      imageRecord: imageRecord,
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Error uploading what3words image', error);
    sendError(res, 500, error.message, 'UPLOAD_FAILED');
  }
}

/**
 * Convert coordinates to what3words (POST version for frontend)
 * POST /api/location/what3words
 * Body: { latitude, longitude }
 */
async function convertToWhat3WordsPost(req, res) {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return sendError(res, 400, 'Missing coordinates', 'MISSING_COORDS',
        'Both latitude and longitude are required in request body');
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) ||
      lat < -90 || lat > 90 ||
      lng < -180 || lng > 180) {
      return sendError(res, 400, 'Invalid coordinates', 'INVALID_COORDS',
        'Coordinates must be valid latitude (-90 to 90) and longitude (-180 to 180)');
    }

    if (!config.what3words.apiKey) {
      logger.warn('what3words API key not configured');
      // Return a friendly fallback instead of error
      return res.json({
        success: false,
        error: 'what3words service not configured',
        words: null,
        requestId: req.requestId
      });
    }

    const what3wordsUrl = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${config.what3words.apiKey}`;

    logger.info('Converting coordinates to what3words', { lat, lng });

    const response = await axios.get(what3wordsUrl, {
      timeout: 10000
    });

    const data = response.data;

    if (response.status !== 200 || !data.words) {
      logger.error('what3words API error:', data);
      return res.json({
        success: false,
        error: data.error?.message || 'Failed to convert coordinates',
        words: null,
        requestId: req.requestId
      });
    }

    logger.success('what3words conversion successful', { words: data.words });

    res.json({
      success: true,
      words: data.words,
      coordinates: {
        lat,
        lng
      },
      nearestPlace: data.nearestPlace || null,
      country: data.country || null,
      language: data.language || 'en',
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('what3words conversion error:', error);
    // Graceful fallback - don't break the page
    res.json({
      success: false,
      error: 'Failed to convert location to what3words',
      words: null,
      requestId: req.requestId
    });
  }
}

module.exports = {
  convertToWhat3Words,
  convertToWhat3WordsPost,
  getAutosuggest,
  getLegacyWhat3words,
  uploadWhat3wordsImage
};