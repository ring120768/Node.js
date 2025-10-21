/**
 * Profile Routes
 */

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// All profile routes require authentication
router.use(authMiddleware);

// GET /api/profile/:userId - Get user profile
router.get('/:userId', profileController.getUserProfile);

// PUT /api/profile/:userId - Update user profile
router.put('/:userId', profileController.updateUserProfile);

module.exports = router;
