// lib/pdfGenerator.js
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

/**
 * Generate PDF from collected data
 * @param {object} data - All data fetched from Supabase
 * @returns {Buffer} PDF buffer
 */
async function generatePDF(data) {
  try {
    console.log('📝 Starting PDF generation...');

    // Load the PDF template
    const templatePath = path.join(process.cwd(), 'pdf-templates/Car-Crash-Lawyer-AI-Incident-Report.pdf');
    const existingPdfBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Get the form from the PDF
    const form = pdfDoc.getForm();

    // Helper function to safely set field text
    const setFieldText = (fieldName, value) => {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          field.setText(value || '');
        } else {
          console.warn(`Field not found: ${fieldName}`);
        }
      } catch (error) {
        console.warn(`Error setting field ${fieldName}:`, error.message);
      }
    };

    // Helper function to check checkbox
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
        console.warn(`Error checking field ${fieldName}:`, error.message);
      }
    };

    // Helper function to set signature field (for dates/timestamps)
    const setSignatureField = (fieldName, value) => {
      try {
        const field = form.getSignature(fieldName);
        if (field) {
          // Signature fields can't be filled programmatically with pdf-lib
          // Skip silently - Adobe PDF Services may handle these differently
          console.log(`Skipping signature field: ${fieldName} (requires manual signing)`);
        }
      } catch (error) {
        // Field doesn't exist or isn't a signature field - ignore silently
      }
    };

    // Fill Personal Information (Page 1)
    const user = data.user || {};
    setFieldText('create_user_id', data.metadata.create_user_id);
    // PDF has both old (driver_name) and new (name) field variations
    setFieldText('name', user.name);
    setFieldText('driver_name', user.name);
    setFieldText('surname', user.surname);
    setFieldText('email', user.email);
    setFieldText('mobile', user.mobile);
    setFieldText('street', user.street_address);
    setFieldText('street_address_optional', user.street_address_optional);
    setFieldText('town', user.town);
    setFieldText('postcode', user.postcode);
    setFieldText('country', user.country);
    setFieldText('driving_license_number', user.driving_license_number);

    // Fill Vehicle Information (Page 1)
    setFieldText('license_plate', user.car_registration_number || user.vehicle_registration);
    setFieldText('vehicle_make', user.vehicle_make);
    setFieldText('vehicle_model', user.vehicle_model);
    setFieldText('vehicle_colour', user.vehicle_colour);
    setFieldText('vehicle_condition', user.vehicle_condition);
    setFieldText('recovery_company', user.recovery_company);
    setFieldText('recovery_breakdown_number', user.recovery_breakdown_number);
    setFieldText('recovery_breakdown_email', user.recovery_breakdown_email);

    // Fill Emergency Contact (Page 2)
    setFieldText('emergency_contact', user.emergency_contact);

    // Fill Insurance Details (Page 2)
    setFieldText('insurance_company', user.insurance_company);
    setFieldText('policy_number', user.policy_number || user.insurance_policy_number);
    setFieldText('policy_holder', user.policy_holder);
    setFieldText('cover_type', user.cover_type);

    // Format signup date as DD/MM/YYYY for UK format
    const signupDate = user.subscription_start_date || user.created_at;
    if (signupDate) {
      const formattedDate = new Date(signupDate).toLocaleDateString('en-GB');
      // PDF template uses "Date139_af_date" for signup date (time_stamp is a signature field)
      setFieldText('Date139_af_date', formattedDate);
    }

    // ========================================
    // PAGE 3: Personal Documentation (Images)
    // ========================================
    // Image URLs from user_signup table or incident_images table
    setFieldText('driving_license_picture', user.driving_license_picture || data.imageUrls?.driving_license || '');
    setFieldText('vehicle_picture_front', user.vehicle_picture_front || data.imageUrls?.vehicle_front || '');
    setFieldText('vehicle_picture_driver_side', user.vehicle_picture_driver_side || data.imageUrls?.vehicle_driver_side || '');
    setFieldText('vehicle_picture_passenger_side', user.vehicle_picture_passenger_side || data.imageUrls?.vehicle_passenger_side || '');
    setFieldText('vehicle_picture_back', user.vehicle_picture_back || data.imageUrls?.vehicle_back || '');

    // Fill Incident Report Data (Pages 4-17)
    const incident = data.currentIncident || {};

    // Page 4 - Safety Assessment
    setFieldText('form_id', incident.id);
    setFieldText('submit_date', incident.created_at);
    checkField('are_you_safe', incident.are_you_safe === 'Yes' || incident.are_you_safe === true);
    checkField('medical_attention', incident.medical_attention === 'Yes' || incident.medical_attention === true);
    setFieldText('medical_how_are_you_feeling', incident.medical_how_are_you_feeling);
    setFieldText('medical_attention_from_who', incident.medical_attention_from_who);
    setFieldText('further_medical_attention', incident.further_medical_attention);
    setFieldText('medical_please_be_completely_honest', incident.medical_please_be_completely_honest);
    checkField('six_point_safety_check', incident.six_point_safety_check === 'Yes' || incident.six_point_safety_check === true);
    checkField('call_emergency_contact', incident.call_emergency_contact === 'Yes' || incident.call_emergency_contact === true);

    // Page 4 - Medical Assessment (Checkboxes match PDF exactly)
    checkField('medical_chest_pain', incident.medical_chest_pain === true);
    checkField('medical_uncontrolled_bleeding', incident.medical_uncontrolled_bleeding === true);
    checkField('medical_breathlessness', incident.medical_breathlessness === true);
    checkField('medical_limb_weakness', incident.medical_limb_weakness === true);
    checkField('medical_loss_of_consciousness', incident.medical_loss_of_consciousness === true);
    checkField('medical_severe_headache', incident.medical_severe_headache === true);
    checkField('medical_abdominal_bruising', incident.medical_abdominal_bruising === true);
    checkField('medical_change_in_vision', incident.medical_change_in_vision === true);
    checkField('medical_abdominal_pain', incident.medical_abdominal_pain === true);
    checkField('medical_limb_pain', incident.medical_limb_pain === true);
    checkField('medical_none_of_these', incident.medical_none_of_these === true);

    // Page 5 - Accident Time and Safety
    checkField('wearing_seatbelts', incident.wearing_seatbelts === 'Yes');
    checkField('airbags_deployed', incident.airbags_deployed === 'Yes');
    setFieldText('reason_no_seatbelts', incident.why_werent_seat_belts_being_worn);
    checkField('damage_to_your_vehicle', incident.was_your_vehicle_damaged === 'Yes');
    setFieldText('when_did_the_accident_happen', incident.when_did_the_accident_happen);
    setFieldText('what_time_did_the_accident_happen', incident.what_time_did_the_accident_happen);
    setFieldText('where_exactly_did_this_happen', incident.where_exactly_did_this_happen);

    // Page 5 - Weather Conditions (checkboxes match PDF exactly)
    checkField('weather_overcast', incident.overcast_dull === true);
    checkField('weather_heavy_rain', incident.heavy_rain === true);
    checkField('weather_wet_road', incident.wet_road === true);
    checkField('weather_fog', incident.fog_poor_visibility === true);
    checkField('weather_street_lights', incident.street_lights === true);
    checkField('weather_dusk', incident.dusk === true);
    checkField('weather_clear_and_dry', incident.clear_and_dry === true);
    checkField('weather_snow_on_road', incident.snow_ice_on_road === true);
    checkField('weather_snow', incident.snow === true);
    checkField('weather_light_rain', incident.light_rain === true);
    checkField('weather_bright_daylight', incident.bright_daylight === true);
    setFieldText('weather_conditions', incident.weather_conditions_summary);

    // Page 6 - Road Details and Description
    setFieldText('road_type', incident.road_type);
    setFieldText('speed_limit', incident.speed_limit);
    setFieldText('junction_information', incident.junction_information);
    setFieldText('special_conditions', incident.special_conditions);
    setFieldText('detailed_account_of_what_happened', incident.describe_what_happened || incident.detailed_account_of_what_happened);

    // Page 7 - Your Vehicle Information (field names match PDF exactly)
    setFieldText('make_of_car', incident.make_of_car);
    setFieldText('model_of_car', incident.model_of_car);
    setFieldText('license_plate', incident.license_plate_incident || incident.license_plate);
    setFieldText('direction_and_speed', incident.direction_of_travel_and_estimated_speed || incident.direction_and_speed);
    setFieldText('impact', incident.impact_point || incident.impact);
    setFieldText('damage_caused_by_accident', incident.damage_caused_by_accident);
    setFieldText('any_damage_prior_to_accident', incident.damage_prior_to_accident || incident.any_damage_prior_to_accident);

    // Page 8 - Other Vehicles (field names match PDF exactly)
    setFieldText('other_drivers_name', incident.other_drivers_name || incident.other_driver_name);
    setFieldText('other_drivers_number', incident.other_drivers_number || incident.other_driver_number);
    setFieldText('other_drivers_address', incident.other_drivers_address || incident.other_driver_address);
    setFieldText('other_make_of_vehicle', incident.other_make_of_vehicle);
    setFieldText('other_model_of_vehicle', incident.other_model_of_vehicle);
    setFieldText('other_registration_number', incident.vehicle_license_plate || incident.other_vehicle_license_plate || incident.other_registration_number);
    setFieldText('other_policy_number', incident.other_policy_number);
    setFieldText('other_insurance_company', incident.other_insurance_company);
    setFieldText('other_policy_cover', incident.other_policy_cover_type || incident.other_policy_cover);
    setFieldText('other_policy_holder', incident.other_policy_holder);

    // Page 9 - Police Involvement (field names match PDF exactly)
    checkField('did_police_attend', incident.did_the_police_attend_the_scene === 'Yes' || incident.did_police_attend === 'Yes');
    setFieldText('accident_reference_number', incident.accident_reference_number);
    setFieldText('police_officers_name', incident.police_officer_name || incident.police_officers_name);
    setFieldText('police_officer_badge_number', incident.police_officer_badge_number);
    setFieldText('police_force_details', incident.police_force_details);
    checkField('breath_test', incident.breath_test === 'Yes');
    checkField('other_breath_test', incident.other_breath_test === 'Yes');

    // Page 10 - Additional Info and Witnesses (field names match PDF exactly)
    setFieldText('anything_else', incident.anything_else_important || incident.anything_else);
    checkField('any_witness', incident.witness_present === 'Yes' || incident.any_witness === 'Yes');
    setFieldText('witness_contact_information', incident.witness_information || incident.witness_contact_information);
    checkField('call_your_recovery', incident.call_recovery === 'Yes' || incident.call_your_recovery === 'Yes');
    checkField('upgrade_to_premium', incident.upgrade_to_premium === 'Yes');

    // Pages 11-12 - Evidence URLs (field names match PDF exactly)
    setFieldText('file_url_documents', data.imageUrls.document || incident.file_url_documents || '');
    setFieldText('file_url_documents_1', data.imageUrls.document_2 || incident.file_url_documents_1 || '');
    setFieldText('file_url_record_detailed_account_of_what_happened', data.imageUrls.audio_account || incident.file_url_record_detailed_account_of_what_happened || '');
    setFieldText('file_url_what3words', data.imageUrls.what3words || incident.file_url_what3words || '');
    setFieldText('file_url_scene_overview', data.imageUrls.scene_overview || incident.file_url_scene_overview || '');
    setFieldText('file_url_scene_overview_1', data.imageUrls.scene_overview_2 || incident.file_url_scene_overview_1 || '');
    setFieldText('file_url_other_vehicle', data.imageUrls.other_vehicle || incident.file_url_other_vehicle || '');
    setFieldText('file_url_other_vehicle_1', data.imageUrls.other_vehicle_2 || incident.file_url_other_vehicle_1 || '');
    setFieldText('file_url_vehicle_damage', data.imageUrls.vehicle_damage || incident.file_url_vehicle_damage || '');
    setFieldText('file_url_vehicle_damage_1', data.imageUrls.vehicle_damage_2 || incident.file_url_vehicle_damage_1 || '');
    setFieldText('file_url_vehicle_damage_2', data.imageUrls.vehicle_damage_3 || incident.file_url_vehicle_damage_2 || '');

    // Pages 13-14 - AI Summary (field names match PDF exactly)
    setFieldText('ai_summary_of_accident_data', incident.ai_summary_of_data_collected || incident.ai_summary_of_accident_data || '');
    setFieldText('ai_summary_of_accident_data_transcription', incident.detailed_account_of_what_happened || incident.ai_summary_of_accident_data_transcription || '');

    // Pages 15-16 - DVLA Data
    if (data.dvla && data.dvla.length > 0) {
      const dvlaInfo = data.dvla[0];

      // User's vehicle DVLA info
      setFieldText('dvla_driver_name', dvlaInfo.driver_name);
      setFieldText('dvla_registration', dvlaInfo.registration_number);
      setFieldText('dvla_make', dvlaInfo.make);
      setFieldText('dvla_month_manufacture', dvlaInfo.month_of_manufacture);
      setFieldText('dvla_colour', dvlaInfo.colour);
      setFieldText('dvla_year_manufacture', dvlaInfo.year_of_manufacture);
      setFieldText('dvla_mot_status', dvlaInfo.mot_status);
      setFieldText('dvla_road_tax', dvlaInfo.road_tax_status);
      setFieldText('dvla_mot_renewal', dvlaInfo.mot_expiry_date);
      setFieldText('dvla_tax_renewal', dvlaInfo.tax_due_date);
      setFieldText('dvla_fuel_type', dvlaInfo.fuel_type);
      setFieldText('dvla_co2', dvlaInfo.co2_emissions);
      setFieldText('dvla_revenue_weight', dvlaInfo.revenue_weight);
      setFieldText('dvla_engine_capacity', dvlaInfo.engine_capacity);
      setFieldText('dvla_wheelplan', dvlaInfo.wheelplan);
      setFieldText('dvla_type_approval', dvlaInfo.type_approval);
      setFieldText('dvla_v5c_issued', dvlaInfo.date_of_last_v5c_issued);

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
        setFieldText('other_dvla_mot_renewal', otherDvla.mot_expiry_date);
        setFieldText('other_dvla_tax_renewal', otherDvla.tax_due_date);
        setFieldText('other_dvla_fuel_type', otherDvla.fuel_type);
        setFieldText('other_dvla_co2', otherDvla.co2_emissions);
        setFieldText('other_dvla_revenue_weight', otherDvla.revenue_weight);
        setFieldText('other_dvla_engine_capacity', otherDvla.engine_capacity);
        setFieldText('other_dvla_wheelplan', otherDvla.wheelplan);
        setFieldText('other_dvla_type_approval', otherDvla.type_approval);
        setFieldText('other_dvla_v5c_issued', otherDvla.date_of_last_v5c_issued);
        setFieldText('other_dvla_marked_export', otherDvla.marked_for_export);
      }
    }

    // Page 17 - Declaration (field names match PDF exactly)
    setFieldText('declaration', (user.name || '') + ' ' + (user.surname || ''));
    setFieldText('Date139_af_date', new Date().toLocaleDateString('en-GB'));

    // Flatten the form to make fields read-only
    form.flatten();

    // Save the PDF
    const pdfBytes = await pdfDoc.save();

    console.log('✅ PDF generated successfully');
    return Buffer.from(pdfBytes);

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
}

module.exports = { generatePDF };