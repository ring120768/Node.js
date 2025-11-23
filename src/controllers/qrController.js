/**
 * QR Code Controller
 * Generates QR codes for the Car Crash Lawyer AI app
 * Supports PNG and SVG formats with customizable options
 */

const QRCode = require('qrcode');
const logger = require('../utils/logger');

/**
 * Generate QR code for the app URL
 * GET /api/qr/app - Returns QR code as PNG image
 * GET /api/qr/app?format=svg - Returns QR code as SVG
 * GET /api/qr/app?download=true - Downloads QR code
 * GET /api/qr/app?size=500 - Custom size (default: 300)
 */
async function generateAppQRCode(req, res) {
  try {
    // Determine the app URL (Railway or local)
    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : `${req.protocol}://${req.get('host')}`;

    const format = req.query.format || 'png';
    const download = req.query.download === 'true';
    const size = parseInt(req.query.size) || 300;

    // Validate size
    if (size < 100 || size > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Size must be between 100 and 2000 pixels'
      });
    }

    const qrOptions = {
      errorCorrectionLevel: 'H', // High error correction (30% damage tolerance)
      type: format === 'svg' ? 'svg' : 'image/png',
      width: size,
      margin: 2,
      color: {
        dark: '#0E7490',  // Deep Teal (brand color)
        light: '#FFFFFF'
      }
    };

    logger.info('Generating QR code', { url: baseUrl, format, size });

    if (format === 'svg') {
      const svgString = await QRCode.toString(baseUrl, { ...qrOptions, type: 'svg' });
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      if (download) {
        res.setHeader('Content-Disposition', 'attachment; filename="car-crash-lawyer-qr.svg"');
      }
      return res.send(svgString);
    } else {
      const buffer = await QRCode.toBuffer(baseUrl, qrOptions);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      if (download) {
        res.setHeader('Content-Disposition', 'attachment; filename="car-crash-lawyer-qr.png"');
      }
      return res.send(buffer);
    }
  } catch (error) {
    logger.error('QR code generation failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code'
    });
  }
}

/**
 * Generate QR code for a custom URL
 * POST /api/qr/generate
 * Body: { url: string, size?: number, format?: 'png'|'svg' }
 * Returns: { success: boolean, qrCode: string (data URL or SVG), format: string }
 */
async function generateCustomQRCode(req, res) {
  try {
    const { url, size = 300, format = 'png' } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    // Validate size
    if (size < 100 || size > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Size must be between 100 and 2000 pixels'
      });
    }

    const qrOptions = {
      errorCorrectionLevel: 'H',
      type: format === 'svg' ? 'svg' : 'image/png',
      width: size,
      margin: 2,
      color: {
        dark: '#0E7490',
        light: '#FFFFFF'
      }
    };

    logger.info('Generating custom QR code', { url, format, size });

    if (format === 'svg') {
      const svgString = await QRCode.toString(url, { ...qrOptions, type: 'svg' });
      return res.json({
        success: true,
        qrCode: svgString,
        format: 'svg'
      });
    } else {
      const dataUrl = await QRCode.toDataURL(url, qrOptions);
      return res.json({
        success: true,
        qrCode: dataUrl, // Base64 encoded PNG
        format: 'png'
      });
    }
  } catch (error) {
    logger.error('Custom QR code generation failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code'
    });
  }
}

/**
 * Get QR code info (app URL without generating QR code)
 * GET /api/qr/info
 * Returns: { success: boolean, url: string, domain: string }
 */
function getQRInfo(req, res) {
  try {
    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : `${req.protocol}://${req.get('host')}`;

    res.json({
      success: true,
      url: baseUrl,
      domain: req.get('host'),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    logger.error('Failed to get QR info', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get QR code information'
    });
  }
}

module.exports = {
  generateAppQRCode,
  generateCustomQRCode,
  getQRInfo
};
