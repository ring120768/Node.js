/**
 * Image Upload Routes
 * Handles post-signup image uploads from users
 */

const express = require('express');
const router = express.Router();
const imageUploadController = require('../controllers/imageUpload.controller');
const { requireAuth } = require('../middleware/authMiddleware');

/**
 * Upload images for existing user
 * POST /api/images/upload
 *
 * Used by /upload-images.html page
 */
router.post('/upload', imageUploadController.upload, imageUploadController.uploadImages);

/**
 * Dashboard image upload/replace
 * POST /api/images/dashboard-upload
 *
 * Authenticated endpoint for users to upload or replace images from dashboard
 * Supports all document types (signup, scene, damage, other vehicle, location)
 */
router.post('/dashboard-upload',
  requireAuth,
  imageUploadController.dashboardUploadMiddleware,
  imageUploadController.dashboardUpload
);

module.exports = router;
