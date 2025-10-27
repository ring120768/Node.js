/**
 * Image Upload Routes
 * Handles post-signup image uploads from users
 */

const express = require('express');
const router = express.Router();
const imageUploadController = require('../controllers/imageUpload.controller');

/**
 * Upload images for existing user
 * POST /api/images/upload
 *
 * Used by /upload-images.html page
 */
router.post('/upload', imageUploadController.upload, imageUploadController.uploadImages);

module.exports = router;
