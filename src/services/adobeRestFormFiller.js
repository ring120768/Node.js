/**
 * Adobe PDF Services REST API - Form Filling Service
 *
 * Uses Adobe's REST API directly to fill PDF forms with 100% reliability.
 * This bypasses the Node.js SDK which doesn't yet support form filling operations.
 *
 * @see https://developer.adobe.com/document-services/docs/apis/#tag/PDF-Form
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const logger = require('../utils/logger');
const config = require('../config');

class AdobeRestFormFillerService {
  constructor() {
    this.clientId = config.adobe.clientId;
    this.clientSecret = config.adobe.clientSecret;
    this.baseUrl = 'https://pdf-services.adobe.io';
    this.authUrl = 'https://ims-na1.adobelogin.com/ims/token/v3';  // Adobe IMS OAuth endpoint
    this.templatePath = path.join(__dirname, '../../pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf');

    // Cache access token (valid for 24 hours)
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Check if service is properly configured
   */
  isReady() {
    const ready = !!(this.clientId && this.clientSecret);
    if (!ready) {
      logger.warn('Adobe REST Form Filler not configured - missing credentials');
    }
    return ready;
  }

  /**
   * Get OAuth access token (cached for 24 hours)
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      logger.info('🔐 Getting Adobe access token...');

      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'openid,AdobeID,read_organizations'
      });

      const response = await axios.post(this.authUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      this.accessToken = response.data.access_token;
      // Token expires in 24 hours, cache for 23 hours to be safe
      this.tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);

      logger.info('✅ Adobe access token obtained');
      return this.accessToken;

    } catch (error) {
      logger.error('❌ Failed to get Adobe access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Adobe PDF Services');
    }
  }

  /**
   * Upload PDF asset to Adobe
   * @returns {string} assetID
   */
  async uploadAsset(pdfBuffer, accessToken) {
    try {
      logger.info('📤 Uploading PDF template to Adobe...');

      // Step 1: Create upload URI
      const uploadUriResponse = await axios.post(
        `${this.baseUrl}/assets`,
        { mediaType: 'application/pdf' },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-API-Key': this.clientId,
            'Content-Type': 'application/json'
          }
        }
      );

      const { uploadUri, assetID } = uploadUriResponse.data;
      logger.info(`  Upload URI obtained: ${assetID}`);

      // Step 2: Upload PDF binary to the URI
      await axios.put(uploadUri, pdfBuffer, {
        headers: { 'Content-Type': 'application/pdf' },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      logger.info(`✅ PDF template uploaded (Asset ID: ${assetID})`);
      return assetID;

    } catch (error) {
      logger.error('❌ Failed to upload PDF asset:', error.response?.data || error.message);
      throw new Error('Failed to upload PDF to Adobe');
    }
  }

  /**
   * Poll job status until completion
   */
  async pollJobStatus(statusUrl, accessToken, maxAttempts = 30) {
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const statusResponse = await axios.get(statusUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-API-Key': this.clientId
          }
        });

        const { status, asset, error } = statusResponse.data;

        if (status === 'done') {
          logger.info('✅ Form filling completed successfully');
          return asset.assetID;
        }

        if (status === 'failed') {
          logger.error('❌ Form filling failed:', error);
          throw new Error(`Form filling failed: ${error?.message || 'Unknown error'}`);
        }

        // Still in progress, wait before next poll
        logger.info(`  Polling (${attempts}/${maxAttempts})... Status: ${status}`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      } catch (error) {
        if (error.message.includes('Form filling failed')) {
          throw error;
        }
        logger.warn(`  Polling attempt ${attempts} failed:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error('Form filling timed out after 60 seconds');
  }

  /**
   * Download filled PDF from Adobe
   */
  async downloadAsset(assetId, accessToken) {
    try {
      logger.info('📥 Downloading filled PDF...');

      // Get download URI
      const assetResponse = await axios.get(
        `${this.baseUrl}/assets/${assetId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-API-Key': this.clientId
          }
        }
      );

      const downloadUri = assetResponse.data.downloadUri;

      // Download PDF binary
      const pdfResponse = await axios.get(downloadUri, {
        responseType: 'arraybuffer'
      });

      logger.info('✅ Filled PDF downloaded');
      return Buffer.from(pdfResponse.data);

    } catch (error) {
      logger.error('❌ Failed to download PDF:', error.response?.data || error.message);
      throw new Error('Failed to download filled PDF from Adobe');
    }
  }

  /**
   * Prepare form data by converting all values to strings
   * (Adobe requires all values as strings, even numbers and booleans)
   */
  prepareFormData(data) {
    const formData = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        // Skip null/undefined values
        continue;
      }

      // Handle boolean values (true/false)
      if (typeof value === 'boolean') {
        if (value === true) {
          // Explicit list of fields that require "On" export value
          const fieldsUsingOn = new Set([
            // Medical symptoms (mixed - specific fields discovered through testing)
            'medical_symptom_abdominal_bruising',
            'medical_symptom_uncontrolled_bleeding',
            // Weather fields that use "On" (some weather fields use "Yes")
            'weather_snow',
            'weather_ice',
            'weather_fog',
            'weather_thunder_lightning',
            'weather_heavy_rain',
            'weather_clear',
            'weather_bright_sunlight',
            'weather_cloudy',
            // Road condition fields (only adverse conditions use "On", normal conditions use "Yes")
            'road_condition_icy',
            // Road type fields (mixed - specific fields discovered through testing)
            'road_type_private_road',
            'road_type_a_road',
            'road_type_b_road',
            // Special condition fields (mixed - narrow_road and parked_vehicles use "Yes")
            'special_condition_roadworks',
            'special_condition_workmen',
            'special_condition_cyclists',
            'special_condition_pedestrians',
            'special_condition_traffic_calming',
            'special_condition_crossing',
            'special_condition_school_zone',
            'special_condition_potholes',
            'special_condition_oil_spills',
            'special_condition_animals',
            // Traffic conditions (mixed - moderate uses "On", heavy uses "Yes")
            'traffic_conditions_moderate',
            // Visibility fields (mixed - most use "On", large_vehicle uses "Yes")
            'visibility_good',
            'visibility_poor',
            'visibility_street_lights',
            'visibility_clear',
            'visibility_restricted_structure',
            'visibility_restricted_bend',
            'visibility_sun_glare',
            // Vehicle impact points (mixed - specific fields discovered through testing)
            'impact_point_rear_passenger'
          ]);

          formData[key] = fieldsUsingOn.has(key) ? 'On' : 'Yes';
        }
        // Skip false values - unchecked checkboxes should be left unset
      }
      // Handle string boolean values from database ('yes', 'true', 'no', 'false')
      else if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();

        // Check if this is a boolean-like string
        if (lowerValue === 'yes' || lowerValue === 'true') {
          // Same whitelist as above for consistent handling
          const fieldsUsingOn = new Set([
            'medical_symptom_abdominal_bruising',
            'medical_symptom_uncontrolled_bleeding',
            'weather_snow',
            'weather_ice',
            'weather_fog',
            'weather_thunder_lightning',
            'weather_heavy_rain',
            'weather_clear',
            'weather_bright_sunlight',
            'weather_cloudy',
            'road_condition_icy',
            'road_type_private_road',
            'road_type_a_road',
            'road_type_b_road',
            'special_condition_roadworks',
            'special_condition_workmen',
            'special_condition_cyclists',
            'special_condition_pedestrians',
            'special_condition_traffic_calming',
            'special_condition_crossing',
            'special_condition_school_zone',
            'special_condition_potholes',
            'special_condition_oil_spills',
            'special_condition_animals',
            'traffic_conditions_moderate',
            'visibility_good',
            'visibility_poor',
            'visibility_street_lights',
            'visibility_clear',
            'visibility_restricted_structure',
            'visibility_restricted_bend',
            'visibility_sun_glare',
            'impact_point_rear_passenger'
          ]);

          formData[key] = fieldsUsingOn.has(key) ? 'On' : 'Yes';
        } else if (lowerValue === 'no' || lowerValue === 'false') {
          // Skip - unchecked checkboxes should be left unset
          continue;
        } else {
          // Regular string value (not boolean-like)
          formData[key] = String(value);
        }
      } else if (typeof value === 'object') {
        // Skip objects (images, nested data)
        continue;
      } else {
        // Convert everything else to string
        formData[key] = String(value);
      }
    }

    return formData;
  }

  /**
   * Fill PDF form using Adobe REST API
   * @param {Object} data - Form field data (field_name: value)
   * @returns {Buffer} Filled PDF buffer
   */
  async fillForm(data) {
    if (!this.isReady()) {
      throw new Error('Adobe REST Form Filler Service not configured');
    }

    try {
      logger.info('📝 Starting Adobe REST API form filling...');
      logger.info(`  Fields to fill: ${Object.keys(data).length}`);

      // Load template
      const templateBuffer = fs.readFileSync(this.templatePath);
      logger.info(`  Template loaded: ${(templateBuffer.length / 1024).toFixed(2)} KB`);

      // Get access token
      const accessToken = await this.getAccessToken();

      // Upload template PDF
      const assetId = await this.uploadAsset(templateBuffer, accessToken);

      // Prepare form data (convert to strings)
      const formData = this.prepareFormData(data);
      logger.info(`  Form data prepared: ${Object.keys(formData).length} fields with values`);

      // Submit form filling job
      logger.info('🚀 Submitting form filling job to Adobe...');
      const jobResponse = await axios.post(
        `${this.baseUrl}/operation/setformdata`,
        {
          assetID: assetId,
          jsonFormFieldsData: formData
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-API-Key': this.clientId,
            'Content-Type': 'application/json'
          }
        }
      );

      // Get status URL from response headers
      const statusUrl = jobResponse.headers['location'];
      if (!statusUrl) {
        throw new Error('No status URL returned from Adobe');
      }

      logger.info(`  Job submitted successfully`);
      logger.info(`  Status URL: ${statusUrl}`);

      // Poll for completion
      const resultAssetId = await this.pollJobStatus(statusUrl, accessToken);

      // Download filled PDF
      const filledPdfBuffer = await this.downloadAsset(resultAssetId, accessToken);

      logger.info(`✅ PDF form filled successfully (${(filledPdfBuffer.length / 1024).toFixed(2)} KB)`);
      return filledPdfBuffer;

    } catch (error) {
      logger.error('❌ Error filling PDF form with Adobe REST API:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new AdobeRestFormFillerService();
