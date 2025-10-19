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
    // PDF template has user_id on some pages (page 6) and create_user_id on others
    setFieldText('create_user_id', data.metadata.create_user_id);
    setFieldText('user_id', data.metadata.create_user_id);
    setFieldText('name', user.name);
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
      // time_stamp is a signature field - pdf-lib can't fill it, but Adobe PDF Services can
      setSignatureField('time_stamp', formattedDate);
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
    checkField('safe_ready', incident.are_you_safe_and_ready_to_complete_this_form === 'Yes');
    checkField('medical_attention_required', incident.medical_attention_required === 'Yes');
    setFieldText('how_feeling', incident.how_are_you_feeling);
    setFieldText('medical_attention_who', incident.medical_attention_from_who);
    setFieldText('medical_further', incident.medical_further_attention);
    checkField('six_point_check', incident.six_point_safety_check_completed === 'Yes');
    checkField('emergency_contact_made', incident.emergency_contact_made === 'Yes');

    // Page 4 - Medical Assessment
    checkField('chest_pain', incident.chest_pain === true);
    checkField('uncontrolled_bleeding', incident.uncontrolled_bleeding === true);
    checkField('breathlessness', incident.breathlessness === true);
    checkField('limb_weakness', incident.limb_weakness === true);
    checkField('loss_consciousness', incident.loss_of_consciousness === true);
    checkField('severe_headache', incident.severe_headache === true);
    checkField('abdominal_bruising', incident.abdominal_bruising === true);
    checkField('change_vision', incident.change_in_vision === true);
    checkField('abdominal_pain', incident.abdominal_pain === true);
    checkField('limb_pain', incident.limb_pain_impeding_mobility === true);
    checkField('none_feel_fine', incident.none_of_these_i_feel_fine === true);
    setFieldText('medical_conditions_summary', incident.medical_conditions_summary);

    // Page 5 - Accident Time and Safety
    checkField('wearing_seatbelts', incident.wearing_seatbelts === 'Yes');
    checkField('airbags_deployed', incident.airbags_deployed === 'Yes');
    setFieldText('why_no_seatbelts', incident.why_werent_seat_belts_being_worn);
    checkField('vehicle_damaged', incident.was_your_vehicle_damaged === 'Yes');
    setFieldText('accident_date', incident.when_did_the_accident_happen);
    setFieldText('accident_time', incident.what_time_did_the_accident_happen);
    setFieldText('accident_location', incident.where_exactly_did_the_accident_happen);

    // Page 5 - Weather Conditions
    checkField('weather_overcast', incident.overcast_dull === true);
    checkField('weather_heavy_rain', incident.heavy_rain === true);
    checkField('weather_wet_road', incident.wet_road === true);
    checkField('weather_fog', incident.fog_poor_visibility === true);
    checkField('weather_street_lights', incident.street_lights === true);
    checkField('weather_dusk', incident.dusk === true);
    checkField('weather_clear_dry', incident.clear_and_dry === true);
    checkField('weather_snow_ice', incident.snow_ice_on_road === true);
    checkField('weather_light_rain', incident.light_rain === true);
    checkField('weather_bright_daylight', incident.bright_daylight === true);
    setFieldText('weather_summary', incident.weather_conditions_summary);

    // Page 6 - Road Details and Description
    setFieldText('road_type', incident.road_type);
    setFieldText('speed_limit', incident.speed_limit);
    setFieldText('junction_info', incident.junction_information);
    setFieldText('special_conditions', incident.special_conditions);
    setFieldText('accident_description', incident.describe_what_happened);

    // Page 7 - Your Vehicle Information
    setFieldText('driving_usual', incident.driving_usual_vehicle);
    setFieldText('make_of_car', incident.make_of_car);
    setFieldText('model_of_car', incident.model_of_car);
    setFieldText('your_license_plate', incident.license_plate_incident);
    setFieldText('direction_speed', incident.direction_of_travel_and_estimated_speed);
    setFieldText('impact_point', incident.impact_point);
    setFieldText('damage_caused', incident.damage_caused_by_accident);
    setFieldText('damage_prior', incident.damage_prior_to_accident);

    // Page 8 - Other Vehicles
    checkField('other_vehicles', incident.other_vehicles_involved === 'Yes');
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

    // Page 9 - Police Involvement
    checkField('police_attended', incident.did_the_police_attend_the_scene === 'Yes');
    setFieldText('accident_reference', incident.accident_reference_number);
    setFieldText('officer_name', incident.police_officer_name);
    setFieldText('officer_badge', incident.police_officer_badge_number);
    setFieldText('police_force', incident.police_force_details);
    checkField('breath_test', incident.breath_test === 'Yes');
    checkField('other_breath_test', incident.other_breath_test === 'Yes');

    // Page 10 - Additional Info and Witnesses
    setFieldText('anything_else', incident.anything_else_important);
    checkField('witness_present', incident.witness_present === 'Yes');
    setFieldText('witness_info', incident.witness_information);
    checkField('call_recovery', incident.call_recovery === 'Yes');
    checkField('upgrade_premium', incident.upgrade_to_premium === 'Yes');

    // Pages 11-12 - Evidence URLs (from processed images)
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

    // Pages 13-14 - AI Summary
    setFieldText('ai_summary', incident.ai_summary_of_data_collected || '');
    setFieldText('ai_transcription', incident.detailed_account_of_what_happened || '');

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

    // Page 17 - Declaration
    setFieldText('declaration_name', (user.name || '') + ' ' + (user.surname || ''));
    setFieldText('declaration_date', new Date().toLocaleDateString('en-GB'));

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