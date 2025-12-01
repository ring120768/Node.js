/**
 * AI Analysis Routes
 * Handles AI-powered analysis of personal statements and incident reports
 */

const express = require('express');
const { apiLimiter, readOnlyLimiter } = require('../middleware/rateLimit');
const { authenticateUser } = require('../middleware/auth');

// Import controller functions
const {
  analyzeStatement,
  getAnalysis
} = require('../controllers/ai.controller');

const router = express.Router();

// Apply authentication middleware (optional - can work without auth)
// router.use(authenticateUser);

/**
 * POST /api/ai/analyze-statement
 * Analyze personal statement with AI
 * Rate limited: 100 requests per 15 minutes (write operation)
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
router.post('/analyze-statement', apiLimiter, analyzeStatement);

/**
 * GET /api/ai/analysis/:incidentId
 * Retrieve existing AI analysis for an incident
 * Rate limited: 500 requests per 15 minutes (read-only operation)
 *
 * Returns:
 * {
 *   success: true,
 *   analysis: {
 *     summary: string,
 *     keyPoints: string[],
 *     review: {
 *       quality: string,
 *       missingInfo: string[],
 *       suggestions: string[]
 *     },
 *     combinedReport: string (HTML),
 *     finalReview: {
 *       strengths: string (HTML),
 *       nextSteps: string[],
 *       legalConsiderations: string (HTML)
 *     }
 *   } | null
 * }
 */
router.get('/analysis/:incidentId', readOnlyLimiter, getAnalysis);

module.exports = router;
