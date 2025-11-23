/**
 * QR Code Routes
 * Endpoints for generating QR codes for the Car Crash Lawyer AI app
 */

const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');

/**
 * GET /api/qr/app
 * Generate QR code for the app URL
 * Query params:
 *   - format: 'png' | 'svg' (default: 'png')
 *   - size: number (default: 300, range: 100-2000)
 *   - download: boolean (default: false)
 *
 * Examples:
 *   GET /api/qr/app                           -> PNG QR code (300x300)
 *   GET /api/qr/app?format=svg                -> SVG QR code
 *   GET /api/qr/app?size=500                  -> PNG QR code (500x500)
 *   GET /api/qr/app?download=true             -> Download PNG
 *   GET /api/qr/app?format=svg&download=true  -> Download SVG
 */
router.get('/app', qrController.generateAppQRCode);

/**
 * POST /api/qr/generate
 * Generate QR code for a custom URL
 * Body:
 *   - url: string (required)
 *   - size: number (optional, default: 300)
 *   - format: 'png' | 'svg' (optional, default: 'png')
 *
 * Returns JSON with QR code as data URL (PNG) or SVG string
 *
 * Example:
 *   POST /api/qr/generate
 *   { "url": "https://example.com", "size": 400, "format": "svg" }
 */
router.post('/generate', qrController.generateCustomQRCode);

/**
 * GET /api/qr/info
 * Get information about the app URL (without generating QR code)
 *
 * Returns:
 *   - url: Full app URL
 *   - domain: Domain name
 *   - environment: Current environment
 */
router.get('/info', qrController.getQRInfo);

module.exports = router;
