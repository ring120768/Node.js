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
 * Accepts: application/json with:
 * - Text fields: name, email, address, etc.
 * - Temp image paths: pre-uploaded images (from immediate upload)
 * - temp_session_id: session ID for temp uploads
 *
 * Images are uploaded immediately when selected (prevents ERR_UPLOAD_FILE_CHANGED)
 * This endpoint moves temp files to permanent storage and claims them.
 *
 * Returns: { success: true, userId: uuid, email: string }
 */
router.post('/submit', signupController.submitSignup);

module.exports = router;
