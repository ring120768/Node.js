/**
 * Temporary Image Upload Routes
 * Handles immediate image uploads during form completion
 *
 * Routes:
 * POST   /api/images/temp-upload              - Upload single image to temp storage
 * GET    /api/images/temp-uploads/:sessionId  - Get all temp uploads for session
 * DELETE /api/images/temp-upload/:uploadId    - Delete a temp upload
 */

const express = require('express');
const router = express.Router();
const tempImageUploadController = require('../controllers/tempImageUpload.controller');

/**
 * Upload image to temporary storage
 * Used when user selects/captures image during form completion
 */
router.post('/temp-upload',
  tempImageUploadController.upload,
  tempImageUploadController.tempUpload
);

/**
 * Get all temp uploads for a session
 * Used to restore state if user refreshes page
 */
router.get('/temp-uploads/:sessionId',
  tempImageUploadController.getTempUploads
);

/**
 * Delete a temp upload
 * Used when user removes an uploaded image before final submission
 */
router.delete('/temp-upload/:uploadId',
  tempImageUploadController.deleteTempUpload
);

module.exports = router;
