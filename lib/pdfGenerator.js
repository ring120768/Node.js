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

    // Load the PDF template (NEW: 207-field version dated 02/11/2025)
    const templatePath = path.join(process.cwd(), 'pdf-templates/Car-Crash-Lawyer-AI-Incident-Report-Main.pdf');
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
    setFieldText('id', data.metadata.create_user_id); // NEW: User tracking field
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
    setFieldText('date_of_birth', user.date_of_birth); // NEW: Driver date of birth (PDF field name)

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
    // Parse pipe-delimited format: "Name | Phone | Email | Company"
    if (user.emergency_contact) {
      const parts = user.emergency_contact.split('|').map(p => p.trim());
      setFieldText('emergency_contact', user.emergency_contact);
      setFieldText('emergency_contact_name', parts[0] || '');
      setFieldText('emergency_contact_number', parts[1] || '');
    } else {
      setFieldText('emergency_contact', '');
      setFieldText('emergency_contact_name', '');
      setFieldText('emergency_contact_number', '');
    }

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

    // FIXED: Safety fields come from user_signup table (not incident_reports)
    checkField('are_you_safe', user.are_you_safe === true);
    setFieldText('safety_status', user.safety_status || '');
    setFieldText('safety_status_timestamp', user.safety_status_timestamp || '');
    checkField('six_point_safety_check', user.six_point_safety_check === true);
    setFieldText('six_point_safety_check_completed_at', user.six_point_safety_check_completed_at || '');

    // Medical fields from incident_reports table
    checkField('medical_attention', incident.medical_attention === 'Yes' || incident.medical_attention === true);
    setFieldText('medical_how_are_you_feeling', incident.medical_how_are_you_feeling);
    setFieldText('medical_attention_from_who', incident.medical_attention_from_who);
    setFieldText('further_medical_attention', incident.further_medical_attention);
    setFieldText('medical_please_be_completely_honest', incident.medical_please_be_completely_honest);
    checkField('call_emergency_contact', incident.call_emergency_contact === 'Yes' || incident.call_emergency_contact === true);

    // Page 4 - Medical Assessment (Use actual DB column names: medical_symptom_*)
    checkField('medical_chest_pain', incident.medical_symptom_chest_pain === true);
    checkField('medical_uncontrolled_bleeding', incident.medical_symptom_uncontrolled_bleeding === true);
    checkField('medical_breathlessness', incident.medical_symptom_breathlessness === true);
    checkField('medical_limb_weakness', incident.medical_symptom_limb_weakness === true);
    checkField('medical_loss_of_consciousness', incident.medical_symptom_loss_of_consciousness === true);
    checkField('medical_severe_headache', incident.medical_symptom_severe_headache === true);
    checkField('medical_abdominal_bruising', incident.medical_symptom_abdominal_bruising === true);
    checkField('medical_change_in_vision', incident.medical_symptom_change_in_vision === true);
    checkField('medical_abdominal_pain', incident.medical_symptom_abdominal_pain === true);
    checkField('medical_limb_pain', incident.medical_symptom_limb_pain_mobility === true);
    checkField('Dizziness', incident.medical_symptom_dizziness === true);
    checkField('Life Threatening Injuries', incident.medical_symptom_life_threatening === true);
    checkField('medical_none_of_these', incident.medical_symptom_none === true);

    // NEW: Extended Medical Information (UPDATED for migration 002 - using new DB columns)
    checkField('ambulance_callled', incident.medical_ambulance_called === true); // Note: PDF has typo "callled"
    checkField('medical_attention_needed', incident.medical_attention_needed === true);
    setFieldText('hospital_or_medical_center', incident.medical_hospital_name || '');
    setFieldText('medical_injury_details', incident.medical_injury_details || '');
    setFieldText('severity_of_injuries', incident.medical_injury_severity || '');
    setFieldText('treatment_received_on_scene', incident.medical_treatment_received || '');
    setFieldText('follow_up_appointments_scheduled', incident.medical_follow_up_needed || '');

    // Page 5 - Accident Time and Safety
    // NEW: Explicit accident date/time fields (migration 002)
    if (incident.accident_date) {
      const formattedDate = new Date(incident.accident_date).toLocaleDateString('en-GB');
      setFieldText('when_did_the_accident_happen', formattedDate);
    } else {
      setFieldText('when_did_the_accident_happen', incident.when_did_the_accident_happen);
    }

    if (incident.accident_time) {
      setFieldText('what_time_did_the_accident_happen', incident.accident_time);
    } else {
      setFieldText('what_time_did_the_accident_happen', incident.what_time_did_the_accident_happen);
    }

    setFieldText('where_exactly_did_this_happen', incident.where_exactly_did_this_happen);
    // Use actual database column names (seatbelts_worn, seatbelt_reason)
    checkField('wearing_seatbelts', incident.seatbelts_worn === 'yes' || incident.seatbelts_worn === true || incident.seatbelts_worn === "true");
    checkField('airbags_deployed', incident.airbags_deployed === true || incident.airbags_deployed === "true");
    setFieldText('reason_no_seatbelts', incident.seatbelt_reason || '');
    checkField('damage_to_your_vehicle', incident.was_your_vehicle_damaged === 'Yes');

    // NEW: Vehicle damage flags (migration 002)
    checkField('no_damage', incident.no_damage === true);
    checkField('no_visible_damage', incident.no_visible_damage === true);
    checkField('usual_vehicle', incident.usual_vehicle === true);
    checkField('vehicle_driveable', incident.vehicle_driveable === true);

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

    // NEW: Additional Weather Conditions
    checkField('weather_drizzle', incident.weather_drizzle === true);
    checkField('weather_raining', incident.weather_raining === true);
    checkField('weather-hail', incident.weather_hail === true); // FIXED: PDF uses hyphen
    checkField('weather_windy', incident.weather_windy === true);
    checkField('weather_thunder', incident.weather_thunder === true);
    checkField('weather_slush_road', incident.weather_slush_road === true);
    checkField('weather_loose_surface', incident.weather_loose_surface === true);

    // NEW: Migration 002 weather fields (matching UI form fields)
    checkField('weather_clear', incident.weather_clear === true);
    checkField('weather_cloudy', incident.weather_cloudy === true);
    checkField('weather_bright_sunlight', incident.weather_bright_sunlight === true);
    checkField('weather_ice', incident.weather_ice === true);
    checkField('weather_thunder_lightning', incident.weather_thunder_lightning === true);
    checkField('weather_other', incident.weather_other === true);

    setFieldText('weather_conditions', incident.weather_conditions_summary);

    // Page 6 - Road Details and Description
    setFieldText('road_type', incident.road_type);
    setFieldText('speed_limit', incident.speed_limit);
    setFieldText('your_speed', incident.your_speed || ''); // NEW: Migration 002 - user estimated speed
    setFieldText('junction_information', incident.junction_information);
    setFieldText('special_conditions', incident.special_conditions || incident.specialConditions); // NEW: Migration 002
    setFieldText('detailed_account_of_what_happened', incident.describe_what_happened || incident.detailed_account_of_what_happened);

    // NEW: Road Conditions (migration 002 - checkboxes, can select multiple)
    checkField('road_condition_dry', incident.road_condition_dry === true);
    checkField('road_condition_wet', incident.road_condition_wet === true);
    checkField('road_condition_icy', incident.road_condition_icy === true);
    checkField('road_condition_snow_covered', incident.road_condition_snow_covered === true);
    checkField('road_condition_loose_surface', incident.road_condition_loose_surface === true);
    checkField('road_condition_other', incident.road_condition_other === true);

    // NEW: Road Type (migration 002 - radio buttons, only one selected)
    checkField('road_type_motorway', incident.road_type_motorway === true);
    checkField('road_type_a_road', incident.road_type_a_road === true);
    checkField('road_type_b_road', incident.road_type_b_road === true);
    checkField('road_type_urban_street', incident.road_type_urban_street === true);
    checkField('road_type_rural_road', incident.road_type_rural_road === true);
    checkField('road_type_car_park', incident.road_type_car_park === true);
    checkField('road_type_other', incident.road_type_other === true);

    // NEW: Traffic Conditions (UPDATED for migration 002 - radio buttons, only one selected)
    checkField('traffic_conditions_heavy', incident.traffic_conditions_heavy === true);
    checkField('traffic_conditions_moderate', incident.traffic_conditions_moderate === true);
    checkField('traffic_conditions_light', incident.traffic_conditions_light === true);
    checkField('traffic_conditions_none', incident.traffic_conditions_no_traffic === true);

    // NEW: Road Markings (UPDATED for migration 002 - radio buttons, only one selected)
    checkField('road_markings', incident.road_markings_visible_yes === true);
    checkField('road_markings_partial_yes', incident.road_markings_visible_partially === true);
    checkField('road_markings_no', incident.road_markings_visible_no === true);

    // NEW: Visibility (mutually exclusive)
    checkField('visibility', incident.visibility_good === true);
    checkField('visability_poor', incident.visibility_poor === true); // FIXED: PDF has typo (missing 'i')
    checkField('visability_very_poor', incident.visibility_very_poor === true); // FIXED: PDF has typo (missing 'i')
    checkField('visibility_severely_restricted', incident.visibility_severely_restricted === true); // NEW: Migration 002

    // NEW: Location & Context (migration 002)
    setFieldText('location', incident.location || '');
    setFieldText('what3words', incident.what3words || '');
    setFieldText('nearestLandmark', incident.nearestlandmark || '');  // PostgreSQL lowercase
    setFieldText('additionalHazards', incident.additionalhazards || '');  // PostgreSQL lowercase
    setFieldText('visibilityFactors', incident.visibilityfactors || '');  // PostgreSQL lowercase

    // NEW: Junction/Intersection Details (migration 002)
    setFieldText('junctionType', incident.junctiontype || '');  // PostgreSQL lowercase
    setFieldText('junctionControl', incident.junctioncontrol || '');  // PostgreSQL lowercase
    setFieldText('trafficLightStatus', incident.trafficlightstatus || '');  // PostgreSQL lowercase
    setFieldText('userManoeuvre', incident.usermanoeuvre || '');  // PostgreSQL lowercase

    // Page 7 - Your Vehicle Information (field names match PDF exactly)
    setFieldText('make_of_car', incident.make_of_car);
    setFieldText('model_of_car', incident.model_of_car);
    setFieldText('license_plate', incident.license_plate_incident || incident.license_plate);
    setFieldText('direction_and_speed', incident.direction_of_travel_and_estimated_speed || incident.direction_and_speed);

    // FIXED: Impact points are individual checkboxes (Page 5 audit), not a single text field
    checkField('impact_point_front', incident.impact_point_front === true);
    checkField('impact_point_rear', incident.impact_point_rear === true);
    checkField('impact_point_driver_side', incident.impact_point_driver_side === true);
    checkField('impact_point_passenger_side', incident.impact_point_passenger_side === true);
    checkField('impact_point_roof', incident.impact_point_roof === true);
    checkField('impact_point_undercarriage', incident.impact_point_undercarriage === true);
    checkField('impact_point_other', incident.impact_point_other === true);

    setFieldText('damage_caused_by_accident', incident.damage_caused_by_accident);
    setFieldText('any_damage_prior_to_accident', incident.damage_prior_to_accident || incident.any_damage_prior_to_accident);

    // NEW: Recovery Details (migration 002)
    setFieldText('recovery_location', incident.recovery_location || '');
    setFieldText('recovery_phone', incident.recovery_phone || '');
    setFieldText('recovery_notes', incident.recovery_notes || '');

    // NEW: DVLA Lookup Results (Auto-filled from DVLA API)
    setFieldText('uk_licence_plate_look_up', incident.dvla_lookup_reg || '');
    setFieldText('vehicle_found_make', incident.dvla_vehicle_make || '');
    setFieldText('vehicle_found_model', incident.dvla_vehicle_model || '');
    setFieldText('vehicle_found_color', incident.dvla_vehicle_color || ''); // FIXED: PDF uses US spelling
    setFieldText('vehicle_found_year', incident.dvla_vehicle_year ? String(incident.dvla_vehicle_year) : '');
    setFieldText('vehicle_found_fuel_type', incident.dvla_vehicle_fuel_type || '');
    setFieldText('vehicle_found_mot_status', incident.dvla_mot_status || '');
    setFieldText('vehicle_found_mot_expiry_date', incident.dvla_mot_expiry_date || '');
    setFieldText('vehicle_found_tax_status', incident.dvla_tax_status || '');
    setFieldText('vehicle_found_tax_due_date', incident.dvla_tax_due_date || '');

    // Page 8 - Other Vehicles (field names match PDF exactly)
    // Get other vehicle data from incident_other_vehicles table if available
    const otherVehicle = (data.vehicles && data.vehicles.length > 0) ? data.vehicles[0] : {};

    // NEW: Updated to use migration 002 fields from incident_other_vehicles table
    setFieldText('other_drivers_name', otherVehicle.other_driver_name || incident.other_drivers_name || incident.other_driver_name);
    setFieldText('other_drivers_number', otherVehicle.other_driver_phone || incident.other_drivers_number || incident.other_driver_number);
    // NOTE: other_driver_email column doesn't exist in incident_other_vehicles table
    setFieldText('other_driver_email', '');
    setFieldText('other_driver_license', otherVehicle.other_driver_license || ''); // NEW: Migration 002
    setFieldText('other_drivers_address', incident.other_drivers_address || incident.other_driver_address);
    setFieldText('other_make_of_vehicle', incident.other_make_of_vehicle);
    setFieldText('other_model_of_vehicle', incident.other_model_of_vehicle);
    setFieldText('other_registration_number', otherVehicle.other_license_plate || incident.vehicle_license_plate || incident.other_vehicle_license_plate || incident.other_registration_number);
    setFieldText('other_point_of_impact', otherVehicle.other_point_of_impact || ''); // NEW: Migration 002
    setFieldText('other_policy_number', incident.other_policy_number);
    setFieldText('other_insurance_company', incident.other_insurance_company);
    setFieldText('other_policy_cover', incident.other_policy_cover_type || incident.other_policy_cover);
    setFieldText('other_policy_holder', incident.other_policy_holder);

    // NEW: Extended Other Vehicle Insurance (from incident_other_vehicles table)
    setFieldText('other_insurance_company_name', otherVehicle.insurance_company || '');
    setFieldText('other_insurance_policy_number', otherVehicle.insurance_policy_number || '');
    setFieldText('other_insurance_policy_holder', otherVehicle.insurance_policy_holder || '');

    // NEW: Other Vehicle DVLA Status (from incident_other_vehicles table)
    setFieldText('other_mot_status', otherVehicle.dvla_mot_status || '');
    setFieldText('other_mot_expiry_date', otherVehicle.dvla_mot_expiry_date || '');
    setFieldText('other_tax_status', otherVehicle.dvla_tax_status || '');
    setFieldText('other_tax_due_date', otherVehicle.dvla_tax_due_date || '');
    setFieldText('other_insurance_status_via_mib', otherVehicle.dvla_insurance_status || '');
    setFieldText('other_marked_for_export', otherVehicle.dvla_export_marker || '');

    // Page 9-10 - Police Involvement & Safety (UPDATED for Page 10 audit)
    checkField('did_police_attend', incident.police_attended === true || incident.police_attended === "true" || incident.did_the_police_attend_the_scene === 'Yes');
    setFieldText('accident_reference_number', incident.accident_ref_number || ''); // FIXED: Use accident_ref_number from Page 10
    setFieldText('police_officer_name', incident.officer_name || ''); // FIXED: Use officer_name from Page 10
    setFieldText('police_officer_badge_number', incident.officer_badge || ''); // FIXED: Use officer_badge from Page 10
    setFieldText('police_force_details', incident.police_force || ''); // FIXED: Use police_force from Page 10

    // FIXED: Breath test results are TEXT fields, not checkboxes (Page 10)
    // Values: "Negative", "Positive", "Refused", "Not tested"
    setFieldText('user_breath_test', incident.user_breath_test || '');
    setFieldText('other_breath_test', incident.other_breath_test || '');

    // Page 10 - Additional Info and Witnesses (UPDATED for migration 002)
    // Get witness data from incident_witnesses table if available
    const witnesses = data.witnesses || [];
    const witness1 = witnesses[0] || {};
    const witness2 = witnesses[1] || {};

    setFieldText('anything_else', incident.anything_else_important || incident.anything_else);
    checkField('any_witness', incident.witnesses_present === true || incident.witness_present === 'Yes' || incident.any_witness === 'Yes'); // NEW: Migration 002 - witnesses_present
    setFieldText('witness_contact_information', incident.witness_information || incident.witness_contact_information);

    // FIXED: Witness information from incident_witnesses table (Page 9 audit)
    // Each witness is a separate row with same column names (witness_index identifies which witness)
    setFieldText('witness_name', witness1.witness_name || '');
    setFieldText('witness_mobile_number', witness1.witness_phone || '');
    setFieldText('witness_email_address', witness1.witness_email || '');
    setFieldText('witness_statement', witness1.witness_statement || '');

    // FIXED: Second witness uses same column names (Page 9 audit), not _2 suffixes
    setFieldText('witness_name_2', witness2.witness_name || '');
    setFieldText('witness_mobile_number_2', witness2.witness_phone || '');
    setFieldText('witness_email_address_2', witness2.witness_email || '');
    setFieldText('witness_statement_2', witness2.witness_statement || '');

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
      // Driver info comes from user table (DVLA only has vehicle data)
      setFieldText('dvla_driver_name', `${user.name || ''} ${user.surname || ''}`.trim());
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
        // Driver info comes from vehicles array (DVLA only has vehicle data)
        const otherDriverName = otherVehicle?.driver_name || incident?.other_driver_name || '';
        setFieldText('other_dvla_name', otherDriverName);
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

    // FIXED: Page 12 Final Medical Check fields (Page 12 audit)
    setFieldText('final_feeling', incident.final_feeling || '');
    // NEW: Form completion timestamp (pending migration 026)
    if (incident.form_completed_at) {
      const formattedTimestamp = new Date(incident.form_completed_at).toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      setFieldText('form_completed_at', formattedTimestamp);
    }

    // Page 17 - Declaration (field names match PDF exactly)
    setFieldText('declaration', (user.name || '') + ' ' + (user.surname || ''));
    setFieldText('Date139_af_date', new Date().toLocaleDateString('en-GB'));

    // Page 18 - Appendix A: Emergency Audio Recording (AI Eavesdropper)
    if (data.emergencyAudio) {
      setFieldText('emergency_audio_transcription', data.emergencyAudio.transcription_text || '');
      setFieldText('emergency_recording_timestamp', data.emergencyAudio.recorded_at
        ? new Date(data.emergencyAudio.recorded_at).toLocaleString('en-GB', {
            dateStyle: 'full',
            timeStyle: 'long'
          })
        : '');
      setFieldText('emergency_audio_url', data.emergencyAudio.audio_url || '');
    }

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