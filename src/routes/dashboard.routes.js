/**
 * Dashboard Routes
 * Routes for user dashboard - viewing incident reports and media
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

// Get all reports for authenticated user
router.get('/reports', dashboardController.getReports);

// Get detailed report with media files
router.get('/reports/:id', dashboardController.getReportDetails);

module.exports = router;
