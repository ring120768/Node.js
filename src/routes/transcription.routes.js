
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
  transcribeAudio,
  getTranscriptionHistory,
  getTranscription
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
 * Requires: audio file, authenticated user
 */
router.post('/transcribe', upload.single('audio'), transcribeAudio);

/**
 * GET /api/transcription/history
 * Get transcription history for authenticated user
 * Returns: list of transcriptions from storage
 */
router.get('/history', getTranscriptionHistory);

/**
 * GET /api/transcription/:transcriptionId
 * Get specific transcription by ID for authenticated user
 * Returns: transcription data
 */
router.get('/:transcriptionId', getTranscription);

module.exports = router;
