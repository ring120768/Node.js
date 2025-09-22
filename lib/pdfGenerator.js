// lib/pdfGenerator.js
// This file handles the generation of PDF reports from collected data
// It uses pdf-lib to fill a template PDF with dynamic data

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

/**
 * Generate a complete PDF report from collected incident data
 * This function fills a pre-designed PDF template with user data
 * 
 * @param {object} data - All data fetched from Supabase via dataFetcher
 * @returns {Buffer} PDF file as a buffer ready to save or email
 * @throws {Error} If PDF generation fails
 */
async function generatePDF(data) {
  try {
    console.log('📝 Starting PDF generation...');
    console.log(`   User: ${data.user?.driver_name || 'Unknown'}`);

    // ========================================
    // STEP 1: Load the PDF Template
    // ========================================
    // The template.pdf contains all the form fields we'll fill
    const templatePath = path.join(process.cwd(), 'template.pdf');
    console.log('   Loading template from:', templatePath);

    const existingPdfBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Get the form object - this contains all fillable fields
    const form = pdfDoc.getForm();

    // ========================================
    // Helper Functions for Safe Field Operations
    // ========================================

    /**
     * Safely set text in a PDF form field
     * This prevents errors if a field doesn't exist in the template
     * 
     * @param {string} fieldName - Name of the field in the PDF
     * @param {any} value - Value to set (will be converted to string)
     * @param {string} fallback - Optional fallback value if main value is empty
     */
    const setFieldText = (fieldName, value, fallback = '') => {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          // Convert value to string and use fallback if empty
          const textValue = String(value || fallback || '');
          field.setText(textValue);
        } else {
          // Log missing fields for debugging (you might have typos in field names)
          console.warn(`   ⚠️ Field not found in template: ${fieldName}`);
        }
      } catch (error) {
        console.warn(`   ⚠️ Error setting field ${fieldName}:`, error.message);
      }
    };

    /**
     * Safely check or uncheck a checkbox field
     * 
     * @param {string} fieldName - Name of the checkbox field
     * @param {boolean} shouldCheck - Whether to check (true) or uncheck (false)
     */
    const checkField = (fieldName, shouldCheck) => {
      try {
        const field = form.getCheckBox(fieldName);
        if (field) {
          if (shouldCheck) {
            field.check();
          } else {
            field.uncheck();
          }
        }
      } catch (error) {
        console.warn(`   ⚠️ Error checking field ${fieldName}:`, error.message);
      }
    };

    /**
     * Format a date string for display
     * Converts ISO dates to UK format (DD/MM/YYYY)
     * 
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date or empty string
     */
    const formatDate = (dateString) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');  // UK format
      } catch {
        return dateString;  // Return as-is if parsing fails
      }
    };

    /**
     * Convert boolean-like values to actual booleans
     * Handles various formats: 'Yes', 'true', true, 1, etc.
     * 
     * @param {any} value - Value to convert
     * @returns {boolean} True or false
     */
    const toBoolean = (value) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lowered = value.toLowerCase();
        return lowered === 'yes' || lowered === 'true' || lowered === '1';
      }
      return !!value;  // Convert truthy/falsy values
    };

    // Extract main data objects for easier access
    const user = data.user || {};
    const incident = data.currentIncident || {};
    const aiTranscription = data.aiTranscription || {};
    const aiSummary = data.aiSummary || {};

    console.log('   Filling PDF fields...');

    // ========================================
    // PAGE 1: Personal Information
    // ========================================
    console.log('   📄 Page 1: Personal Information');

    setFieldText('user_id', data.metadata.create_user_id);
    setFieldText('driver_name', user.driver_name);
    setFieldText('driver_surname', user.driver_surname);
    setFieldText('driver_email', user.driver_email);
    setFieldText('driver_mobile', user.driver_mobile);
    setFieldText('driver_street', user.driver_street);
    setFieldText('driver_town', user.driver_town);
    setFieldText('driver_postcode', user.driver_postcode);
    setFieldText('driver_country', user.driver_country, 'United Kingdom');
    setFieldText('license_number', user.license_number);

    // Vehicle Information
    setFieldText('license_plate', user.license_plate);
    setFieldText('vehicle_make', user.vehicle_make);
    setFieldText('vehicle_model', user.vehicle_model);
    setFieldText('vehicle_colour', user.vehicle_colour);
    setFieldText('vehicle_condition', user.vehicle_condition);
    setFieldText('recovery_company', user.recovery_company);
    setFieldText('recovery_breakdown_number', user.recovery_breakdown_number);
    setFieldText('recovery_breakdown_email', user.recovery_breakdown_email);

    // ========================================
    // PAGE 2: Emergency & Insurance
    // ========================================
    console.log('   📄 Page 2: Emergency & Insurance');

    setFieldText('emergency_contact', user.emergency_contact);
    setFieldText('emergency_contact_name', user.emergency_contact_name);
    setFieldText('emergency_contact_number', user.emergency_contact_number);

    setFieldText('insurance_company', user.insurance_company);
    setFieldText('policy_number', user.policy_number);
    setFieldText('policy_holder', user.policy_holder);
    setFieldText('cover_type', user.cover_type);
    setFieldText('sign_up_date', formatDate(user.sign_up_date));

    // ========================================
    // PAGE 3-4: Safety Assessment
    // ========================================
    console.log('   📄 Pages 3-4: Safety Assessment');

    setFieldText('form_id', incident.id);
    setFieldText('submit_date', formatDate(incident.created_at));

    checkField('safe_ready', toBoolean(incident.are_you_safe_and_ready_to_complete_this_form));
    checkField('medical_attention_required', toBoolean(incident.medical_attention_required));

    setFieldText('how_feeling', incident.how_are_you_feeling);
    setFieldText('medical_attention_who', incident.medical_attention_from_who);
    setFieldText('medical_further', incident.medical_further_attention);

    checkField('six_point_check', toBoolean(incident.six_point_safety_check_completed));
    checkField('emergency_contact_made', toBoolean(incident.emergency_contact_made));

    // Medical symptoms checkboxes
    const medicalChecks = [
      'chest_pain', 'uncontrolled_bleeding', 'breathlessness', 'limb_weakness',
      'loss_consciousness', 'severe_headache', 'abdominal_bruising', 'change_vision',
      'abdominal_pain', 'limb_pain', 'none_feel_fine'
    ];

    medicalChecks.forEach(symptom => {
      // Handle different naming conventions in the database
      const dbFieldName = symptom.replace('_', '_of_') // e.g., loss_consciousness -> loss_of_consciousness
                                  .replace('limb_pain', 'limb_pain_impeding_mobility')
                                  .replace('none_feel_fine', 'none_of_these_i_feel_fine');
      checkField(symptom, toBoolean(incident[dbFieldName]));
    });

    setFieldText('medical_conditions_summary', incident.medical_conditions_summary);

    // ========================================
    // PAGE 5: Accident Details & Weather
    // ========================================
    console.log('   📄 Page 5: Accident Details & Weather');

    checkField('wearing_seatbelts', toBoolean(incident.wearing_seatbelts));
    checkField('airbags_deployed', toBoolean(incident.airbags_deployed));
    setFieldText('why_no_seatbelts', incident.why_werent_seat_belts_being_worn);
    checkField('vehicle_damaged', toBoolean(incident.was_your_vehicle_damaged));

    setFieldText('accident_date', formatDate(incident.when_did_the_accident_happen));
    setFieldText('accident_time', incident.what_time_did_the_accident_happen);
    setFieldText('accident_location', incident.where_exactly_did_the_accident_happen);

    // Weather conditions checkboxes
    const weatherConditions = {
      'weather_overcast': 'overcast_dull',
      'weather_heavy_rain': 'heavy_rain',
      'weather_wet_road': 'wet_road',
      'weather_fog': 'fog_poor_visibility',
      'weather_street_lights': 'street_lights',
      'weather_dusk': 'dusk',
      'weather_clear_dry': 'clear_and_dry',
      'weather_snow_ice': 'snow_ice_on_road',
      'weather_light_rain': 'light_rain',
      'weather_bright_daylight': 'bright_daylight'
    };

    Object.entries(weatherConditions).forEach(([pdfField, dbField]) => {
      checkField(pdfField, toBoolean(incident[dbField]));
    });

    setFieldText('weather_summary', incident.weather_conditions_summary);

    // ========================================
    // PAGE 6: Road Details
    // ========================================
    console.log('   📄 Page 6: Road Details');

    setFieldText('road_type', incident.road_type);
    setFieldText('speed_limit', incident.speed_limit);
    setFieldText('junction_info', incident.junction_information);
    setFieldText('special_conditions', incident.special_conditions);
    setFieldText('accident_description', incident.describe_what_happened);

    // ========================================
    // PAGE 7: Your Vehicle Information
    // ========================================
    console.log('   📄 Page 7: Your Vehicle');

    setFieldText('driving_usual', incident.driving_usual_vehicle);
    setFieldText('make_of_car', incident.make_of_car);
    setFieldText('model_of_car', incident.model_of_car);
    setFieldText('your_license_plate', incident.license_plate_incident);
    setFieldText('direction_speed', incident.direction_of_travel_and_estimated_speed);
    setFieldText('impact_point', incident.impact_point);
    setFieldText('damage_caused', incident.damage_caused_by_accident);
    setFieldText('damage_prior', incident.damage_prior_to_accident);

    // ========================================
    // PAGE 8: Other Vehicles
    // ========================================
    console.log('   📄 Page 8: Other Vehicles');

    checkField('other_vehicles', toBoolean(incident.other_vehicles_involved));
    setFieldText('other_driver_name', incident.other_driver_name);
    setFieldText('other_driver_number', incident.other_driver_number);
    setFieldText('other_driver_address', incident.other_driver_address);
    setFieldText('other_make', incident.other_make_of_vehicle);
    setFieldText('other_model', incident.other_model_of_vehicle);
    setFieldText('other_license', incident.other_vehicle_license_plate);
    setFieldText('other_policy_number', incident.other_policy_number);
    setFieldText('other_insurance', incident.other_insurance_company);
    setFieldText('other_cover_type', incident.other_policy_cover_type);
    setFieldText('other_policy_holder', incident.other_policy_holder);

    // ========================================
    // PAGE 9: Police Involvement
    // ========================================
    console.log('   📄 Page 9: Police Involvement');

    checkField('police_attended', toBoolean(incident.did_the_police_attend_the_scene));
    setFieldText('accident_reference', incident.accident_reference_number);
    setFieldText('officer_name', incident.police_officer_name);
    setFieldText('officer_badge', incident.police_officer_badge_number);
    setFieldText('police_force', incident.police_force_details);
    checkField('breath_test', toBoolean(incident.breath_test));
    checkField('other_breath_test', toBoolean(incident.other_breath_test));

    // ========================================
    // PAGE 10: Additional Info
    // ========================================
    console.log('   📄 Page 10: Additional Info');

    setFieldText('anything_else', incident.anything_else_important);
    checkField('witness_present', toBoolean(incident.witness_present));
    setFieldText('witness_info', incident.witness_information);
    checkField('call_recovery', toBoolean(incident.call_recovery));
    checkField('upgrade_premium', toBoolean(incident.upgrade_to_premium));

    // ========================================
    // PAGES 11-12: Evidence URLs
    // ========================================
    console.log('   📄 Pages 11-12: Evidence URLs');

    // Use signed URLs if available, fallback to incident URLs
    setFieldText('documents_url', data.imageUrls.document || incident.file_url_documents || '');
    setFieldText('documents_url_1', data.imageUrls.document_2 || incident.file_url_documents_1 || '');
    setFieldText('record_account_url', data.imageUrls.audio_account || incident.file_url_record_detailed_account_of_what_happened || '');
    setFieldText('what3words_url', data.imageUrls.what3words || incident.file_url_what3words || '');
    setFieldText('scene_overview_url', data.imageUrls.scene_overview || incident.file_url_scene_overview || '');
    setFieldText('scene_overview_url_1', data.imageUrls.scene_overview_2 || incident.file_url_scene_overview_1 || '');
    setFieldText('other_vehicle_url', data.imageUrls.other_vehicle || incident.file_url_other_vehicle || '');
    setFieldText('other_vehicle_url_1', data.imageUrls.other_vehicle_2 || incident.file_url_other_vehicle_1 || '');
    setFieldText('vehicle_damage_url', data.imageUrls.vehicle_damage || incident.file_url_vehicle_damage || '');
    setFieldText('vehicle_damage_url_1', data.imageUrls.vehicle_damage_2 || incident.file_url_vehicle_damage_1 || '');
    setFieldText('vehicle_damage_url_2', data.imageUrls.vehicle_damage_3 || incident.file_url_vehicle_damage_2 || '');

    // ========================================
    // PAGE 13: AI Transcription (NEW!)
    // ========================================
    console.log('   📄 Page 13: AI Transcription');

    if (aiTranscription && aiTranscription.transcription_text) {
      // We have AI transcription data
      setFieldText('transcription_text', aiTranscription.transcription_text);
      setFieldText('ai_transcription', aiTranscription.transcription_text);  // Try both field names
      setFieldText('transcription_date', formatDate(aiTranscription.created_at));
      console.log('   ✅ AI Transcription added');
    } else {
      // Fallback to incident field if no AI transcription
      const fallbackText = incident.detailed_account_of_what_happened || 
                          'No audio transcription available';
      setFieldText('transcription_text', fallbackText);
      setFieldText('ai_transcription', fallbackText);
      console.log('   ⚠️ No AI transcription, using fallback');
    }

    // ========================================
    // PAGE 14: AI Summary (NEW!)
    // ========================================
    console.log('   📄 Page 14: AI Summary');

    if (aiSummary && aiSummary.summary_text) {
      // We have AI summary data
      setFieldText('ai_summary', aiSummary.summary_text);
      setFieldText('summary_text', aiSummary.summary_text);  // Try alternate field name

      // Format key points as a numbered list
      if (aiSummary.key_points && Array.isArray(aiSummary.key_points)) {
        const keyPointsFormatted = aiSummary.key_points
          .map((point, index) => `${index + 1}. ${point}`)
          .join('\n');
        setFieldText('key_points', keyPointsFormatted);
        console.log(`   ✅ Added ${aiSummary.key_points.length} key points`);
      }

      // Add fault analysis
      setFieldText('fault_analysis', aiSummary.fault_analysis || 'Analysis pending');

      // Add contributing factors (might be named differently in database)
      const contributingFactors = aiSummary.contributing_factors || 
                                  aiSummary.liability_assessment || 
                                  'Factors under review';
      setFieldText('contributing_factors', contributingFactors);

      console.log('   ✅ AI Summary added');
    } else {
      // Fallback if no AI summary available
      const fallbackSummary = incident.ai_summary_of_data_collected || 
                             'AI analysis pending';
      setFieldText('ai_summary', fallbackSummary);
      setFieldText('summary_text', fallbackSummary);
      console.log('   ⚠️ No AI summary, using fallback');
    }

    // ========================================
    // PAGES 15-16: DVLA Vehicle Information
    // ========================================
    console.log('   📄 Pages 15-16: DVLA Information');

    if (data.dvla && data.dvla.length > 0) {
      // User's vehicle DVLA info
      const userDvla = data.dvla[0];
      setFieldText('dvla_driver_name', userDvla.driver_name);
      setFieldText('dvla_registration', userDvla.registration_number);
      setFieldText('dvla_make', userDvla.make);
      setFieldText('dvla_month_manufacture', userDvla.month_of_manufacture);
      setFieldText('dvla_colour', userDvla.colour);
      setFieldText('dvla_year_manufacture', userDvla.year_of_manufacture);
      setFieldText('dvla_mot_status', userDvla.mot_status);
      setFieldText('dvla_road_tax', userDvla.road_tax_status);
      setFieldText('dvla_mot_renewal', formatDate(userDvla.mot_expiry_date));
      setFieldText('dvla_tax_renewal', formatDate(userDvla.tax_due_date));
      setFieldText('dvla_fuel_type', userDvla.fuel_type);
      setFieldText('dvla_co2', userDvla.co2_emissions);
      setFieldText('dvla_revenue_weight', userDvla.revenue_weight);
      setFieldText('dvla_engine_capacity', userDvla.engine_capacity);
      setFieldText('dvla_wheelplan', userDvla.wheelplan);
      setFieldText('dvla_type_approval', userDvla.type_approval);
      setFieldText('dvla_v5c_issued', formatDate(userDvla.date_of_last_v5c_issued));
      console.log('   ✅ User DVLA data added');

      // Other vehicle DVLA info (if available)
      if (data.dvla.length > 1) {
        const otherDvla = data.dvla[1];
        setFieldText('other_dvla_name', otherDvla.driver_name);
        setFieldText('other_dvla_registration', otherDvla.registration_number);
        setFieldText('other_dvla_make', otherDvla.make);
        setFieldText('other_dvla_month_manufacture', otherDvla.month_of_manufacture);
        setFieldText('other_dvla_colour', otherDvla.colour);
        setFieldText('other_dvla_year_registration', otherDvla.year_of_manufacture);
        setFieldText('other_dvla_mot_status', otherDvla.mot_status);
        setFieldText('other_dvla_road_tax', otherDvla.road_tax_status);
        setFieldText('other_dvla_mot_renewal', formatDate(otherDvla.mot_expiry_date));
        setFieldText('other_dvla_tax_renewal', formatDate(otherDvla.tax_due_date));
        setFieldText('other_dvla_fuel_type', otherDvla.fuel_type);
        setFieldText('other_dvla_co2', otherDvla.co2_emissions);
        setFieldText('other_dvla_revenue_weight', otherDvla.revenue_weight);
        setFieldText('other_dvla_engine_capacity', otherDvla.engine_capacity);
        setFieldText('other_dvla_wheelplan', otherDvla.wheelplan);
        setFieldText('other_dvla_type_approval', otherDvla.type_approval);
        setFieldText('other_dvla_v5c_issued', formatDate(otherDvla.date_of_last_v5c_issued));
        setFieldText('other_dvla_marked_export', otherDvla.marked_for_export);
        console.log('   ✅ Other vehicle DVLA data added');
      }
    } else {
      console.log('   ⚠️ No DVLA data available');
    }

    // ========================================
    // PAGE 17: Declaration
    // ========================================
    console.log('   📄 Page 17: Declaration');

    const fullName = `${user.driver_name || ''} ${user.driver_surname || ''}`.trim() || 'Not provided';
    setFieldText('declaration_name', fullName);
    setFieldText('declaration_date', formatDate(new Date()));
    setFieldText('declaration_signature', fullName);  // Electronic signature

    // ========================================
    // Finalize the PDF
    // ========================================
    console.log('   🔒 Finalizing PDF...');

    // Flatten the form to make fields read-only
    // This prevents anyone from editing the PDF after generation
    form.flatten();

    // Save the PDF to a buffer
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`);
    console.log(`   Total pages: ${pdfDoc.getPageCount()}`);

    return pdfBuffer;

  } catch (error) {
    console.error('❌ Critical error generating PDF:', error);
    console.error('   Stack trace:', error.stack);
    throw error;  // Re-throw so calling function knows generation failed
  }
}

// Export the function for use in other modules
module.exports = { generatePDF };