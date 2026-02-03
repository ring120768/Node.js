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

// GET /api/profile/pdf-stats/:userId - Get PDF statistics
router.get('/pdf-stats/:userId', profileController.getPdfStats);

// Phase 1: Editable contact details (safe fields)
// GET /api/profile/contact-details - Get current contact details
router.get('/contact-details', profileController.getContactDetails);

// PATCH /api/profile/contact-details - Update contact details
router.patch('/contact-details', profileController.updateContactDetails);

// Phase 2: Editable vehicle details
// GET /api/profile/vehicle-details - Get vehicle information
router.get('/vehicle-details', profileController.getVehicleDetails);

// PATCH /api/profile/vehicle-details - Update vehicle information
router.patch('/vehicle-details', profileController.updateVehicleDetails);

// Phase 2: Editable insurance details
// GET /api/profile/insurance-details - Get insurance information
router.get('/insurance-details', profileController.getInsuranceDetails);

// PATCH /api/profile/insurance-details - Update insurance information
router.patch('/insurance-details', profileController.updateInsuranceDetails);

// Phase 2: Editable driving license details
// GET /api/profile/license-details - Get driving license information
router.get('/license-details', profileController.getLicenseDetails);

// PATCH /api/profile/license-details - Update driving license information
router.patch('/license-details', profileController.updateLicenseDetails);

module.exports = router;
