/**
 * Witness and Vehicle PDF Generation Service
 *
 * Generates individual PDF pages for witnesses and vehicles
 * that can be appended to the main incident report.
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const adobePdfService = require('./adobePdfService');

class WitnessVehiclePdfService {
  constructor() {
    this.templatePath = path.join(__dirname, '../../pdf-templates/Car-Crash-Lawyer-AI-Witness-Vehicle-Template.pdf');
  }

  /**
   * Helper to set form field values safely
   */
  setFieldValue(form, fieldName, value) {
    try {
      const field = form.getTextField(fieldName);
      if (field && value !== null && value !== undefined) {
        field.setText(String(value));
      }
    } catch (error) {
      // Field might not exist or might be wrong type - that's okay
      logger.debug(`Field "${fieldName}" not found or wrong type`);
    }
  }

  /**
   * Generate PDF for a single witness
   *
   * @param {Object} witnessData - Witness record from database
   * @param {string} userId - User ID for PDF header
   * @returns {Promise<Buffer>} - PDF buffer (1 page)
   */
  async generateWitnessPdf(witnessData, userId) {
    try {
      if (!fs.existsSync(this.templatePath)) {
        throw new Error('Witness template not found: ' + this.templatePath);
      }

      logger.info(`📋 Generating witness PDF for: ${witnessData.witness_name}`);

      // Load the template
      const templateBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.create();
      const templateDoc = await PDFDocument.load(templateBytes);

      // Copy page 0 (witness page) from template
      const [witnessPage] = await pdfDoc.copyPages(templateDoc, [0]);
      pdfDoc.addPage(witnessPage);

      // Get the form and fill witness fields
      const form = pdfDoc.getForm();

      this.setFieldValue(form, 'User ID', userId || '');
      this.setFieldValue(form, 'Witness Name', witnessData.witness_name || '');
      this.setFieldValue(form, 'Witness Address', witnessData.witness_address || '');
      this.setFieldValue(form, 'Witness Mobile', witnessData.witness_mobile_number || '');
      this.setFieldValue(form, 'Witness Email', witnessData.witness_email_address || '');
      this.setFieldValue(form, 'Witness Statement', witnessData.witness_statement || '');

      // Flatten form to prevent editing
      form.flatten();

      // Save as buffer
      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      logger.info(`✅ Witness PDF generated (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);

      // Compress if Adobe service available
      if (adobePdfService.isReady()) {
        try {
          const compressed = await adobePdfService.compressPdf(pdfBuffer, 'MEDIUM');
          logger.info(`🗜️ Compressed witness PDF from ${(pdfBuffer.length / 1024).toFixed(2)} KB to ${(compressed.length / 1024).toFixed(2)} KB`);
          return compressed;
        } catch (compressError) {
          logger.warn('Compression failed, returning uncompressed PDF:', compressError.message);
          return pdfBuffer;
        }
      }

      return pdfBuffer;

    } catch (error) {
      logger.error('Error generating witness PDF:', error);
      throw error;
    }
  }

  /**
   * Generate PDF for a single vehicle
   *
   * @param {Object} vehicleData - Vehicle record from database
   * @param {string} userId - User ID for PDF header
   * @returns {Promise<Buffer>} - PDF buffer (1 page)
   */
  async generateVehiclePdf(vehicleData, userId) {
    try {
      if (!fs.existsSync(this.templatePath)) {
        throw new Error('Vehicle template not found: ' + this.templatePath);
      }

      logger.info(`🚗 Generating vehicle PDF for: ${vehicleData.vehicle_license_plate}`);

      // Load the template
      const templateBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.create();
      const templateDoc = await PDFDocument.load(templateBytes);

      // Copy page 1 (vehicle page) from template
      const [vehiclePage] = await pdfDoc.copyPages(templateDoc, [1]);
      pdfDoc.addPage(vehiclePage);

      // Get the form and fill vehicle fields
      const form = pdfDoc.getForm();

      // Fill vehicle fields (matching template field names exactly)
      this.setFieldValue(form, 'User ID', userId || '');
      this.setFieldValue(form, 'Additional Driver Name', vehicleData.driver_name || '');
      this.setFieldValue(form, 'Additional Driver Adress', vehicleData.driver_address || ''); // Note: template has typo "Adress"
      this.setFieldValue(form, 'Additional Driver Mobile', vehicleData.driver_phone || '');
      this.setFieldValue(form, 'Additional Driver email:', vehicleData.driver_email || '');
      this.setFieldValue(form, 'Additional registration Number', vehicleData.vehicle_license_plate || '');
      this.setFieldValue(form, 'Additional Make of Vehicle', vehicleData.vehicle_make || '');
      this.setFieldValue(form, 'Additional Model of Vehicle', vehicleData.vehicle_model || '');
      this.setFieldValue(form, 'Additional Vehicle Colour', vehicleData.vehicle_color || '');
      this.setFieldValue(form, 'Additional Vehicle Year', vehicleData.vehicle_year_of_manufacture || '');
      this.setFieldValue(form, 'Additional Insurance Company', vehicleData.insurance_company || '');
      this.setFieldValue(form, 'Additional Policy Cover', vehicleData.policy_cover || '');
      this.setFieldValue(form, 'Additional Policy Holder', vehicleData.policy_holder || '');

      // DVLA-specific fields (if available from DVLA lookup)
      this.setFieldValue(form, 'Additional MOT status:', vehicleData.mot_status || '');
      this.setFieldValue(form, 'Additional MOT expiry Date', vehicleData.mot_expiry_date || '');
      this.setFieldValue(form, 'Additional Tax Status', vehicleData.tax_status || '');
      this.setFieldValue(form, 'Additional Tax expiry Date', vehicleData.tax_due_date || '');
      this.setFieldValue(form, 'Additional Fuel Type', vehicleData.fuel_type || '');
      this.setFieldValue(form, 'Additional Engine Capacity', vehicleData.engine_capacity || '');

      // Flatten form to prevent editing
      form.flatten();

      // Save as buffer
      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      logger.info(`✅ Vehicle PDF generated (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);

      // Compress if Adobe service available
      if (adobePdfService.isReady()) {
        try {
          const compressed = await adobePdfService.compressPdf(pdfBuffer, 'MEDIUM');
          logger.info(`🗜️ Compressed vehicle PDF from ${(pdfBuffer.length / 1024).toFixed(2)} KB to ${(compressed.length / 1024).toFixed(2)} KB`);
          return compressed;
        } catch (compressError) {
          logger.warn('Compression failed, returning uncompressed PDF:', compressError.message);
          return pdfBuffer;
        }
      }

      return pdfBuffer;

    } catch (error) {
      logger.error('Error generating vehicle PDF:', error);
      throw error;
    }
  }

  /**
   * Merge multiple PDFs into one
   * Useful for combining witness/vehicle PDFs with main incident report
   *
   * @param {Array<Buffer>} pdfBuffers - Array of PDF buffers to merge
   * @returns {Promise<Buffer>} - Merged PDF buffer
   */
  async mergePdfs(pdfBuffers) {
    try {
      if (!pdfBuffers || pdfBuffers.length === 0) {
        throw new Error('No PDF buffers provided for merging');
      }

      logger.info(`📦 Merging ${pdfBuffers.length} PDF(s)...`);

      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < pdfBuffers.length; i++) {
        const pdfDoc = await PDFDocument.load(pdfBuffers[i]);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const mergedBuffer = Buffer.from(mergedBytes);

      logger.info(`✅ PDFs merged successfully (${(mergedBuffer.length / 1024).toFixed(2)} KB)`);

      return mergedBuffer;

    } catch (error) {
      logger.error('Error merging PDFs:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new WitnessVehiclePdfService();
