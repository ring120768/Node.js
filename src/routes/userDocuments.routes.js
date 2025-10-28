/**
 * User Documents Routes
 * API endpoints for users to access their documents
 *
 * Endpoints:
 * - GET    /api/user-documents              - List all documents
 * - GET    /api/user-documents/stats        - Get statistics
 * - GET    /api/user-documents/:id          - Get specific document
 * - GET    /api/user-documents/:id/download - Download document
 * - POST   /api/user-documents/:id/refresh-url - Refresh signed URL
 * - PATCH  /api/user-documents/:id          - Update document metadata
 * - DELETE /api/user-documents/:id          - Delete document (soft delete)
 */

const express = require('express');
const router = express.Router();
const userDocumentsController = require('../controllers/userDocuments.controller');

// Note: In production, add proper authentication middleware
// const { requireAuth } = require('../middleware/auth');
// router.use(requireAuth);

/**
 * GET /api/user-documents
 * List all documents for the authenticated user
 *
 * Query params:
 * - status: Filter by status (pending, processing, completed, failed)
 * - document_type: Filter by type (driving_license, vehicle_front, etc.)
 * - document_category: Filter by category (user_signup, incident_report, other)
 * - limit: Number of results (default: 100)
 * - offset: Pagination offset (default: 0)
 * - user_id: User ID (for testing without auth)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "documents": [...],
 *     "pagination": {
 *       "total": 10,
 *       "limit": 100,
 *       "offset": 0,
 *       "has_more": false
 *     }
 *   }
 * }
 */
router.get('/', userDocumentsController.listUserDocuments);

/**
 * GET /api/user-documents/stats
 * Get document statistics for the user
 *
 * Query params:
 * - user_id: User ID (for testing without auth)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "total_documents": 10,
 *     "pending_documents": 0,
 *     "processing_documents": 0,
 *     "completed_documents": 8,
 *     "failed_documents": 2,
 *     "total_size_bytes": 5242880,
 *     "document_types": {
 *       "driving_license": 1,
 *       "vehicle_front": 1,
 *       ...
 *     }
 *   }
 * }
 */
router.get('/stats', userDocumentsController.getDocumentStats);

/**
 * GET /api/user-documents/:id
 * Get specific document details
 *
 * Params:
 * - id: Document UUID
 *
 * Query params:
 * - user_id: User ID (for testing without auth)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "create_user_id": "user123",
 *     "document_type": "driving_license",
 *     "status": "completed",
 *     "storage_path": "user-documents/user123/...",
 *     "signed_url": "https://...",
 *     ...
 *   }
 * }
 */
router.get('/:id', userDocumentsController.getDocument);

/**
 * GET /api/user-documents/:id/download
 * Download a document (redirects to signed URL)
 *
 * Params:
 * - id: Document UUID
 *
 * Query params:
 * - user_id: User ID (for testing without auth)
 *
 * Response:
 * Redirects to Supabase Storage signed URL
 */
router.get('/:id/download', userDocumentsController.downloadDocument);

/**
 * POST /api/user-documents/:id/refresh-url
 * Generate a fresh signed URL for a document
 *
 * Params:
 * - id: Document UUID
 *
 * Body:
 * {
 *   "expiry_seconds": 3600  // Optional, default: 3600 (1 hour)
 * }
 *
 * Query params:
 * - user_id: User ID (for testing without auth)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "signed_url": "https://...",
 *     "expires_in": 3600,
 *     "document_id": "uuid"
 *   }
 * }
 */
router.post('/:id/refresh-url', userDocumentsController.refreshSignedUrl);

/**
 * PATCH /api/user-documents/:id
 * Update document metadata (type, category, notes)
 *
 * Params:
 * - id: Document UUID
 *
 * Body:
 * {
 *   "document_type": "driving_license",  // Optional
 *   "document_category": "identification", // Optional
 *   "notes": "Updated notes"  // Optional
 * }
 *
 * Query params:
 * - user_id: User ID (for testing without auth)
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Document updated successfully",
 *   "data": { ... }
 * }
 */
router.patch('/:id', userDocumentsController.updateDocument);

/**
 * DELETE /api/user-documents/:id
 * Soft delete a document (GDPR compliance)
 *
 * Params:
 * - id: Document UUID
 *
 * Query params:
 * - user_id: User ID (for testing without auth)
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Document deleted successfully",
 *   "document_id": "uuid"
 * }
 */
router.delete('/:id', userDocumentsController.deleteDocument);

module.exports = router;
