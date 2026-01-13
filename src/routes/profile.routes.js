/**
 * Profile Routes
 */

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { requireAuth } = require('../middleware/authMiddleware');

// All profile routes require authentication
router.use(requireAuth);

// GET /api/profile/:userId - Get user profile
router.get('/:userId', profileController.getUserProfile);

// PUT /api/profile/:userId - Update user profile
router.put('/:userId', profileController.updateUserProfile);

// POST /api/profile/update-fcm-token - Update FCM token for push notifications
router.post('/update-fcm-token', profileController.updateFcmToken);

// POST /api/profile/send-pdf-email/:userId - Send PDF report via email
router.post('/send-pdf-email/:userId', profileController.sendPdfEmail);

// POST /api/profile/send-image-links/:userId - Send image download links via email
router.post('/send-image-links/:userId', profileController.sendImageLinks);

module.exports = router;
