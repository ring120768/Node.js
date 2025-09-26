
// services/pdf-service.js
// Comprehensive PDF Service for Car Crash Lawyer AI
// Handles PDF generation, storage, and email delivery with GDPR compliance

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');

class PDFService {
  constructor(supabase, logger, gdprModule = null) {
    this.supabase = supabase;
    this.logger = logger || console;
    this.gdprModule = gdprModule;
    this.templatePath = path.join(process.cwd(), 'Template.pdf');
    this.bucketName = 'incident-images-secure';
  }

  /**
   * Generate a complete PDF report from collected incident data
   * @param {Object} data - All data fetched from Supabase
   * @returns {Buffer} PDF file as a buffer
   */
  async generatePDF(data) {
    try {
      this.logger.info('📝 Starting PDF generation...', {
        userId: data.metadata?.create_user_id,
        userExists: !!data.user
      });

      // Load the PDF template
      const existingPdfBytes = await fs.readFile(this.templatePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      // Helper functions for safe field operations
      const setFieldText = (fieldName, value, fallback = '') => {
        try {
          const field = form.getTextField(fieldName);
          if (field) {
            const textValue = String(value || fallback || '');
            field.setText(textValue);
          }
        } catch (error) {
          this.logger.warn(`Field operation failed: ${fieldName}`, error.message);
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
          this.logger.warn(`Checkbox operation failed: ${fieldName}`, error.message);
        }
      };

      const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          return date.toLocaleDateString('en-GB');
        } catch {
          return dateString;
        }
      };

      const toBoolean = (value) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lowered = value.toLowerCase();
          return lowered === 'yes' || lowered === 'true' || lowered === '1';
        }
        return !!value;
      };

      // Extract main data objects
      const user = data.user || {};
      const incident = data.currentIncident || {};
      const aiTranscription = data.aiTranscription || {};
      const aiSummary = data.aiSummary || {};

      // Fill PDF fields systematically
      this.fillPersonalInformation(setFieldText, formatDate, user, data.metadata);
      this.fillEmergencyAndInsurance(setFieldText, formatDate, user);
      this.fillSafetyAssessment(setFieldText, checkField, formatDate, toBoolean, incident);
      this.fillAccidentDetails(setFieldText, checkField, formatDate, toBoolean, incident);
      this.fillRoadDetails(setFieldText, incident);
      this.fillVehicleInformation(setFieldText, incident);
      this.fillOtherVehicles(setFieldText, checkField, toBoolean, incident);
      this.fillPoliceInvolvement(setFieldText, checkField, toBoolean, incident);
      this.fillAdditionalInfo(setFieldText, checkField, toBoolean, incident);
      this.fillEvidenceUrls(setFieldText, data.imageUrls, incident);
      this.fillAISummary(setFieldText, aiSummary, incident);
      this.fillAITranscription(setFieldText, aiTranscription, incident);
      this.fillDVLAInformation(setFieldText, formatDate, data.dvla);
      this.fillDeclaration(setFieldText, formatDate, user);

      // Flatten the form to make it read-only
      form.flatten();

      // Generate the PDF buffer
      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      this.logger.info(`✅ PDF generated successfully`, {
        size: pdfBuffer.length,
        pages: pdfDoc.getPageCount()
      });

      return pdfBuffer;

    } catch (error) {
      this.logger.error('❌ PDF generation failed:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Store completed PDF form in Supabase
   * @param {string} createUserId - User ID
   * @param {Buffer} pdfBuffer - PDF data
   * @param {Object} allData - Complete form data
   * @returns {Object} Storage result
   */
  async storeCompletedForm(createUserId, pdfBuffer, allData) {
    try {
      const fileName = `completed_forms/${createUserId}/report_${Date.now()}.pdf`;
      
      // Upload to Supabase storage
      const { data: storageData, error: storageError } = await this.supabase.storage
        .from(this.bucketName)
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false
        });

      let pdfUrl = null;
      if (storageData && !storageError) {
        const { data: urlData } = await this.supabase.storage
          .from(this.bucketName)
          .createSignedUrl(fileName, 31536000); // 1 year

        if (urlData) {
          pdfUrl = urlData.signedUrl;
        }
      }

      // Store form record in database
      const { data, error } = await this.supabase
        .from('completed_incident_forms')
        .insert({
          create_user_id: createUserId,
          form_data: allData,
          pdf_url: pdfUrl,
          generated_at: new Date().toISOString(),
          sent_to_user: false,
          sent_to_accounts: false,
          email_status: {}
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Error storing completed form:', error);
        throw error;
      }

      // Log GDPR activity
      if (this.gdprModule) {
        await this.gdprModule.auditLog(createUserId, 'PDF_GENERATED', {
          formId: data.id,
          storagePath: fileName,
          fileSize: pdfBuffer.length
        });
      }

      return data;

    } catch (error) {
      this.logger.error('Error in storeCompletedForm:', error);
      throw error;
    }
  }

  /**
   * Send PDF via email to user and accounts
   * @param {Object} emailData - Email configuration
   * @returns {Object} Email result
   */
  async sendEmails(emailData) {
    try {
      const { userEmail, userName, pdfBuffer, formId } = emailData;

      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        this.logger.warn('Email not configured - SMTP settings missing');
        return { sent: false, reason: 'SMTP not configured' };
      }

      // Create transporter
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const results = {
        user: false,
        accounts: false,
        errors: []
      };

      // Send to user
      if (userEmail) {
        try {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: userEmail,
            subject: 'Your Car Accident Report - Car Crash Lawyer AI',
            html: this.generateUserEmailHTML(userName),
            attachments: [{
              filename: `accident-report-${formId}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }]
          });
          results.user = true;
          this.logger.info(`✅ Email sent to user: ${userEmail}`);
        } catch (error) {
          this.logger.error(`❌ Failed to send email to user: ${userEmail}`, error);
          results.errors.push(`User email failed: ${error.message}`);
        }
      }

      // Send to accounts team
      const accountsEmail = process.env.ACCOUNTS_EMAIL;
      if (accountsEmail) {
        try {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: accountsEmail,
            subject: `New Accident Report - ${userName} (${formId})`,
            html: this.generateAccountsEmailHTML(userName, userEmail, formId),
            attachments: [{
              filename: `accident-report-${formId}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }]
          });
          results.accounts = true;
          this.logger.info(`✅ Email sent to accounts: ${accountsEmail}`);
        } catch (error) {
          this.logger.error(`❌ Failed to send email to accounts: ${accountsEmail}`, error);
          results.errors.push(`Accounts email failed: ${error.message}`);
        }
      }

      return {
        sent: results.user || results.accounts,
        user: results.user,
        accounts: results.accounts,
        errors: results.errors
      };

    } catch (error) {
      this.logger.error('Email service error:', error);
      throw error;
    }
  }

  /**
   * Fetch all data needed for PDF generation
   * @param {string} createUserId - User ID
   * @returns {Object} Complete data set
   */
  async fetchAllData(createUserId) {
    try {
      this.logger.info('📊 Fetching all data for PDF generation', { userId: createUserId });

      // Fetch user signup data
      const { data: userSignup, error: userError } = await this.supabase
        .from('user_signup')
        .select('*')
        .eq('create_user_id', createUserId)
        .single();

      if (userError || !userSignup) {
        throw new Error(`User not found: ${createUserId}`);
      }

      // Fetch latest incident report
      const { data: incidentReports, error: incidentError } = await this.supabase
        .from('incident_reports')
        .select('*')
        .eq('create_user_id', createUserId)
        .order('created_at', { ascending: false })
        .limit(1);

      const currentIncident = incidentReports?.[0] || null;

      // Fetch AI transcription
      const { data: aiTranscription } = await this.supabase
        .from('ai_transcription')
        .select('*')
        .eq('create_user_id', createUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Fetch AI summary
      const { data: aiSummary } = await this.supabase
        .from('ai_summary')
        .select('*')
        .eq('create_user_id', createUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Fetch DVLA data
      const { data: dvlaData } = await this.supabase
        .from('dvla_vehicle_data')
        .select('*')
        .eq('create_user_id', createUserId)
        .order('created_at', { ascending: false })
        .limit(2);

      // Fetch incident images and generate signed URLs
      const imageUrls = await this.generateSignedImageUrls(createUserId, currentIncident?.id);

      const allData = {
        user: userSignup,
        currentIncident: currentIncident,
        aiTranscription: aiTranscription,
        aiSummary: aiSummary,
        dvla: dvlaData || [],
        imageUrls: imageUrls,
        metadata: {
          create_user_id: createUserId,
          generated_at: new Date().toISOString()
        }
      };

      this.logger.info('✅ Data fetch complete', {
        hasUser: !!userSignup,
        hasIncident: !!currentIncident,
        hasTranscription: !!aiTranscription,
        hasSummary: !!aiSummary,
        dvlaRecords: dvlaData?.length || 0,
        imageUrls: Object.keys(imageUrls).length
      });

      return allData;

    } catch (error) {
      this.logger.error('Error fetching data for PDF:', error);
      throw error;
    }
  }

  /**
   * Generate signed URLs for incident images
   * @param {string} createUserId - User ID
   * @param {string} incidentId - Incident ID
   * @returns {Object} Image URLs
   */
  async generateSignedImageUrls(createUserId, incidentId) {
    const imageUrls = {};
    
    if (!incidentId) return imageUrls;

    try {
      const { data: images } = await this.supabase
        .from('incident_images')
        .select('image_type, file_name')
        .eq('create_user_id', createUserId)
        .eq('incident_report_id', incidentId);

      if (images) {
        for (const image of images) {
          try {
            const { data: urlData } = await this.supabase.storage
              .from(this.bucketName)
              .createSignedUrl(image.file_name, 3600);

            if (urlData) {
              imageUrls[image.image_type] = urlData.signedUrl;
            }
          } catch (error) {
            this.logger.warn(`Failed to generate URL for ${image.image_type}:`, error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error generating signed URLs:', error);
    }

    return imageUrls;
  }

  // PDF filling helper methods
  fillPersonalInformation(setFieldText, formatDate, user, metadata) {
    setFieldText('user_id', metadata.create_user_id);
    setFieldText('driver_name', user.driver_name);
    setFieldText('driver_surname', user.driver_surname);
    setFieldText('driver_email', user.driver_email);
    setFieldText('driver_mobile', user.driver_mobile);
    setFieldText('driver_street', user.driver_street);
    setFieldText('driver_town', user.driver_town);
    setFieldText('driver_postcode', user.driver_postcode);
    setFieldText('driver_country', user.driver_country || 'United Kingdom');
    setFieldText('license_number', user.license_number);
    setFieldText('license_plate', user.license_plate);
    setFieldText('vehicle_make', user.vehicle_make);
    setFieldText('vehicle_model', user.vehicle_model);
    setFieldText('vehicle_colour', user.vehicle_colour);
    setFieldText('vehicle_condition', user.vehicle_condition);
    setFieldText('recovery_company', user.recovery_company);
    setFieldText('recovery_breakdown_number', user.recovery_breakdown_number);
    setFieldText('recovery_breakdown_email', user.recovery_breakdown_email);
  }

  fillEmergencyAndInsurance(setFieldText, formatDate, user) {
    setFieldText('emergency_contact', user.emergency_contact);
    setFieldText('emergency_contact_number', user.emergency_contact_number);
    setFieldText('insurance_company', user.insurance_company);
    setFieldText('policy_number', user.policy_number);
    setFieldText('policy_holder', user.policy_holder);
    setFieldText('cover_type', user.cover_type);
    setFieldText('sign_up_date', formatDate(user.sign_up_date));
  }

  fillSafetyAssessment(setFieldText, checkField, formatDate, toBoolean, incident) {
    setFieldText('form_id', incident.id);
    setFieldText('submit_date', formatDate(incident.created_at));
    checkField('safe_ready', toBoolean(incident.are_you_safe_and_ready_to_complete_this_form));
    checkField('medical_attention_required', toBoolean(incident.medical_attention_required));
    setFieldText('how_feeling', incident.how_are_you_feeling);
    setFieldText('medical_attention_who', incident.medical_attention_from_who);
    setFieldText('medical_further', incident.medical_further_attention);
    checkField('six_point_check', toBoolean(incident.six_point_safety_check_completed));
    checkField('emergency_contact_made', toBoolean(incident.emergency_contact_made));

    // Medical symptoms
    const medicalChecks = [
      'chest_pain', 'uncontrolled_bleeding', 'breathlessness', 'limb_weakness',
      'loss_consciousness', 'severe_headache', 'abdominal_bruising', 'change_vision',
      'abdominal_pain', 'limb_pain', 'none_feel_fine'
    ];

    medicalChecks.forEach(symptom => {
      let dbFieldName = symptom;
      if (symptom === 'loss_consciousness') {
        dbFieldName = 'loss_of_consciousness';
      } else if (symptom === 'limb_pain') {
        dbFieldName = 'limb_pain_impeding_mobility';
      } else if (symptom === 'none_feel_fine') {
        dbFieldName = 'none_of_these_i_feel_fine';
      }
      checkField(symptom, toBoolean(incident[dbFieldName]));
    });

    setFieldText('medical_conditions_summary', incident.medical_conditions_summary);
  }

  fillAccidentDetails(setFieldText, checkField, formatDate, toBoolean, incident) {
    checkField('wearing_seatbelts', toBoolean(incident.wearing_seatbelts));
    checkField('airbags_deployed', toBoolean(incident.airbags_deployed));
    setFieldText('why_no_seatbelts', incident.why_werent_seat_belts_being_worn);
    checkField('vehicle_damaged', toBoolean(incident.was_your_vehicle_damaged));
    setFieldText('accident_date', formatDate(incident.when_did_the_accident_happen));
    setFieldText('accident_time', incident.what_time_did_the_accident_happen);
    setFieldText('accident_location', incident.where_exactly_did_the_accident_happen);

    // Weather conditions
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
  }

  fillRoadDetails(setFieldText, incident) {
    setFieldText('road_type', incident.road_type);
    setFieldText('speed_limit', incident.speed_limit);
    setFieldText('junction_info', incident.junction_information);
    setFieldText('special_conditions', incident.special_conditions);
    setFieldText('accident_description', incident.describe_what_happened);
  }

  fillVehicleInformation(setFieldText, incident) {
    setFieldText('driving_usual', incident.driving_usual_vehicle);
    setFieldText('make_of_car', incident.make_of_car);
    setFieldText('model_of_car', incident.model_of_car);
    setFieldText('your_license_plate', incident.license_plate_incident);
    setFieldText('direction_speed', incident.direction_of_travel_and_estimated_speed);
    setFieldText('impact_point', incident.impact_point);
    setFieldText('damage_caused', incident.damage_caused_by_accident);
    setFieldText('damage_prior', incident.damage_prior_to_accident);
  }

  fillOtherVehicles(setFieldText, checkField, toBoolean, incident) {
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
  }

  fillPoliceInvolvement(setFieldText, checkField, toBoolean, incident) {
    checkField('police_attended', toBoolean(incident.did_the_police_attend_the_scene));
    setFieldText('accident_reference', incident.accident_reference_number);
    setFieldText('officer_name', incident.police_officer_name);
    setFieldText('officer_badge', incident.police_officer_badge_number);
    setFieldText('police_force', incident.police_force_details);
    checkField('breath_test', toBoolean(incident.breath_test));
    checkField('other_breath_test', toBoolean(incident.other_breath_test));
  }

  fillAdditionalInfo(setFieldText, checkField, toBoolean, incident) {
    setFieldText('anything_else', incident.anything_else_important);
    checkField('witness_present', toBoolean(incident.witness_present));
    setFieldText('witness_info', incident.witness_information);
    checkField('call_recovery', toBoolean(incident.call_recovery));
    checkField('upgrade_premium', toBoolean(incident.upgrade_to_premium));
  }

  fillEvidenceUrls(setFieldText, imageUrls, incident) {
    setFieldText('documents_url', imageUrls.document || incident.file_url_documents || '');
    setFieldText('documents_url_1', imageUrls.document_2 || incident.file_url_documents_1 || '');
    setFieldText('record_account_url', imageUrls.audio_account || incident.file_url_record_detailed_account_of_what_happened || '');
    setFieldText('what3words_url', imageUrls.what3words || incident.file_url_what3words || '');
    setFieldText('scene_overview_url', imageUrls.scene_overview || incident.file_url_scene_overview || '');
    setFieldText('scene_overview_url_1', imageUrls.scene_overview_2 || incident.file_url_scene_overview_1 || '');
    setFieldText('other_vehicle_url', imageUrls.other_vehicle || incident.file_url_other_vehicle || '');
    setFieldText('other_vehicle_url_1', imageUrls.other_vehicle_2 || incident.file_url_other_vehicle_1 || '');
    setFieldText('vehicle_damage_url', imageUrls.vehicle_damage || incident.file_url_vehicle_damage || '');
    setFieldText('vehicle_damage_url_1', imageUrls.vehicle_damage_2 || incident.file_url_vehicle_damage_1 || '');
    setFieldText('vehicle_damage_url_2', imageUrls.vehicle_damage_3 || incident.file_url_vehicle_damage_2 || '');
  }

  fillAISummary(setFieldText, aiSummary, incident) {
    if (aiSummary && aiSummary.summary_text) {
      setFieldText('ai_summary', aiSummary.summary_text);
    } else {
      const fallbackSummary = incident.ai_summary_of_data_collected || 'AI analysis pending';
      setFieldText('ai_summary', fallbackSummary);
    }
  }

  fillAITranscription(setFieldText, aiTranscription, incident) {
    if (aiTranscription && aiTranscription.transcription_text) {
      setFieldText('ai_transcription', aiTranscription.transcription_text);
    } else {
      const fallbackText = incident.detailed_account_of_what_happened || 'No audio transcription available';
      setFieldText('ai_transcription', fallbackText);
    }
  }

  fillDVLAInformation(setFieldText, formatDate, dvlaData) {
    if (dvlaData && dvlaData.length > 0) {
      const userDvla = dvlaData[0];
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

      // Other vehicle DVLA info if available
      if (dvlaData.length > 1) {
        const otherDvla = dvlaData[1];
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
      }
    }
  }

  fillDeclaration(setFieldText, formatDate, user) {
    const fullName = `${user.driver_name || ''} ${user.driver_surname || ''}`.trim() || 'Not provided';
    setFieldText('declaration_name', fullName);
    setFieldText('declaration_date', formatDate(new Date()));
    setFieldText('declaration_signature', fullName);
  }

  generateUserEmailHTML(userName) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your Car Accident Report</h2>
        <p>Dear ${userName || 'Valued Client'},</p>
        <p>Thank you for using Car Crash Lawyer AI. Your completed accident report is attached to this email.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #007acc; margin-top: 0;">What's Next?</h3>
          <ul>
            <li>Review your report for accuracy</li>
            <li>Share with your insurance company</li>
            <li>Keep a copy for your records</li>
            <li>Contact us if you need any assistance</li>
          </ul>
        </div>
        <p>If you have any questions about your report, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>Car Crash Lawyer AI Team</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666;">
          This email contains your personal accident report. Please keep it secure and confidential.
        </p>
      </div>
    `;
  }

  generateAccountsEmailHTML(userName, userEmail, formId) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Accident Report Submitted</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #007acc; margin-top: 0;">Report Details</h3>
          <ul>
            <li><strong>Client Name:</strong> ${userName}</li>
            <li><strong>Client Email:</strong> ${userEmail}</li>
            <li><strong>Form ID:</strong> ${formId}</li>
            <li><strong>Submitted:</strong> ${new Date().toLocaleString()}</li>
          </ul>
        </div>
        <p>A new accident report has been generated and is ready for review. The complete PDF report is attached.</p>
        <p>Please process this submission according to standard procedures.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666;">
          This is an automated message from Car Crash Lawyer AI system.
        </p>
      </div>
    `;
  }
}

module.exports = PDFService;
