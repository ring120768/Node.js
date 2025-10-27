/**
 * Signup Routes
 * Handles user signup form submission from custom HTML form
 */

const express = require('express');
const router = express.Router();
const signupController = require('../controllers/signup.controller');

/**
 * Submit user signup form
 * POST /api/signup/submit
 *
 * Accepts: multipart/form-data with:
 * - Text fields: name, email, address, etc.
 * - File uploads: 5 images (license + 4 vehicle photos)
 *
 * Returns: { success: true, userId: uuid, email: string }
 */
router.post('/submit', signupController.upload, signupController.submitSignup);

module.exports = router;
