
/**
 * Transcription Routes
 * Defines all transcription-related API endpoints
 */

const express = require('express');
const multer = require('multer');
const { checkGDPRConsent } = require('../middleware/gdpr');
const { apiLimiter, strictLimiter } = require('../middleware/rateLimit');
const config = require('../config');
const CONSTANTS = config.constants;

// Import controller functions
const {
  transcribe,
  getStatus,
  updateTranscription,
  saveTranscription,
  getLatestTranscription,
  getAllTranscriptions
} = require('../controllers/transcription.controller');

const router = express.Router();

// Configure multer for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CONSTANTS.FILE_SIZE_LIMITS.AUDIO,
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg',
      'audio/mp4', 'audio/m4a', 'audio/aac'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`));
    }
  }
});

// Apply rate limiting to transcription routes
router.use(strictLimiter);

/**
 * POST /api/transcription/transcribe
 * Upload audio file for transcription via Whisper API
 * Requires: audio file, create_user_id
 * Optional: incident_report_id
 */
router.post('/transcribe', upload.single('audio'), transcribe);

/**
 * GET /api/transcription/status/:queueId
 * Check transcription processing status
 * Returns: status, transcription text, error (if any)
 */
router.get('/status/:queueId', getStatus);

/**
 * POST /api/transcription/update
 * Update/edit transcription text manually
 * Requires: userId, transcription text
 * Optional: queueId for WebSocket updates
 * GDPR: Requires consent check
 */
router.post('/update', checkGDPRConsent, updateTranscription);

/**
 * POST /api/transcription/save
 * Save transcription data to database
 * Requires: userId, transcription text
 * Optional: incidentId, audioUrl, duration
 * GDPR: Requires consent check
 */
router.post('/save', checkGDPRConsent, saveTranscription);

/**
 * GET /api/transcription/user/:userId/latest
 * Get latest transcription for a user
 * Returns: transcription data with AI summary
 * GDPR: Logs data access
 */
router.get('/user/:userId/latest', getLatestTranscription);

/**
 * GET /api/transcription/user/:userId/all
 * Get all transcriptions for a user with pagination
 * Query params: limit, offset, includeSummary
 * GDPR: Logs data access
 */
router.get('/user/:userId/all', getAllTranscriptions);

module.exports = router;
