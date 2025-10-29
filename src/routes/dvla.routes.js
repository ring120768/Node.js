// src/routes/dvla.routes.js

/**
 * DVLA API Routes
 * Dedicated routes for UK vehicle registration lookups
 *
 * Frontend-friendly GET endpoint for incident form pages
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const dvlaService = require('../services/dvlaService');

/**
 * Vehicle Lookup via DVLA API
 * GET /api/dvla/lookup?registration=AB12CDE
 *
 * Frontend-friendly endpoint for incident form pages
 * Returns vehicle details from UK DVLA database
 */
router.get('/lookup', async (req, res) => {
  try {
    const { registration } = req.query;

    // Validation
    if (!registration) {
      return res.status(400).json({
        success: false,
        error: 'License plate number is required'
      });
    }

    logger.info('DVLA lookup request', { registration });

    // Call DVLA service
    const result = await dvlaService.lookupVehicle(registration);

    if (!result.success) {
      logger.warn('DVLA lookup failed', { registration, error: result.error });
      return res.status(404).json({
        success: false,
        error: result.error || 'Vehicle not found'
      });
    }

    // Success response
    logger.info('DVLA lookup successful', { registration, make: result.data.make, model: result.data.model });

    res.json({
      success: true,
      vehicle: {
        make: result.data.make,
        model: result.data.model,
        colour: result.data.colour || result.data.color,
        yearOfManufacture: result.data.yearOfManufacture || result.data.year_of_manufacture,
        fuelType: result.data.fuelType || result.data.fuel_type,
        taxStatus: result.data.taxStatus || result.data.tax_status,
        taxDueDate: result.data.taxDueDate || result.data.tax_due_date,
        motStatus: result.data.motStatus || result.data.mot_status,
        motExpiryDate: result.data.motExpiryDate || result.data.mot_expiry_date
      }
    });

  } catch (error) {
    logger.error('DVLA lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to look up vehicle details. Please try again.'
    });
  }
});

/**
 * Vehicle Status Check (MOT, Tax, Insurance)
 * GET /api/dvla/status?registration=AB12CDE
 *
 * Beta endpoint for checking MOT, Tax, and Insurance status
 */
router.get('/status', async (req, res) => {
  try {
    const { registration } = req.query;

    if (!registration) {
      return res.status(400).json({
        success: false,
        error: 'License plate number is required'
      });
    }

    // For now, return mock data (beta feature)
    // TODO: Integrate with real MOT API when available
    res.json({
      success: true,
      status: {
        mot: {
          valid: true,
          expiryDate: '2024-11-15',
          status: 'Valid'
        },
        tax: {
          valid: true,
          expiryDate: '2024-12-01',
          status: 'Taxed'
        },
        insurance: {
          status: 'Unknown',
          message: 'Insurance data not available via API'
        }
      }
    });

  } catch (error) {
    logger.error('Vehicle status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check vehicle status. Please try again.'
    });
  }
});

module.exports = router;
