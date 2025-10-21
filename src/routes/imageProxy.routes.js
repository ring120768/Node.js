/**
 * Image Proxy Routes
 * Serves images from Supabase storage through the backend
 */

const express = require('express');
const router = express.Router();
const imageProxyController = require('../controllers/imageProxy.controller');

// Proxy image by document ID
router.get('/images/:documentId', imageProxyController.proxyImage);

// Proxy image by user ID and document type
router.get('/images/user/:userId/type/:documentType', imageProxyController.proxyImageByType);

// Get thumbnail (future enhancement)
router.get('/images/:documentId/thumbnail', imageProxyController.proxyThumbnail);

module.exports = router;