/**
 * Incident Form Routes - In-House HTML Forms
 *
 * API endpoints for multi-page incident report submission.
 *
 * Endpoints:
 * - POST /api/incident-form/submit        - Submit complete form (all pages)
 * - POST /api/incident-form/save-progress - Save partial progress
 * - GET  /api/incident-form/:id           - Get existing incident report
 */

const express = require('express');
const router = express.Router();
const incidentFormController = require('../controllers/incidentForm.controller');
const { requireAuth } = require('../middleware/auth');

// All endpoints require authentication
router.use(requireAuth);

/**
 * POST /api/incident-form/submit
 * Submit complete incident report (all pages)
 *
 * Request Body:
 * {
 *   page1: {
 *     incident_date: "2025-01-01",
 *     incident_time: "14:30",
 *     location_address: "123 High Street",
 *     ...
 *   },
 *   page2: {
 *     medical_attention_needed: "yes",
 *     medical_injury_details: "Whiplash",
 *     ...
 *   },
 *   page3: {
 *     weather_clear: true,
 *     visibility_good: true,
 *     road_condition_dry: true,
 *     your_speed: "30",
 *     ...
 *   },
 *   page4: {
 *     special_conditions: ["junction", "heavy_traffic"],
 *     ...
 *   },
 *   page4a: {
 *     session_id: "abc-123-def-456",
 *     photos: [...]
 *   },
 *   ... pages 5-12
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "incident_id": "uuid",
 *     "created_at": "2025-01-01T14:30:00Z",
 *     "photos": {
 *       "finalized": 3,
 *       "failed": 0,
 *       "photos": [...]
 *     }
 *   }
 * }
 */
router.post('/submit', incidentFormController.submitIncidentForm);

/**
 * POST /api/incident-form/save-progress
 * Save partial form progress (not yet submitted)
 *
 * Request Body:
 * {
 *   "pages": {
 *     "page1": {...},
 *     "page2": {...}
 *   },
 *   "lastCompletedPage": 2
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Progress saved",
 *   "data": {
 *     "last_completed_page": 2
 *   }
 * }
 */
router.post('/save-progress', incidentFormController.saveProgress);

/**
 * GET /api/incident-form/:id
 * Get existing incident report by ID
 *
 * Params:
 * - id: Incident report UUID
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "incident": {...},
 *     "photos": [...]
 *   }
 * }
 */
router.get('/:id', incidentFormController.getIncidentReport);

module.exports = router;
