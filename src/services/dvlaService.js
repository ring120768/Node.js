/**
 * DVLA Service for Car Crash Lawyer AI
 * Handles vehicle information lookups from UK DVLA API
 *
 * API Documentation: https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service/vehicle-enquiry-service-description.html
 *
 * Features:
 * - Vehicle details lookup by registration number
 * - Automatic retry with exponential backoff
 * - Error categorization
 * - Rate limiting protection
 */

const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

class DVLAService {
  constructor() {
    this.baseUrl = config.dvla.baseUrl;
    this.apiKey = config.dvla.apiKey;
    this.enabled = config.dvla.enabled;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second initial delay
  }

  /**
   * Lookup vehicle information by registration number
   * @param {string} registrationNumber - UK vehicle registration (e.g., "AB12CDE")
   * @returns {Object} Vehicle information or error details
   */
  async lookupVehicle(registrationNumber) {
    if (!this.enabled) {
      logger.warn('DVLA API is not enabled (missing API key)');
      return {
        success: false,
        error: 'DVLA API not configured',
        errorCode: 'API_DISABLED'
      };
    }

    // Validate and format registration number
    const formattedReg = this.formatRegistrationNumber(registrationNumber);
    if (!formattedReg) {
      return {
        success: false,
        error: 'Invalid registration number format',
        errorCode: 'INVALID_REGISTRATION'
      };
    }

    logger.info('Looking up vehicle via DVLA API', { registration: formattedReg });

    try {
      const response = await this.makeRequestWithRetry(formattedReg);

      if (response.success) {
        logger.success('DVLA lookup successful', {
          registration: formattedReg,
          make: response.data.make,
          model: response.data.model
        });
      }

      return response;

    } catch (error) {
      logger.error('DVLA lookup failed after retries', {
        registration: formattedReg,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        errorCode: this.categorizeError(error)
      };
    }
  }

  /**
   * Make DVLA API request with retry logic
   * @private
   */
  async makeRequestWithRetry(registrationNumber, attempt = 1) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/vehicles`,
        { registrationNumber },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      // DVLA returns vehicle data in response.data
      return {
        success: true,
        data: {
          registration: response.data.registrationNumber,
          make: response.data.make,
          model: response.data.model || response.data.monthOfFirstRegistration,
          color: response.data.colour,
          year_of_manufacture: response.data.yearOfManufacture,
          fuel_type: response.data.fuelType,
          engine_capacity: response.data.engineCapacity,
          co2_emissions: response.data.co2Emissions,
          tax_status: response.data.taxStatus,
          tax_due_date: response.data.taxDueDate,
          mot_status: response.data.motStatus,
          mot_expiry_date: response.data.motExpiryDate,
          type_approval: response.data.typeApproval,
          date_of_last_v5c_issued: response.data.dateOfLastV5CIssued,
          marked_for_export: response.data.markedForExport,
          vehicle_status: response.data.vehicleStatus,
          euro_status: response.data.euroStatus,
          real_driving_emissions: response.data.realDrivingEmissions,
          wheelplan: response.data.wheelplan,
          revenue_weight: response.data.revenueWeight
        },
        rawResponse: response.data
      };

    } catch (error) {
      // Check if we should retry
      if (this.shouldRetry(error, attempt)) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        logger.warn(`DVLA API retry ${attempt}/${this.maxRetries}`, {
          registration: registrationNumber,
          delay,
          error: error.message
        });

        await this.sleep(delay);
        return this.makeRequestWithRetry(registrationNumber, attempt + 1);
      }

      // No more retries
      throw error;
    }
  }

  /**
   * Determine if request should be retried
   * @private
   */
  shouldRetry(error, attempt) {
    if (attempt >= this.maxRetries) {
      return false;
    }

    // Retry on network errors and 5xx server errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    if (error.response) {
      const status = error.response.status;
      // Retry on 5xx errors and 429 (rate limit)
      return status >= 500 || status === 429;
    }

    return false;
  }

  /**
   * Categorize error for better handling
   * @private
   */
  categorizeError(error) {
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return 'TIMEOUT';
      }
      return 'NETWORK_ERROR';
    }

    const status = error.response.status;

    switch (status) {
      case 400:
        return 'INVALID_REQUEST';
      case 403:
        return 'AUTH_ERROR';
      case 404:
        return 'VEHICLE_NOT_FOUND';
      case 429:
        return 'RATE_LIMIT';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'SERVER_ERROR';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Format and validate UK registration number
   * Removes spaces and converts to uppercase
   * @private
   */
  formatRegistrationNumber(registrationNumber) {
    if (!registrationNumber || typeof registrationNumber !== 'string') {
      return null;
    }

    // Remove spaces and convert to uppercase
    const formatted = registrationNumber.replace(/\s+/g, '').toUpperCase();

    // UK registration format validation (basic)
    // Accepts: AB12CDE, A123BCD, etc.
    const ukRegex = /^[A-Z]{1,2}[0-9]{1,4}[A-Z]{1,3}$/;

    if (!ukRegex.test(formatted)) {
      logger.warn('Invalid UK registration format', { registration: registrationNumber });
      return null;
    }

    return formatted;
  }

  /**
   * Sleep utility for retry delays
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test DVLA API connection
   * Useful for health checks
   */
  async testConnection() {
    if (!this.enabled) {
      return {
        success: false,
        message: 'DVLA API not configured (missing API key)'
      };
    }

    // Test with a known invalid registration to verify API is responding
    try {
      await this.lookupVehicle('TEST123');
      return {
        success: true,
        message: 'DVLA API is accessible'
      };
    } catch (error) {
      return {
        success: false,
        message: `DVLA API connection failed: ${error.message}`
      };
    }
  }
}

// Export singleton instance
module.exports = new DVLAService();
