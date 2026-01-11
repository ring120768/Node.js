const express = require('express');
const router = express.Router();
const deletionController = require('../controllers/deletion.controller');
const { authenticateToken } = require('../middleware/auth');

/**
 * Individual deletion endpoints
 * All routes require authentication
 * Users can only delete their own data (verified in controller)
 */

// Delete individual document/photo
router.delete('/document/:id', authenticateToken, deletionController.deleteDocument);

// Delete incident report (and associated witnesses/vehicles)
router.delete('/report/:id', authenticateToken, deletionController.deleteReport);

// Delete completed PDF
router.delete('/pdf/:id', authenticateToken, deletionController.deletePdf);

// Delete transcription (and audio file)
router.delete('/transcription/:id', authenticateToken, deletionController.deleteTranscription);

module.exports = router;
