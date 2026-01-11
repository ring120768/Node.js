const express = require('express');
const router = express.Router();
const accountController = require('../controllers/account.controller');

/**
 * Account Deletion Routes
 * Handles GDPR-compliant account and data deletion requests
 */

// POST /api/account/delete
// Process account deletion request with authentication
router.post('/delete', accountController.deleteAccount);

module.exports = router;
