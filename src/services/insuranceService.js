/**
 * Insurance Service for Car Crash Lawyer AI
 * Integrates with UK Vehicle Data API for Insurance ABI code lookup
 *
 * API Provider: https://ukvehicledata.co.uk
 * Documentation: https://panel.ukvehicledata.co.uk/api-documentation
 *
 * Cost: ~£0.05-0.15 per lookup (estimated)
 * Future Plan: Switch to askMID direct access at 100 users (£774/year unlimited)
 */

const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

class InsuranceService {
  constructor() {
    this.apiKey = config.insurance?.apiKey || process.env.INSURANCE_API_KEY;
    this.apiUrl = 'https://uk1.ukvehicledata.co.uk/api/datapackage';
    this.isConfigured = !!this.apiKey;

    if (!this.isConfigured) {
      logger.warn('Insurance API not configured - insurance lookups will be skipped');
    }
  }

  /**
   * Check if insurance service is available
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Lookup insurance details for a vehicle
   * @param {string} registration - UK vehicle registration number
   * @returns {Promise<Object>} Insurance lookup result
   */
  async lookupInsurance(registration) {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Insurance API not configured',
        errorCode: 'NOT_CONFIGURED',
        data: null
      };
    }

    try {
      logger.info('Insurance lookup requested', { registration });

      const response = await axios.get(this.apiUrl, {
        params: {
          v: '2',
          api_nullitems: '1',
          auth_apikey: this.apiKey,
          user_tag: 'car-crash-lawyer-ai',
          key_VRM: registration.trim().toUpperCase()
        },
        timeout: 10000 // 10 second timeout
      });

      // Check for API errors
      if (response.data.Response?.StatusCode !== 'Success') {
        const errorMessage = response.data.Response?.StatusMessage || 'Unknown error';
        logger.warn('Insurance lookup failed', {
          registration,
          error: errorMessage,
          statusCode: response.data.Response?.StatusCode
        });

        return {
          success: false,
          error: errorMessage,
          errorCode: response.data.Response?.StatusCode || 'LOOKUP_FAILED',
          data: null
        };
      }

      // Extract insurance data
      const vehicleData = response.data.Response?.DataItems?.VehicleRegistration;

      if (!vehicleData) {
        return {
          success: false,
          error: 'No vehicle data returned',
          errorCode: 'NO_DATA',
          data: null
        };
      }

      const insuranceData = {
        abi_code: vehicleData.AbiCode || null,
        insurance_group: vehicleData.InsuranceGroup || null,
        insurance_company: vehicleData.InsuranceCompany || null,
        has_insurance_data: !!(vehicleData.AbiCode || vehicleData.InsuranceGroup)
      };

      logger.success('Insurance lookup successful', {
        registration,
        has_abi_code: !!insuranceData.abi_code,
        insurance_group: insuranceData.insurance_group
      });

      return {
        success: true,
        data: insuranceData,
        error: null
      };

    } catch (error) {
      logger.error('Error during insurance lookup:', error);

      // Handle specific error types
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Request timeout - API not responding',
          errorCode: 'TIMEOUT',
          data: null
        };
      }

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Invalid API key',
          errorCode: 'AUTH_ERROR',
          data: null
        };
      }

      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          errorCode: 'RATE_LIMIT',
          data: null
        };
      }

      return {
        success: false,
        error: error.message || 'Insurance lookup failed',
        errorCode: 'INTERNAL_ERROR',
        data: null
      };
    }
  }

  /**
   * Format insurance data for display
   * @param {Object} insuranceData - Insurance data from lookup
   * @returns {string} Formatted insurance status
   */
  formatInsuranceStatus(insuranceData) {
    if (!insuranceData || !insuranceData.has_insurance_data) {
      return 'Unable to verify';
    }

    let status = [];

    if (insuranceData.abi_code) {
      status.push(`ABI Code: ${insuranceData.abi_code}`);
    }

    if (insuranceData.insurance_group) {
      status.push(`Group ${insuranceData.insurance_group}`);
    }

    return status.join(' | ') || 'Data found';
  }

  /**
   * Get insurance verification status for alerts
   * @param {Object} insuranceData - Insurance data from lookup
   * @returns {Object} Alert status
   */
  getInsuranceAlertStatus(insuranceData) {
    if (!insuranceData) {
      return {
        hasAlert: true,
        level: 'warning',
        message: '⚠️ Insurance status could not be verified - Manual check required'
      };
    }

    if (!insuranceData.has_insurance_data) {
      return {
        hasAlert: true,
        level: 'warning',
        message: '⚠️ No insurance data found - Manual verification recommended'
      };
    }

    return {
      hasAlert: false,
      level: 'success',
      message: '✅ Insurance data found in system'
    };
  }
}

module.exports = new InsuranceService();
