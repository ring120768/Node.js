
/**
 * Emergency Routes for Car Crash Lawyer AI
 * Handles emergency contact management and emergency call logging
 */

const express = require('express');
const emergencyController = require('../controllers/emergency.controller');

const router = express.Router();

/**
 * Get Emergency Contact Number (singular)
 * GET /api/emergency/contact/:userId
 */
router.get('/contact/:userId', emergencyController.getEmergencyContact);

/**
 * Update Emergency Contact Number
 * PUT /api/emergency/contact/:userId
 * Body: { emergencyContact: string }
 */
router.put('/contact/:userId', emergencyController.updateEmergencyContact);

/**
 * Get emergency contacts (plural - for backward compatibility)
 * GET /api/emergency/contacts/:userId
 */
router.get('/contacts/:userId', emergencyController.getEmergencyContacts);

/**
 * Log emergency call
 * POST /api/emergency/log-call
 * Body: { user_id, service_called, timestamp, incident_id? }
 */
router.post('/log-call', emergencyController.logEmergencyCall);

/**
 * Save Emergency Audio Recording (AI Eavesdropper)
 * POST /api/emergency/audio
 * Body: { userId, incidentId?, audioUrl?, transcriptionText, recordedAt? }
 */
router.post('/audio', emergencyController.saveEmergencyAudio);

/**
 * Get Emergency Audio Recordings
 * GET /api/emergency/audio/:userId
 * Query params: incidentId? (optional filter)
 */
router.get('/audio/:userId', emergencyController.getEmergencyAudio);

module.exports = router;
