/**
 * Adobe PDF Form Filler Service
 *
 * This service uses Adobe PDF Services to fill the Car Crash Lawyer AI
 * fillable PDF form with data from Supabase.
 *
 * This replaces the Zapier + PDFco workflow with direct integration.
 */

const { ServicePrincipalCredentials, PDFServices } = require('@adobe/pdfservices-node-sdk');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class AdobePdfFormFillerService {
  constructor() {
    this.initialized = false;
    this.credentials = null;
    this.pdfServices = null;
    this.templatePath = path.join(__dirname, '../../pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf');
    this.initializeCredentials();
  }

  /**
   * Initialize Adobe PDF Services credentials
   * Uses credentials file: /credentials/pdfservices-api-credentials.json
   */
  initializeCredentials() {
    try {
      const credentialsPath = path.join(__dirname, '../../credentials/pdfservices-api-credentials.json');
      
      if (!fs.existsSync(credentialsPath)) {
        logger.warn('⚠️ Adobe PDF credentials file not found - form filling will use fallback method');
        logger.warn('📥 Add credentials to: /credentials/pdfservices-api-credentials.json');
        return;
      }

      // Read credentials from file
      const credentialsData = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      
      if (credentialsData.client_credentials && 
          credentialsData.client_credentials.client_id && 
          credentialsData.client_credentials.client_secret) {
        
        // v4 SDK with OAuth Server-to-Server credentials
        this.credentials = new ServicePrincipalCredentials({
          clientId: credentialsData.client_credentials.client_id,
          clientSecret: credentialsData.client_credentials.client_secret
        });

        // Create PDF Services instance
        this.pdfServices = new PDFServices({ credentials: this.credentials });

        this.initialized = true;
        logger.info('✅ Adobe PDF Form Filler Service initialized successfully');
      } else {
        logger.warn('⚠️ Invalid Adobe PDF credentials format - form filling will use fallback method');
      }
    } catch (error) {
      logger.error('Failed to initialize Adobe PDF Form Filler Service:', error);
    }
  }

  /**
   * Check if Adobe service is ready
   */
  isReady() {
    return this.initialized && this.credentials !== null && fs.existsSync(this.templatePath);
  }

  /**
   * Fill the PDF form with user data from Supabase
   *
   * @param {Object} data - All data from Supabase (user, incident, dvla, images, etc.)
   * @returns {Promise<Buffer>} - Filled PDF as buffer
   */
  async fillPdfForm(data) {
    try {
      if (!this.isReady()) {
        throw new Error('Adobe PDF Form Filler Service not ready - check credentials and template');
      }

      logger.info('📝 Starting Adobe PDF form filling...');

      // Load the PDF template
      const pdfBytes = fs.readFileSync(this.templatePath);

      // Create a PDFDocument from the template
      const { PDFDocument } = require('pdf-lib');
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      // Map and fill all form fields
      this.fillFormFields(form, data);

      // Append witness pages (if any witnesses exist)
      if (data.witnesses && data.witnesses.length > 0) {
        logger.info(`📋 Adding ${data.witnesses.length} witness page(s)...`);
        await this.appendWitnessPages(pdfDoc, data.witnesses, data.metadata.create_user_id);
      }

      // Append vehicle pages (if any vehicles exist)
      if (data.vehicles && data.vehicles.length > 0) {
        logger.info(`🚗 Adding ${data.vehicles.length} vehicle page(s)...`);
        await this.appendVehiclePages(pdfDoc, data.vehicles, data.metadata.create_user_id);
      }

      // DEBUG: Verify fields were actually set before saving
      console.log('\\n🔍 Verifying fields before saving:');
      try {
        const nameField = form.getTextField('name');
        const emailField = form.getTextField('email');
        console.log('  name field value:', nameField?.getText() || 'EMPTY');
        console.log('  email field value:', emailField?.getText() || 'EMPTY');
      } catch (e) {
        console.error('  Error reading fields:', e.message);
      }

      // CRITICAL: Update field appearances before saving
      // This ensures the visual appearance of fields matches their values
      // Without this, the PDF may show field names instead of values
      console.log('\\n📐 Updating form field appearances...');
      form.updateFieldAppearances();
      console.log('✅ Field appearances updated');

      // Save the filled PDF (without flattening to preserve editability)
      console.log('\\n💾 Saving PDF with editable form fields...');
      const filledPdfBytes = await pdfDoc.save();
      const filledPdfBuffer = Buffer.from(filledPdfBytes);

      logger.info(`✅ PDF form filled successfully (${(filledPdfBuffer.length / 1024).toFixed(2)} KB)`);

      return filledPdfBuffer;

    } catch (error) {
      logger.error('❌ Error filling PDF form:', error);
      throw error;
    }
  }

  /**
   * Fill all form fields based on Supabase data
   *
   * @param {Object} form - PDF form object from pdf-lib
   * @param {Object} data - All data from Supabase
   */
  fillFormFields(form, data) {
    const user = data.user || {};
    const incident = data.currentIncident || {};
    const metadata = data.metadata || {};

    // Helper functions
    const setFieldText = (fieldName, value) => {
      try {
        const field = form.getTextField(fieldName);
        if (field && value !== null && value !== undefined) {
          field.setText(String(value));
        }
      } catch (error) {
        // Log errors for debugging
        if (fieldName === 'name' || fieldName === 'surname' || fieldName === 'email' || fieldName === 'mobile' || fieldName === 'street') {
          console.error(`  ❌ ERROR setting field "${fieldName}":`, error.message);
        }
      }
    };

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
        // Field might not exist or might be wrong type - that's okay
      }
    };

    // ========================================
    // PAGE 1: Personal Information
    // ========================================
    // PAGE 1: Personal Information
    // Mapping: Supabase column → PDF field name
    // ========================================
    // DEBUG: Log the actual user data
    console.log('🔍 DEBUG - Personal Info Section:');
    console.log('  Database has name:', user.name);
    console.log('  Database has email:', user.email);
    console.log('  Database has mobile:', user.mobile);
    console.log('  Database has street_address:', user.street_address);

    console.log('\\n📝 Setting Page 1 fields:');
    setFieldText('name', user.name);  // DB: name → PDF: name
    console.log('  ✓ Set name field to:', user.name);
    setFieldText('surname', user.surname);  // DB: surname → PDF: surname
    console.log('  ✓ Set surname field to:', user.surname);
    setFieldText('email', user.email);  // DB: email → PDF: email
    console.log('  ✓ Set email field to:', user.email);
    setFieldText('mobile', user.mobile);  // DB: mobile → PDF: mobile
    console.log('  ✓ Set mobile field to:', user.mobile);
    setFieldText('street', user.street_address);  // DB: street_address → PDF: street
    console.log('  ✓ Set street field to:', user.street_address);
    setFieldText('town', user.town);  // DB: town → PDF: town
    setFieldText('postcode', user.postcode);  // DB: postcode → PDF: postcode
    setFieldText('country', user.country);  // DB: country → PDF: country
    setFieldText('driving_license_number', user.driving_license_number);  // DB: driving_license_number → PDF: driving_license_number

    // PAGE 1: Vehicle Information
    setFieldText('car_registration_number', user.car_registration_number);  // DB: car_registration_number → PDF: car_registration_number
    setFieldText('vehicle_make', user.vehicle_make);
    setFieldText('vehicle_model', user.vehicle_model);
    setFieldText('vehicle_colour', user.vehicle_colour);
    setFieldText('vehicle_condition', user.vehicle_condition);
    setFieldText('recovery_company', user.recovery_company);
    setFieldText('recovery_breakdown_number', user.recovery_breakdown_number);
    setFieldText('recovery_breakdown_email', user.recovery_breakdown_email);

    // ========================================
    // PAGE 2: Emergency Contact & Insurance
    // ========================================
    setFieldText('emergency_contact_name', user.emergency_contact_name);  // DB: emergency_contact_name → PDF: emergency_contact_name
    setFieldText('emergency_contact_number', user.emergency_contact_number);  // DB: emergency_contact_number → PDF: emergency_contact_number
    // Note: emergency_contact_email exists in DB but not in PDF template

    // Insurance fields (these already match PDF field names)
    setFieldText('insurance_company', user.insurance_company);
    setFieldText('policy_number', user.policy_number);
    setFieldText('policy_holder', user.policy_holder);
    setFieldText('cover_type', user.cover_type);
    setFieldText('sign_up_date', user.sign_up_date);

    // ========================================
    // PAGE 3: Personal Documentation (Images)
    // ========================================
    // Note: Image URLs are stored in imageUrls object
    setFieldText('driving_license_url', data.imageUrls?.driving_license || '');
    setFieldText('vehicle_front_url', data.imageUrls?.vehicle_front || '');
    setFieldText('vehicle_driver_side_url', data.imageUrls?.vehicle_driver_side || '');
    setFieldText('vehicle_passenger_side_url', data.imageUrls?.vehicle_passenger_side || '');
    setFieldText('vehicle_back_url', data.imageUrls?.vehicle_back || '');

    // ========================================
    // PAGE 4: Form Metadata & Safety Assessment
    // ========================================
    setFieldText('id', metadata.create_user_id);  // user_id → id
    setFieldText('form_id', incident.id);
    setFieldText('submit_date', incident.created_at);

    // Immediate Safety Assessment - Map to PDF field names
    checkField('are_you_safe', incident.are_you_safe_and_ready_to_complete_this_form === 'Yes');  // safe_ready → are_you_safe
    checkField('medical_attention_needed', incident.medical_attention_required === 'Yes');  // medical_attention_required → medical_attention_needed
    setFieldText('medical_how_are_you_feeling', incident.how_are_you_feeling);  // how_feeling → medical_how_are_you_feeling
    setFieldText('medical_attention_from_who', incident.medical_attention_from_who);
    setFieldText('further_medical_attention_needed', incident.medical_further_attention);  // medical_further → further_medical_attention_needed
    checkField('six_point_safety_check', incident.six_point_safety_check_completed === 'Yes');  // six_point_check → six_point_safety_check
    checkField('emergency_contact_made', incident.emergency_contact_made === 'Yes');

    // PAGE 4: Medical and Injury Assessment - Map to medical_symptom_* fields
    checkField('medical_symptom_chest_pain', incident.chest_pain === true);  // chest_pain → medical_symptom_chest_pain
    checkField('medical_symptom_uncontrolled_bleeding', incident.uncontrolled_bleeding === true);  // uncontrolled_bleeding → medical_symptom_uncontrolled_bleeding
    checkField('medical_symptom_breathlessness', incident.breathlessness === true);  // breathlessness → medical_symptom_breathlessness
    checkField('medical_symptom_limb_weakness', incident.limb_weakness === true);  // limb_weakness → medical_symptom_limb_weakness
    checkField('medical_symptom_loss_of_consciousness', incident.loss_of_consciousness === true);  // loss_consciousness → medical_symptom_loss_of_consciousness
    checkField('medical_symptom_severe_headache', incident.severe_headache === true);  // severe_headache → medical_symptom_severe_headache
    checkField('medical_symptom_abdominal_bruising', incident.abdominal_bruising === true);  // abdominal_bruising → medical_symptom_abdominal_bruising
    checkField('medical_sympton_change_in_vision', incident.change_in_vision === true);  // change_vision → medical_sympton_change_in_vision (note: typo in PDF field name)
    checkField('medical_symptom_abdominal_pain', incident.abdominal_pain === true);  // abdominal_pain → medical_symptom_abdominal_pain
    checkField('medical_symptom_limb_pain_mobilty', incident.limb_pain_impeding_mobility === true);  // limb_pain → medical_symptom_limb_pain_mobilty (note: typo in PDF field name)
    checkField('medical_symptom_none', incident.none_of_these_i_feel_fine === true);  // none_feel_fine → medical_symptom_none
    setFieldText('medical_injury_details', incident.medical_conditions_summary);  // medical_conditions_summary → medical_injury_details

    // ========================================
    // PAGE 5: Accident Time and Location
    // ========================================
    setFieldText('accident_date', incident.when_did_the_accident_happen);  // Already correct
    setFieldText('accident_time', incident.what_time_did_the_accident_happen);  // Already correct
    setFieldText('location', incident.where_exactly_did_the_accident_happen);  // accident_location → location

    // PAGE 5: Safety Equipment
    checkField('seatbelt_worn', incident.wearing_seatbelts === 'Yes');  // wearing_seatbelts → seatbelt_worn
    checkField('airbags_deployed', incident.airbags_deployed === 'Yes');  // Already correct
    setFieldText('seatbelt_reason', incident.why_werent_seat_belts_being_worn);  // why_no_seatbelts → seatbelt_reason
    checkField('vehicle_damaged', incident.was_your_vehicle_damaged === 'Yes');

    // PAGE 5: Weather Conditions - Map to PDF field names
    checkField('weather_cloudy', incident.overcast_dull === true);  // weather_overcast → weather_cloudy
    checkField('weather_heavy_rain', incident.heavy_rain === true);  // Already correct
    checkField('road_condition_wet', incident.wet_road === true);  // weather_wet_road → road_condition_wet
    checkField('weather_fog', incident.fog_poor_visibility === true);  // Already correct
    checkField('visibilty_street_lights', incident.street_lights === true);  // weather_street_lights → visibilty_street_lights
    checkField('weather_dusk', incident.dusk === true);  // Already correct

    // clear_and_dry needs to map to TWO fields: weather_clear AND road_condition_dry
    checkField('weather_clear', incident.clear_and_dry === true);  // weather_clear_dry → weather_clear
    checkField('road_condition_dry', incident.clear_and_dry === true);  // weather_clear_dry → road_condition_dry

    checkField('road_condition_snow_covered', incident.snow_ice_on_road === true);  // weather_snow_ice → road_condition_snow_covered
    checkField('weather_drizzle', incident.light_rain === true);  // weather_light_rain → weather_drizzle
    checkField('weather_bright_sunlight', incident.bright_daylight === true);  // weather_bright_daylight → weather_bright_sunlight
    setFieldText('weather_summary', incident.weather_conditions_summary);

    // ========================================
    // PAGE 6: Road & Junction Details
    // ========================================
    // Note: road_type in DB may be a single value that needs to map to checkboxes
    // For now, keeping as text field - may need checkbox mapping later
    setFieldText('road_type', incident.road_type);  // May need to map to road_type_motorway, road_type_urban, etc.
    setFieldText('your_speed', incident.speed_limit);  // speed_limit → your_speed
    setFieldText('junction_type', incident.junction_information);  // junction_info → junction_type
    setFieldText('junction_control', incident.junction_control);  // Additional field for junction control
    setFieldText('special_conditions', incident.special_conditions);

    // PAGE 6: Accident Description
    setFieldText('detailed_account_of_what_happened', incident.describe_what_happened);  // accident_description → detailed_account_of_what_happened

    // ========================================
    // PAGE 5 (NEW): Your Vehicle Details (DVLA, Damage, Driveability)
    // ========================================

    // 1. Usual Vehicle (2 checkboxes from 1 TEXT field)
    checkField('usual_vehicle_yes', incident.usual_vehicle === 'yes');
    checkField('usual_vehicle_no', incident.usual_vehicle === 'no');

    // 2. DVLA Lookup Registration
    setFieldText('vehicle_license_plate', incident.dvla_lookup_reg);  // dvla_lookup_reg → vehicle_license_plate

    // 3. DVLA Vehicle Data (10 text fields) - Remove "vehicle_lookup" prefix
    setFieldText('dvla_make', incident.dvla_vehicle_lookup_make);  // dvla_vehicle_lookup_make → dvla_make
    setFieldText('dvla_model', incident.dvla_vehicle_lookup_model);  // dvla_vehicle_lookup_model → dvla_model
    setFieldText('dvla_colour', incident.dvla_vehicle_lookup_color);  // dvla_vehicle_lookup_color → dvla_colour
    setFieldText('dvla_year', incident.dvla_vehicle_lookup_year);  // dvla_vehicle_lookup_year → dvla_year
    setFieldText('dvla_fuel_type', incident.dvla_vehicle_lookup_fuel_type);  // dvla_vehicle_lookup_fuel_type → dvla_fuel_type
    setFieldText('dvla_mot_status', incident.dvla_vehicle_lookup_mot_status);  // dvla_vehicle_lookup_mot_status → dvla_mot_status
    setFieldText('dvla_mot_expiry', incident.dvla_vehicle_lookup_mot_expiry);  // dvla_vehicle_lookup_mot_expiry → dvla_mot_expiry
    setFieldText('dvla_tax_status', incident.dvla_vehicle_lookup_tax_status);  // dvla_vehicle_lookup_tax_status → dvla_tax_status
    setFieldText('dvla_tax_due_date', incident.dvla_vehicle_lookup_tax_due_date);  // dvla_vehicle_lookup_tax_due_date → dvla_tax_due_date
    // Note: dvla_vehicle_lookup_insurance_status may not have a direct PDF field
    setFieldText('dvla_insurance_status', incident.dvla_vehicle_lookup_insurance_status);

    // 4. Impact Points (10 checkboxes from TEXT[] array)
    const impactPoints = incident.impact_point || [];
    checkField('impact_point_front', impactPoints.includes('front'));
    checkField('impact_point_front_driver', impactPoints.includes('front_driver'));
    checkField('impact_point_front_passenger', impactPoints.includes('front_passenger'));
    checkField('impact_point_driver_side', impactPoints.includes('driver_side'));
    checkField('impact_point_passenger_side', impactPoints.includes('passenger_side'));
    checkField('impact_point_rear_driver', impactPoints.includes('rear_driver'));
    checkField('impact_point_rear_passenger', impactPoints.includes('rear_passenger'));
    checkField('impact_point_rear', impactPoints.includes('rear'));
    checkField('impact_point_roof', impactPoints.includes('roof'));
    checkField('impact_point_undercarriage', impactPoints.includes('undercarriage'));

    // 5. Damage Description
    setFieldText('damage_to_your_vehicle', incident.damage_to_your_vehicle);

    // 6. Vehicle Driveability (3 mutually exclusive checkboxes from 1 TEXT field)
    checkField('vehicle_driveable_yes', incident.vehicle_driveable === 'yes');
    checkField('vehicle_driveable_no', incident.vehicle_driveable === 'no');
    checkField('vehicle_driveable_unsure', incident.vehicle_driveable === 'unsure');

    // ========================================
    // PAGE 7 (LEGACY): Your Vehicle Information
    // ========================================
    setFieldText('driving_usual', incident.driving_usual_vehicle);
    setFieldText('make_of_car', incident.make_of_car);
    setFieldText('model_of_car', incident.model_of_car);
    setFieldText('your_license_plate', incident.license_plate_incident);
    setFieldText('direction_speed', incident.direction_of_travel_and_estimated_speed);
    setFieldText('impact_point', incident.impact_point); // Legacy single text field
    setFieldText('damage_caused', incident.damage_caused_by_accident);
    setFieldText('damage_prior', incident.damage_prior_to_accident);

    // ========================================
    // PAGE 8: Other Vehicles Involved (Page 7 HTML Form)
    // ========================================
    checkField('other_vehicles', incident.other_vehicles_involved === 'Yes');

    // Driver information - Use hyphenated field names from PDF
    setFieldText('other-full-name', incident.other_full_name || incident.other_driver_name);  // other_driver_name → other-full-name
    setFieldText('other-contact-number', incident.other_contact_number || incident.other_driver_number);  // other_driver_number → other-contact-number
    setFieldText('other-email-address', incident.other_email_address);  // other_driver_email → other-email-address
    setFieldText('other-driving-license-number', incident.other_driving_license_number);  // other_driver_license → other-driving-license-number

    // Vehicle registration and DVLA data - Use hyphenated field names
    setFieldText('other-vehicle-registration', incident.other_vehicle_registration);  // other_license → other-vehicle-registration
    setFieldText('other-vehicle-look-up-make', incident.other_vehicle_look_up_make || incident.other_make_of_vehicle);  // other_make → other-vehicle-look-up-make
    setFieldText('other-vehicle-look-up-model', incident.other_vehicle_look_up_model || incident.other_model_of_vehicle);  // other_model → other-vehicle-look-up-model
    setFieldText('other-vehicle-look-up-colour', incident.other_vehicle_look_up_colour);  // other_color → other-vehicle-look-up-colour
    setFieldText('other-vehicle-look-up-year', incident.other_vehicle_look_up_year);  // other_year → other-vehicle-look-up-year
    setFieldText('other-vehicle-look-up-fuel-type', incident.other_vehicle_look_up_fuel_type);  // other_fuel_type → other-vehicle-look-up-fuel-type

    // Vehicle status (DVLA data) - Use hyphenated field names
    setFieldText('other-vehicle-look-up-mot-status', incident.other_vehicle_look_up_mot_status);  // other_mot_status → other-vehicle-look-up-mot-status
    setFieldText('other-vehicle-look-up-mot-expiry-date', incident.other_vehicle_look_up_mot_expiry_date);  // other_mot_expiry → other-vehicle-look-up-mot-expiry-date
    setFieldText('other-vehicle-look-up-tax-status', incident.other_vehicle_look_up_tax_status);  // other_tax_status → other-vehicle-look-up-tax-status
    setFieldText('other-vehicle-look-up-tax-due-date', incident.other_vehicle_look_up_tax_due_date);  // other_tax_due → other-vehicle-look-up-tax-due-date
    setFieldText('other-vehicle-look-up-insurance-status', incident.other_vehicle_look_up_insurance_status);  // other_insurance_status → other-vehicle-look-up-insurance-status

    // Insurance information - Use hyphenated field names
    setFieldText('other-drivers-insurance-company', incident.other_drivers_insurance_company || incident.other_insurance_company);  // other_insurance → other-drivers-insurance-company
    setFieldText('other-drivers-policy-number', incident.other_drivers_policy_number || incident.other_policy_number);  // other_policy_number → other-drivers-policy-number
    setFieldText('other-drivers-policy-holder-name', incident.other_drivers_policy_holder_name || incident.other_policy_holder);  // other_policy_holder → other-drivers-policy-holder-name
    setFieldText('other-drivers-policy-cover-type', incident.other_drivers_policy_cover_type || incident.other_policy_cover);  // other_cover_type → other-drivers-policy-cover-type

    // Damage information
    checkField('no_visible_damage', incident.no_visible_damage === true);
    setFieldText('other_damage_description', incident.describe_damage_to_vehicle);

    // ========================================
    // PAGE 9: Damage to Other Vehicles & Police
    // ========================================
    setFieldText('other_damage_current', incident.damage_to_other_vehicle_current_accident);
    setFieldText('other_damage_prior', incident.damage_to_other_vehicle_prior_to_accident);

    // Police Involvement - Map to PDF field names
    checkField('police_attended', incident.did_the_police_attend_the_scene === 'Yes');  // Already correct
    setFieldText('accident_ref_number', incident.accident_reference_number);  // accident_reference → accident_ref_number
    setFieldText('officer_name', incident.police_officer_name);  // Already correct
    setFieldText('officer_badge', incident.police_officer_badge_number);
    setFieldText('police_force', incident.police_force_details);
    checkField('user_breath_test', incident.breath_test === 'Yes');  // breath_test → user_breath_test
    checkField('other_breath_test', incident.other_breath_test === 'Yes');  // Already correct

    // ========================================
    // PAGE 9: Witnesses (2 witnesses max on this page)
    // ========================================
    // Map first 2 witnesses from incident_witnesses table to page 9 fields
    const hasWitnesses = data.witnesses && data.witnesses.length > 0;

    checkField('witnesses_present', hasWitnesses);  // any_witness → witnesses_present
    // Note: any_witness_no field doesn't exist in PDF template

    // Witness 1 (if exists)
    if (data.witnesses && data.witnesses[0]) {
      const witness1 = data.witnesses[0];
      setFieldText('witness_name', witness1.witness_name || '');
      setFieldText('witness_mobile_number', witness1.witness_mobile_number || '');
      setFieldText('witness_email_address', witness1.witness_email_address || '');
      setFieldText('witness_statement', witness1.witness_statement || '');
      // Note: witness_address is NOT in PDF, so it's not mapped
    }

    // Witness 2 (if exists)
    if (data.witnesses && data.witnesses[1]) {
      const witness2 = data.witnesses[1];
      setFieldText('witness_name_2', witness2.witness_name || '');
      setFieldText('witness_mobile_number_2', witness2.witness_mobile_number || '');
      setFieldText('witness_email_address_2', witness2.witness_email_address || '');
      setFieldText('witness_statement_2', witness2.witness_statement || '');
      // Note: witness_address is NOT in PDF, so it's not mapped
    }

    // Note: Witnesses 3+ will be added as separate pages via appendWitnessPages()

    // ========================================
    // PAGE 10: Additional Info
    // ========================================
    setFieldText('anything_else_important', incident.anything_else_important);  // anything_else → anything_else_important
    // Note: call_recovery and upgrade_premium fields don't exist in PDF template

    // ========================================
    // PAGES 11-12: Evidence Collection (URLs)
    // ========================================
    setFieldText('documents_url', data.imageUrls?.document || incident.file_url_documents || '');
    setFieldText('documents_url_1', data.imageUrls?.document_2 || incident.file_url_documents_1 || '');
    setFieldText('record_account_url', data.imageUrls?.audio_account || incident.file_url_record_detailed_account_of_what_happened || '');
    setFieldText('what3words_url', data.imageUrls?.what3words || incident.file_url_what3words || '');
    setFieldText('scene_overview_url', data.imageUrls?.scene_overview || incident.file_url_scene_overview || '');
    setFieldText('scene_overview_url_1', data.imageUrls?.scene_overview_2 || incident.file_url_scene_overview_1 || '');
    setFieldText('other_vehicle_url', data.imageUrls?.other_vehicle || incident.file_url_other_vehicle || '');
    setFieldText('other_vehicle_url_1', data.imageUrls?.other_vehicle_2 || incident.file_url_other_vehicle_1 || '');
    setFieldText('vehicle_damage_url', data.imageUrls?.vehicle_damage || incident.file_url_vehicle_damage || '');
    setFieldText('vehicle_damage_url_1', data.imageUrls?.vehicle_damage_2 || incident.file_url_vehicle_damage_1 || '');
    setFieldText('vehicle_damage_url_2', data.imageUrls?.vehicle_damage_3 || incident.file_url_vehicle_damage_2 || '');
    setFieldText('spare_url', incident.file_url_spare || '');

    // ========================================
    // PAGE 13: AI Summary of Accident Data
    // ========================================
    // Check for AI summary from both incident and dedicated AI table
    const aiSummaryText = data.aiSummary?.summary ||
                         incident.ai_summary_of_data_collected ||
                         '';
    setFieldText('ai_summary_of_accident_data_transcription', aiSummaryText);  // ai_summary → ai_summary_of_accident_data_transcription

    // ========================================
    // PAGE 14: AI Transcription / Detailed Account
    // ========================================
    // Check for transcription from both incident and dedicated AI table
    const transcriptionText = data.aiTranscription?.transcription ||
                             incident.detailed_account_of_what_happened ||
                             '';
    setFieldText('detailed_account_of_what_happened', transcriptionText);  // ai_transcription → detailed_account_of_what_happened

    // ========================================
    // PAGES 15-16: DVLA Reports
    // ========================================
    if (data.dvla && data.dvla.length > 0) {
      const dvlaInfo = data.dvla[0];

      // PAGE 15: DVLA Report - Driver
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

      // PAGE 16: DVLA Report - Other Driver (if available)
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

    // ========================================
    // PAGE 17: Legal Documentation and Declaration
    // ========================================
    setFieldText('Signature70', `${user.driver_name || ''} ${user.driver_surname || ''}`.trim());  // declaration_name → Signature70
    setFieldText('Date69_af_date', new Date().toLocaleDateString('en-GB'));  // declaration_date → Date69_af_date

    logger.info('✅ All form fields mapped and filled');
  }

  /**
   * Append witness pages to the PDF (one page per witness)
   *
   * @param {PDFDocument} pdfDoc - The main PDF document
   * @param {Array} witnesses - Array of witness objects from database
   * @param {String} userId - User ID for the PDF header
   */
  async appendWitnessPages(pdfDoc, witnesses, userId) {
    try {
      const { PDFDocument } = require('pdf-lib');
      const witnessTemplatePath = path.join(__dirname, '../../pdf-templates/Car-Crash-Lawyer-AI-Witness-Vehicle-Template.pdf');

      if (!fs.existsSync(witnessTemplatePath)) {
        logger.warn('⚠️ Witness template not found, skipping witness pages');
        return;
      }

      // Load the witness template
      const templateBytes = fs.readFileSync(witnessTemplatePath);
      const templateDoc = await PDFDocument.load(templateBytes);

      // Copy page 0 (witness page) for each witness
      for (let i = 0; i < witnesses.length; i++) {
        const witness = witnesses[i];
        logger.info(`📋 Adding witness page ${i + 1}/${witnesses.length}: ${witness.witness_name}`);

        // Copy the witness template page
        const [copiedPage] = await pdfDoc.copyPages(templateDoc, [0]);
        pdfDoc.addPage(copiedPage);

        // Get the form for this page
        const form = pdfDoc.getForm();

        // Fill witness fields
        this.setFieldValue(form, 'User ID', userId || '');
        this.setFieldValue(form, 'Witness Name', witness.witness_name || '');
        this.setFieldValue(form, 'Witness Address', witness.witness_address || '');
        this.setFieldValue(form, 'Witness Mobile', witness.witness_mobile_number || '');
        this.setFieldValue(form, 'Witness Email', witness.witness_email_address || '');
        this.setFieldValue(form, 'Witness Statement', witness.witness_statement || '');
      }

      logger.info(`✅ Added ${witnesses.length} witness page(s) successfully`);
    } catch (error) {
      logger.error('❌ Error appending witness pages:', error);
      // Don't throw - allow PDF generation to continue without witness pages
    }
  }

  /**
   * Append vehicle pages to the PDF (one page per vehicle)
   *
   * @param {PDFDocument} pdfDoc - The main PDF document
   * @param {Array} vehicles - Array of vehicle objects from database
   * @param {String} userId - User ID for the PDF header
   */
  async appendVehiclePages(pdfDoc, vehicles, userId) {
    try {
      const { PDFDocument } = require('pdf-lib');
      const vehicleTemplatePath = path.join(__dirname, '../../pdf-templates/Car-Crash-Lawyer-AI-Witness-Vehicle-Template.pdf');

      if (!fs.existsSync(vehicleTemplatePath)) {
        logger.warn('⚠️ Vehicle template not found, skipping vehicle pages');
        return;
      }

      // Load the vehicle template
      const templateBytes = fs.readFileSync(vehicleTemplatePath);
      const templateDoc = await PDFDocument.load(templateBytes);

      // Copy page 1 (vehicle page) for each vehicle
      for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i];
        logger.info(`🚗 Adding vehicle page ${i + 1}/${vehicles.length}: ${vehicle.vehicle_license_plate}`);

        // Copy the vehicle template page
        const [copiedPage] = await pdfDoc.copyPages(templateDoc, [1]);
        pdfDoc.addPage(copiedPage);

        // Get the form for this page
        const form = pdfDoc.getForm();

        // Fill vehicle fields (matching the PDF template field names)
        this.setFieldValue(form, 'User ID', userId || '');
        this.setFieldValue(form, 'Additional Driver Name', vehicle.driver_name || '');
        this.setFieldValue(form, 'Additional Driver Adress', vehicle.driver_address || ''); // Note: "Adress" matches template typo
        this.setFieldValue(form, 'Additional Driver Mobile', vehicle.driver_phone || '');
        this.setFieldValue(form, 'Additional Driver email:', vehicle.driver_email || '');
        this.setFieldValue(form, 'Additional registration Number', vehicle.vehicle_license_plate || '');
        this.setFieldValue(form, 'Additional Make of Vehicle', vehicle.vehicle_make || '');
        this.setFieldValue(form, 'Additional Model of Vehicle', vehicle.vehicle_model || '');
        this.setFieldValue(form, 'Additional Vehicle Colour', vehicle.vehicle_color || '');
        this.setFieldValue(form, 'Additional Vehicle Year', vehicle.vehicle_year_of_manufacture || '');
        this.setFieldValue(form, 'Additional Insurance Company', vehicle.insurance_company || '');
        this.setFieldValue(form, 'Additional Policy Cover', vehicle.policy_cover || '');
        this.setFieldValue(form, 'Additional Policy Holder', vehicle.policy_holder || '');

        // DVLA-specific fields (if available)
        this.setFieldValue(form, 'Additional MOT status:', vehicle.mot_status || '');
        this.setFieldValue(form, 'Additional MOT expiry Date', vehicle.mot_expiry_date || '');
        this.setFieldValue(form, 'Additional Tax Status', vehicle.tax_status || '');
        this.setFieldValue(form, 'Additional Tax expiry Date', vehicle.tax_due_date || '');
        this.setFieldValue(form, 'Additional Fuel Type', vehicle.fuel_type || '');
        this.setFieldValue(form, 'Additional Engine Capacity', vehicle.engine_capacity || '');
      }

      logger.info(`✅ Added ${vehicles.length} vehicle page(s) successfully`);
    } catch (error) {
      logger.error('❌ Error appending vehicle pages:', error);
      // Don't throw - allow PDF generation to continue without vehicle pages
    }
  }

  /**
   * Compress the filled PDF to reduce file size
   *
   * @param {Buffer} pdfBuffer - The filled PDF buffer
   * @param {String} compressionLevel - 'LOW', 'MEDIUM', or 'HIGH'
   * @returns {Promise<Buffer>} - Compressed PDF buffer
   */
  async compressPdf(pdfBuffer, compressionLevel = 'MEDIUM') {
    try {
      const adobePdfService = require('./adobePdfService');

      if (adobePdfService.isReady()) {
        logger.info(`🗜️ Compressing PDF (${compressionLevel} compression)...`);
        return await adobePdfService.compressPdf(pdfBuffer, compressionLevel);
      } else {
        logger.warn('⚠️ Adobe compression not available, returning original PDF');
        return pdfBuffer;
      }
    } catch (error) {
      logger.error('Error compressing PDF:', error);
      return pdfBuffer; // Return original if compression fails
    }
  }
}

// Export singleton instance
module.exports = new AdobePdfFormFillerService();
