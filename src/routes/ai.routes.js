/**
 * AI Analysis Routes
 * Handles AI-powered analysis of personal statements and incident reports
 */

const express = require('express');
const { apiLimiter } = require('../middleware/rateLimit');
const { authenticateUser } = require('../middleware/auth');

// Import controller functions
const {
  analyzeStatement
} = require('../controllers/ai.controller');

const router = express.Router();

// Apply rate limiting to AI routes (generous limits for AI operations)
router.use(apiLimiter);

// Apply authentication middleware (optional - can work without auth)
// router.use(authenticateUser);

/**
 * POST /api/ai/analyze-statement
 * Analyze personal statement with AI
 *
 * Body:
 * {
 *   userId: string,
 *   incidentId: string (optional),
 *   transcription: string
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   analysis: {
 *     summary: string,
 *     keyPoints: string[],
 *     faultAnalysis: string,
 *     review: {
 *       quality: string,
 *       missingInfo: string[],
 *       suggestions: string[]
 *     },
 *     combinedReport: string (HTML),
 *     finalReview: {
 *       completenessScore: number,
 *       strengths: string (HTML),
 *       nextSteps: string[],
 *       legalConsiderations: string (HTML)
 *     }
 *   }
 * }
 */
router.post('/analyze-statement', analyzeStatement);

module.exports = router;
