/**
 * Adobe PDF Form Filler Service
 *
 * This service uses Adobe PDF Services to fill the Car Crash Lawyer AI
 * fillable PDF form with data from Supabase.
 *
 * This replaces the Zapier + PDFco workflow with direct integration.
 */

const { ServicePrincipalCredentials, PDFServices } = require('@adobe/pdfservices-node-sdk');
const { PDFDocument, PDFName, PDFDict, PDFString } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// NEW: HTML rendering services for hybrid PDF generation (pages 13-16)
const aiAnalysisHtmlRenderer = require('./aiAnalysisHtmlRenderer');
const htmlToPdfConverter = require('./htmlToPdfConverter');

class AdobePdfFormFillerService {
  constructor() {
    this.initialized = false;
    this.credentials = null;
    this.pdfServices = null;
    // FIX: Updated to use latest PDF template (18 Nov 2025) with corrected field names
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

      // Create a PDFDocument from the template (pdf-lib imported at top of file)
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

      // FIX: Set NeedAppearances flag to force PDF readers to generate visual appearances
      // This is required for checkboxes like weather_dusk that have no appearance dictionary
      // Without this, Adobe Acrobat won't render checkmarks visually even if field is checked
      console.log('\\n🔧 Setting NeedAppearances flag for checkbox rendering...');
      try {
        const acroForm = pdfDoc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
        if (acroForm) {
          acroForm.set(PDFName.of('NeedAppearances'), pdfDoc.context.obj(true));
          console.log('✅ NeedAppearances flag set to true');
        } else {
          console.log('⚠️ AcroForm not found, NeedAppearances flag not set');
        }
      } catch (e) {
        console.log('⚠️ Failed to set NeedAppearances flag:', e.message);
      }

      // ========================================
      // HYBRID PDF GENERATION: HTML Pages 13-16
      // ========================================
      // Render HTML templates for AI analysis pages with beautiful styling
      console.log('\n🎨 Rendering HTML templates for pages 13-16...');

      // FIX: dataFetcher returns 'currentIncident', not 'incident'
      const incident = data.currentIncident || data.incident || {};

      // DEBUG: Log what data we're passing to HTML renderer
      console.log('📊 DEBUG: Data being passed to HTML renderer:');
      console.log(`   voice_transcription: ${incident.voice_transcription ? incident.voice_transcription.length + ' chars' : 'EMPTY/UNDEFINED'}`);
      console.log(`   analysis_metadata: ${incident.analysis_metadata ? JSON.stringify(incident.analysis_metadata).substring(0, 100) : 'EMPTY/UNDEFINED'}`);
      console.log(`   quality_review: ${incident.quality_review ? incident.quality_review.length + ' chars' : 'EMPTY/UNDEFINED'}`);
      console.log(`   ai_summary: ${incident.ai_summary ? incident.ai_summary.length + ' chars' : 'EMPTY/UNDEFINED'}`);
      console.log(`   closing_statement: ${incident.closing_statement ? incident.closing_statement.length + ' chars' : 'EMPTY/UNDEFINED'}`);
      console.log(`   final_review: ${incident.final_review ? incident.final_review.length + ' chars' : 'EMPTY/UNDEFINED'}`);

      const htmlPages = await aiAnalysisHtmlRenderer.renderAllPages({
        voice_transcription: incident.voice_transcription,
        analysis_metadata: incident.analysis_metadata,
        quality_review: incident.quality_review,
        ai_summary: incident.ai_summary,
        closing_statement: incident.closing_statement,
        final_review: incident.final_review
      });

      console.log('🔄 Converting HTML to PDF using Puppeteer...');
      const htmlPdfBuffers = await htmlToPdfConverter.convertMultiplePages(htmlPages);

      // ========================================
      // PDF MERGING: Combine Form + HTML Pages
      // ========================================
      console.log('🔗 Merging form-filled pages with HTML-rendered pages...');

      // CRITICAL: Do NOT flatten the form when NeedAppearances is set
      //
      // Root cause analysis (Nov 2025):
      // - form.flatten() converts form fields to static content
      // - NeedAppearances flag tells PDF readers to regenerate field appearances
      // - These two operations conflict when merging with copyPages()
      // - Result: Invalid XRef entries that prevent pages 13-19 from rendering
      //
      // Testing confirmed:
      // - Without flatten: 0 XRef errors ✅
      // - With flatten + NeedAppearances: 10+ XRef errors ❌
      //
      // Solution: Keep NeedAppearances (required for checkbox rendering),
      //           remove flatten() (keeps fields editable, no XRef corruption)
      //
      // See test: test-flatten-with-needappearances.js
      //
      // form.flatten(); // ← PERMANENTLY DISABLED - DO NOT RE-ENABLE

      // Create final merged PDF document
      const mergedPdf = await PDFDocument.create();

      // Count current pages in the form-filled PDF
      const totalFormPages = pdfDoc.getPageCount();
      console.log(`  📊 Form PDF has ${totalFormPages} pages total`);

      // Step 1: Copy pages 1-12 from form-filled PDF
      console.log('  📄 Copying form pages 1-12...');
      const formPages1to12 = await mergedPdf.copyPages(pdfDoc, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      formPages1to12.forEach(page => mergedPdf.addPage(page));

      // Step 2: Load and add HTML-rendered pages 13-16
      console.log('  🎨 Adding HTML pages 13-16...');
      const page13Pdf = await PDFDocument.load(htmlPdfBuffers.page13);
      const page14Pdf = await PDFDocument.load(htmlPdfBuffers.page14);
      const page15Pdf = await PDFDocument.load(htmlPdfBuffers.page15);
      const page16Pdf = await PDFDocument.load(htmlPdfBuffers.page16);

      const [htmlPage13] = await mergedPdf.copyPages(page13Pdf, [0]);
      const [htmlPage14] = await mergedPdf.copyPages(page14Pdf, [0]);
      const [htmlPage15] = await mergedPdf.copyPages(page15Pdf, [0]);
      const [htmlPage16] = await mergedPdf.copyPages(page16Pdf, [0]);

      mergedPdf.addPage(htmlPage13);
      mergedPdf.addPage(htmlPage14);
      mergedPdf.addPage(htmlPage15);
      mergedPdf.addPage(htmlPage16);

      // Step 3: Copy remaining pages 17-18 from form-filled PDF
      console.log('  📄 Copying form pages 17-18...');
      const formPages17to18 = await mergedPdf.copyPages(pdfDoc, [16, 17]);
      formPages17to18.forEach(page => mergedPdf.addPage(page));

      // Step 4: Copy any additional pages (witnesses, vehicles) if they exist
      if (totalFormPages > 18) {
        const additionalPageCount = totalFormPages - 18;
        console.log(`  📋 Copying ${additionalPageCount} additional page(s) (witnesses/vehicles)...`);

        const additionalPageIndices = Array.from(
          { length: additionalPageCount },
          (_, i) => 18 + i
        );
        const additionalPages = await mergedPdf.copyPages(pdfDoc, additionalPageIndices);
        additionalPages.forEach(page => mergedPdf.addPage(page));
      }

      console.log(`✅ PDF merge complete: ${mergedPdf.getPageCount()} pages total`);

      // Save the merged PDF
      console.log('\\n💾 Saving merged PDF...');
      const filledPdfBytes = await mergedPdf.save();
      const filledPdfBuffer = Buffer.from(filledPdfBytes);

      logger.info(`✅ Hybrid PDF generated successfully (${(filledPdfBuffer.length / 1024).toFixed(2)} KB)`);

      return filledPdfBuffer;

    } catch (error) {
      logger.error('❌ Error filling PDF form:', error);
      throw error;
    }
  }

  /**
   * Fill all form fields based on Supabase data
   * CORRECTED: Uses actual database column names instead of old Typeform fields
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
        // Silently handle missing fields
      }
    };

    const setFieldTextWithMaxFont = (fieldName, value, maxFontSize = 14) => {
      try {
        const field = form.getTextField(fieldName);
        if (field && value !== null && value !== undefined) {
          field.setText(String(value));
          // Set maximum font size to prevent huge text
          field.setFontSize(maxFontSize);
        }
      } catch (error) {
        // Silently handle missing fields
      }
    };

    // Helper for URL fields: auto-fit font size based on field dimensions and text length
    const setUrlFieldWithAutoFitFont = (fieldName, value) => {
      try {
        const field = form.getTextField(fieldName);
        if (field && value !== null && value !== undefined) {
          const text = String(value);

          // Get field dimensions
          const widgets = field.acroField.getWidgets();
          if (widgets.length === 0) {
            // Fallback if no widgets
            field.enableMultiline();
            field.enableScrolling();
            field.setText(text);
            field.setFontSize(6);
            return;
          }

          const rect = widgets[0].getRectangle();
          const fieldWidth = rect.width;
          const fieldHeight = rect.height;

          // Calculate appropriate font size based on text length and field size
          // Approximate characters per line at different font sizes (assuming ~0.6 * fontSize width per char)
          // For multiline, estimate how many lines we need

          let fontSize = 10; // Start with readable size
          const minFontSize = 4;
          const maxFontSize = 10;

          // Estimate characters per line (rough approximation: fieldWidth / (fontSize * 0.6))
          // Estimate lines needed: textLength / charsPerLine
          // Estimate height needed: linesNeeded * (fontSize * 1.2) for line spacing

          while (fontSize >= minFontSize) {
            const avgCharWidth = fontSize * 0.6; // Approximate character width
            const charsPerLine = Math.floor(fieldWidth / avgCharWidth);
            const linesNeeded = Math.ceil(text.length / charsPerLine);
            const lineHeight = fontSize * 1.2; // Line spacing factor
            const heightNeeded = linesNeeded * lineHeight;

            if (heightNeeded <= fieldHeight || fontSize === minFontSize) {
              break;
            }

            fontSize -= 1;
          }

          // Ensure font size is within bounds
          fontSize = Math.max(minFontSize, Math.min(maxFontSize, fontSize));

          // Enable multiline and scrolling for long URLs
          field.enableMultiline();
          field.enableScrolling();
          field.setText(text);

          // Try to set font size, but add /DA entry if missing
          try {
            field.setFontSize(fontSize);
          } catch (daError) {
            // Field has no /DA (default appearance) entry - create one
            console.log(`   🔧 Field "${fieldName}" missing /DA entry, creating it...`);
            try {
              const acroField = field.acroField;
              const fieldDict = acroField.dict;

              // Create /DA string: /Font_Name font_size Tf color_r color_g color_b rg
              // The /DA entry already contains the font size
              // Don't call setFontSize() or updateAppearances() - let form.updateFieldAppearances() handle it
              const daString = `/Helv ${fontSize} Tf 0 0 0 rg`;
              fieldDict.set(PDFName.of('DA'), PDFString.of(daString));
              console.log(`   ✅ /DA entry created with font size ${fontSize}`);
            } catch (createError) {
              console.log(`   ⚠️ Failed to create /DA entry: ${createError.message}`);
            }
          }
        }
      } catch (error) {
        // Silently handle missing fields
      }
    };

    const checkField = (fieldName, shouldCheck) => {
      try {
        const field = form.getCheckBox(fieldName);
        if (field) {
          // Handle both boolean and string values (e.g., "true", "yes", true)
          const isChecked = shouldCheck === true ||
                           shouldCheck === 'true' ||
                           shouldCheck === 'yes' ||
                           shouldCheck === '1' ||
                           shouldCheck === 1;

          if (isChecked) {
            field.check();
          } else {
            field.uncheck();
          }

          // DEBUG: Log checkbox operations for key fields
          if (fieldName === 'final_feeling' || fieldName === 'medical_symptom_change_in_vision' || fieldName === 'weather_dusk') {
            console.log(`    ✅ Checkbox "${fieldName}" ${isChecked ? 'CHECKED' : 'UNCHECKED'} (shouldCheck value: ${shouldCheck}, type: ${typeof shouldCheck})`);
          }
        } else {
          // DEBUG: Log if field doesn't exist
          if (fieldName === 'final_feeling' || fieldName === 'medical_symptom_change_in_vision' || fieldName === 'weather_dusk') {
            console.log(`    ❌ Checkbox "${fieldName}" field exists but is falsy`);
          }
        }
      } catch (error) {
        // DEBUG: Log field not found errors for key fields
        if (fieldName === 'final_feeling' || fieldName === 'medical_symptom_change_in_vision' || fieldName === 'weather_dusk') {
          console.log(`    ❌ Checkbox "${fieldName}" NOT FOUND in PDF: ${error.message}`);
        }
      }
    };

    // Helper function to handle yes/no checkbox pairs
    // CRITICAL: PDF templates often have TWO checkboxes for boolean questions (yes and no)
    // This function ensures only one is checked at a time
    const checkFieldPair = (yesFieldName, noFieldName, value) => {
      const isTrue = value === true ||
                     value === 'true' ||
                     value === 'yes' ||
                     value === 1 ||
                     value === '1';
      const isFalse = value === false ||
                      value === 'false' ||
                      value === 'no' ||
                      value === 0 ||
                      value === '0';

      if (isTrue) {
        checkField(yesFieldName, true);
        checkField(noFieldName, false);
      } else if (isFalse) {
        checkField(yesFieldName, false);
        checkField(noFieldName, true);
      } else {
        // undefined/null: uncheck both
        checkField(yesFieldName, false);
        checkField(noFieldName, false);
      }
    };

    // Helper for text fields with fixed font size (no auto-calculation)
    const setFieldTextWithFixedFont = (fieldName, value, fontSize) => {
      try {
        const field = form.getTextField(fieldName);
        if (field && value !== null && value !== undefined) {
          const text = String(value);
          field.enableMultiline();
          field.enableScrolling();
          field.setText(text);

          // Try to set font size, but add /DA entry if missing
          try {
            field.setFontSize(fontSize);
          } catch (daError) {
            // Field has no /DA (default appearance) entry - create one
            console.log(`   🔧 Field "${fieldName}" missing /DA entry, creating it...`);
            try {
              const acroField = field.acroField;
              const fieldDict = acroField.dict;

              // Create /DA string: /Font_Name font_size Tf color_r color_g color_b rg
              // The /DA entry already contains the font size
              // Don't call setFontSize() or updateAppearances() - let form.updateFieldAppearances() handle it
              const daString = `/Helv ${fontSize} Tf 0 0 0 rg`;
              fieldDict.set(PDFName.of('DA'), PDFString.of(daString));
              console.log(`   ✅ /DA entry created with font size ${fontSize}`);
            } catch (createError) {
              console.log(`   ⚠️ Failed to create /DA entry: ${createError.message}`);
            }
          }
        }
      } catch (error) {
        // Silently handle missing fields
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
    setFieldText('street_name_optional', user.street_address_optional);  // DB: street_address_optional → PDF: street_name_optional (address label: Home/Work/etc)
    setFieldText('town', user.town);  // DB: town → PDF: town
    setFieldText('postcode', user.postcode);  // DB: postcode → PDF: postcode
    setFieldText('country', user.country);  // DB: country → PDF: country
    setFieldText('driving_license_number', user.driving_license_number);  // DB: driving_license_number → PDF: driving_license_number
    setFieldText('date_of_birth', user.date_of_birth);  // DB: date_of_birth → PDF: date_of_birth

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
    // Parse emergency_contact field (format: "Name | Phone | Email | Relationship")
    if (user.emergency_contact) {
      const parts = user.emergency_contact.split('|').map(p => p.trim());
      setFieldText('emergency_contact_name', parts[0] || '');  // DB: emergency_contact (parsed) → PDF: emergency_contact_name
      setFieldText('emergency_contact_number', parts[1] || '');  // DB: emergency_contact (parsed) → PDF: emergency_contact_number
      // Note: Email (parts[2]) and relationship (parts[3]) exist but PDF only has name & number fields
    }

    // Insurance fields (these already match PDF field names)
    setFieldText('insurance_company', user.insurance_company);
    setFieldText('policy_number', user.policy_number);
    setFieldText('policy_holder', user.policy_holder);
    setFieldText('cover_type', user.cover_type);

    // PDF REVISION 4: Signup date fields on Page 2
    // Note: "time_stamp" field was renamed to "subscription_start_date" in PDF template
    // because it kept reverting to a digital signature field
    if (user.subscription_start_date) {
      const signupDate = new Date(user.subscription_start_date).toLocaleDateString('en-GB');  // DD/MM/YYYY format

      // Both fields show the same signup date
      setFieldText('Date69_af_date', signupDate);  // DB: subscription_start_date → PDF: Date69_af_date
      setFieldText('subscription_start_date', signupDate);  // DB: subscription_start_date → PDF: subscription_start_date (was "time_stamp")
    }

    // ========================================
    // PAGE 3: Personal Documentation (Images)
    // ========================================
    // Image URLs from user_documents table, mapped by dataFetcher using SHORT keys
    // CRITICAL FIX: dataFetcher.js maps to SHORT keys (e.g., 'driving_license', NOT 'driving_license_picture')
    // Mapping examples:
    //   DB document_type: driving_license_picture → imageUrls key: 'driving_license' → PDF field: driving_license_picture
    //   DB document_type: vehicle_front_image → imageUrls key: 'vehicle_front' → PDF field: vehicle_picture_front
    // FIX: Use SHORT keys from dataFetcher.js to match recent refactoring (2025-12-05)
    setFieldTextWithFixedFont('driving_license_picture', data.imageUrls?.driving_license || '', 6);
    setFieldTextWithFixedFont('vehicle_picture_front', data.imageUrls?.vehicle_front || '', 6);
    setFieldTextWithFixedFont('vehicle_picture_driver_side', data.imageUrls?.vehicle_driver_side || '', 6);
    setFieldTextWithFixedFont('vehicle_picture_passenger_side', data.imageUrls?.vehicle_passenger_side || '', 6);
    setFieldTextWithFixedFont('vehicle_picture_back', data.imageUrls?.vehicle_back || '', 6);

    // ========================================
    // PAGE 4: Form Metadata & Safety Assessment
    // ========================================
    setFieldText('id', metadata.create_user_id);  // user_id → id
    setFieldText('form_id', incident.id);
    setFieldText('submit_date', incident.created_at);

    // Immediate Safety Assessment - Map to PDF field names
    // FIX: Changed from 'are_you_safe_and_ready_to_complete_this_form' (deleted column) to 'final_feeling'
    // User's final_feeling response is now used for the safety check
    const finalFeeling = incident.final_feeling ? incident.final_feeling.toLowerCase() : '';
    const isSafe = finalFeeling.includes('safe') ||
                   finalFeeling.includes('good') ||
                   finalFeeling.includes('ok') ||
                   finalFeeling.includes('fine') ||  // FIX: Added "fine" as a positive safety response
                   (user.safety_status && user.safety_status.toLowerCase().includes('safe'));

    // DEBUG: Log the safety check logic
    console.log('\n🔍 DEBUG - Safety Check:');
    console.log('  final_feeling from DB:', incident.final_feeling);
    console.log('  isSafe evaluates to:', isSafe);
    console.log('  Will check final_feeling checkbox:', isSafe ? 'YES ✅' : 'NO ❌');

    // FIX: PDF field is "final_feeling", not "are_you_safe"
    checkField('final_feeling', isSafe);  // DB: incident.final_feeling → PDF: final_feeling (checkbox for "Are you safe and ready to complete this form?")
    setFieldText('emergency_recording_timestamp', user.safety_status_timestamp);  // DB: user.safety_status_timestamp → PDF: emergency_recording_timestamp
    checkField('medical_attention_needed', incident.medical_attention_required === true || incident.medical_attention_required === 'Yes');  // DB: BOOLEAN (or legacy TEXT "Yes")
    setFieldText('medical_how_are_you_feeling', incident.final_feeling);  // DB: final_feeling (from safety-check.html) → PDF: medical_how_are_you_feeling
    setFieldText('medical_attention_from_who', incident.medical_attention_from_who);
    setFieldText('further_medical_attention_needed', incident.medical_further_attention);  // medical_further → further_medical_attention_needed
    checkField('six_point_safety_check_completed', incident.six_point_safety_check_completed === true || incident.six_point_safety_check_completed === 'Yes');  // PDF REVISION 3: six_point_safety_check → six_point_safety_check_completed
    checkField('emergency_contact_made', incident.emergency_contact_made === true || incident.emergency_contact_made === 'Yes');  // DB: BOOLEAN (or legacy TEXT "Yes")

    // PAGE 4: Medical and Injury Assessment
    // IMPORTANT: Use incident.medical_symptom_* columns (not old Typeform columns!)
    // Note: Some PDF fields have typos (sympton, mobilty, life _threatening with SPACE)
    checkField('medical_symptom_chest_pain', incident.medical_symptom_chest_pain);
    checkField('medical_symptom_uncontrolled_bleeding', incident.medical_symptom_uncontrolled_bleeding);
    checkField('medical_symptom_breathlessness', incident.medical_symptom_breathlessness);
    checkField('medical_symptom_limb_weakness', incident.medical_symptom_limb_weakness);
    checkField('medical_symptom_loss_of_consciousness', incident.medical_symptom_loss_of_consciousness);
    checkField('medical_symptom_severe_headache', incident.medical_symptom_severe_headache);
    checkField('medical_symptom_abdominal_bruising', incident.medical_symptom_abdominal_bruising);

    // DEBUG: Log change_in_vision field
    console.log('\n🔍 DEBUG - Change in Vision:');
    console.log('  medical_symptom_change_in_vision from DB:', incident.medical_symptom_change_in_vision);
    console.log('  Type:', typeof incident.medical_symptom_change_in_vision);
    console.log('  Will check medical_symptom_change_in_vision checkbox:', incident.medical_symptom_change_in_vision ? 'YES ✅' : 'NO ❌');

    // FIX: PDF field is "medical_symptom_change_in_vision" (correct spelling, not "sympton")
    checkField('medical_symptom_change_in_vision', incident.medical_symptom_change_in_vision);
    checkField('medical_symptom_abdominal_pain', incident.medical_symptom_abdominal_pain);
    checkField('medical_symptom_limb_pain_mobilty', incident.medical_symptom_limb_pain_mobility);  // PDF has typo: "mobilty"
    checkField('medical_symptom_life _threatening', incident.medical_symptom_life_threatening);  // PDF has typo: "life _threatening" (with SPACE)
    checkField('medical_symptom_dizziness', incident.medical_symptom_dizziness);  // DB: medical_symptom_dizziness → PDF: medical_symptom_dizziness
    checkField('medical_symptom_none', incident.medical_symptom_none);
    setFieldText('medical_injury_details', incident.medical_conditions_summary || incident.medical_injury_details);

    // ========================================
    // PAGE 3: Accident Date/Time/Location
    // Database columns: accident_date, accident_time, location, what3words
    // ========================================
    setFieldText('accident_date', incident.accident_date);
    setFieldText('accident_time', incident.accident_time);
    setFieldText('location', incident.location);
    setFieldText('what3words', incident.what3words);
    setFieldText('nearest_landmark', incident.nearest_landmark);

    // ========================================
    // PAGE 4: Safety Equipment & Medical
    // Database columns: airbags_deployed, seatbelts_worn, seatbelt_reason,
    //                   medical_attention_needed, medical_injury_details,
    //                   medical_injury_severity, medical_hospital_name,
    //                   medical_ambulance_called, medical_treatment_received,
    //                   medical_symptom_*
    // ========================================

    // Safety equipment (handles boolean, string "true"/"yes"/"no", or string "yes")
    // Note: PDF has both "yes" and "no" checkboxes for these fields
    checkField('airbags_deployed', incident.airbags_deployed);
    checkField('airbags_deployed_no', !incident.airbags_deployed);  // Inverse for "no" checkbox

    // Seatbelts: DB uses "yes"/"no" strings, not booleans
    const seatbeltsWorn = incident.seatbelts_worn === 'yes' || incident.seatbelts_worn === true;
    checkField('seatbelt_worn', seatbeltsWorn);  // PDF: seatbelt_worn (singular), DB: seatbelts_worn (plural)
    checkField('seatbelt_worn_no', !seatbeltsWorn);  // Inverse for "no" checkbox
    setFieldTextWithMaxFont('seatbelt_reason', incident.seatbelt_reason, 16);  // Max 16pt font to prevent gigantic text

    // Medical attention
    checkField('medical_attention_needed', incident.medical_attention_needed);
    setFieldText('medical_injury_details', incident.medical_injury_details);
    setFieldText('medical_injury_severity', incident.medical_injury_severity);
    setFieldText('medical_hospital_name', incident.medical_hospital_name);
    checkField('medical_ambulance_called', incident.medical_ambulance_called);
    setFieldText('medical_treatment_received', incident.medical_treatment_received);
    setFieldText('medical_treatment_recieved', incident.medical_treatment_received);  // PDF has typo (i before e)

    // Note: Medical symptoms are mapped earlier in PAGE 4 section (lines 284-299)
    // to handle PDF field name typos correctly

    // ========================================
    // PAGE 5: Environmental Conditions
    // Database columns: weather_*, road_condition_*, road_type_*
    // ========================================

    // Weather conditions (12 checkboxes)
    checkField('weather_bright_sunlight', incident.weather_bright_sunlight);
    checkField('weather_clear', incident.weather_clear);
    checkField('weather_cloudy', incident.weather_cloudy);
    checkField('weather_raining', incident.weather_raining);
    checkField('weather_heavy_rain', incident.weather_heavy_rain);
    checkField('weather_drizzle', incident.weather_drizzle);
    checkField('weather_fog', incident.weather_fog);
    checkField('weather_snow', incident.weather_snow);
    checkField('weather_ice', incident.weather_ice);
    checkField('weather_windy', incident.weather_windy);
    checkField('weather_hail', incident.weather_hail);
    checkField('weather_thunder_lightening', incident.weather_thunder_lightning);  // PDF has typo: "lightening" not "lightning"

    // FIX: Use actual weather_dusk value from database (not auto-calculated)
    console.log('\n🔍 DEBUG - Dusk Field:');
    console.log('  weather_dusk from DB:', incident.weather_dusk);
    console.log('  Type:', typeof incident.weather_dusk);
    console.log('  Will check weather_dusk checkbox:', incident.weather_dusk ? 'YES ✅' : 'NO ❌');

    // WORKAROUND: weather_dusk checkbox has no appearance dictionary in PDF template
    // Standard checkField() sets the value but appearance doesn't render
    // Try setting it multiple times and force appearance update
    checkField('weather_dusk', incident.weather_dusk);  // DB: weather_dusk → PDF: weather_dusk

    // Extra workaround: Manually ensure the field appearance is set
    if (incident.weather_dusk) {
      try {
        const duskCheckbox = form.getCheckBox('weather_dusk');
        duskCheckbox.check();  // Double-check to ensure it's set
        console.log('    🔧 Applied workaround: manually re-checked weather_dusk');
      } catch (e) {
        console.log('    ⚠️ Workaround failed:', e.message);
      }
    }

    // Road surface conditions (6 checkboxes)
    checkField('road_condition_dry', incident.road_condition_dry);
    checkField('road_condition_wet', incident.road_condition_wet);
    checkField('road_condition_icy', incident.road_condition_icy);
    checkField('road_condition_snow_covered', incident.road_condition_snow_covered);
    checkField('road_condition_loose_surface', incident.road_condition_loose_surface);
    checkField('road_condition_slush_on_road', incident.road_condition_slush_on_road);

    // Road type (7 checkboxes)
    // NOTE: PDF field names differ from database column names
    checkField('road_type_motorway', incident.road_type_motorway);
    checkField('road_type_a_road', incident.road_type_a_road);
    checkField('road_type_b_road', incident.road_type_b_road);
    checkField('road_type_urban', incident.road_type_urban_street);  // DB: road_type_urban_street → PDF: road_type_urban
    checkField('road_type_rural', incident.road_type_rural_road);  // DB: road_type_rural_road → PDF: road_type_rural
    checkField('road_type_car_park', incident.road_type_car_park);
    checkField('road_type_private_road', incident.road_type_private_road);

    // ========================================
    // PAGE 6: Traffic, Visibility, Junction, Speed
    // Database columns: speed_limit, your_speed, traffic_conditions_*,
    //                   visibility_*, road_markings_visible_*, junction_type,
    //                   junction_control, traffic_light_status, user_manoeuvre,
    //                   special_condition_*
    // ========================================

    // Speed
    setFieldText('speed_limit', incident.speed_limit ? String(incident.speed_limit) : '');
    setFieldText('your_speed', incident.your_speed ? String(incident.your_speed) : '');

    // Traffic conditions (4 checkboxes)
    checkField('traffic_conditions_heavy', incident.traffic_conditions_heavy);
    checkField('traffic_conditions_moderate', incident.traffic_conditions_moderate);
    checkField('traffic_conditions_light', incident.traffic_conditions_light);
    checkField('traffic_conditions_no_traffic', incident.traffic_conditions_no_traffic);

    // Visibility (4 checkboxes)
    // NOTE: PDF has typos in some field names
    checkField('visibilty_good', incident.visibility_good);  // PDF has typo: "visibilty" not "visibility"
    checkField('visibility_poor', incident.visibility_poor);
    checkField('visibility_very_poor', incident.visibility_very_poor);
    checkField('visibilty_street_lights', incident.visibility_street_lights);  // PDF has typo: "visibilty" not "visibility"

    // Road markings visibility (3 radio buttons)
    // PDF has typo: "vsible" instead of "visible"
    checkField('road_markings_vsible_yes', incident.road_markings_visible_yes);
    checkField('road_markings_vsible_no', incident.road_markings_visible_no);
    checkField('road_markings_visible_partially', incident.road_markings_visible_partially);

    // Junction details
    setFieldText('junction_type', incident.junction_type);
    setFieldText('junction_control', incident.junction_control);
    setFieldText('traffic_light_status', incident.traffic_light_status);
    setFieldText('user_manoeuvre', incident.user_manoeuvre);

    // Visibility detail (5 checkboxes)
    checkField('visibility_clear', incident.visibility_clear);
    checkField('visibility_restricted_structure', incident.visibility_restricted_structure);
    checkField('visibility_restricted_bend', incident.visibility_restricted_bend);
    checkField('visibility_large_vehicle', incident.visibility_large_vehicle);
    checkField('visibility_sun_glare', incident.visibility_sun_glare);

    // Special conditions/hazards (12 checkboxes)
    checkField('special_condition_roadworks', incident.special_condition_roadworks);
    checkField('special_condition_workmen', incident.special_condition_workmen);
    checkField('special_condition_cyclists', incident.special_condition_cyclists);
    checkField('special_condition_pedestrians', incident.special_condition_pedestrians);
    checkField('special_condition_traffic_calming', incident.special_condition_traffic_calming);
    checkField('special_condition_parked_vehicles', incident.special_condition_parked_vehicles);
    checkField('special_condition_crossing', incident.special_condition_crossing);
    checkField('special_condition_school_zone', incident.special_condition_school_zone);
    checkField('special_condition_narrow_road', incident.special_condition_narrow_road);
    checkField('special_condition_potholes', incident.special_condition_potholes);
    checkField('special_condition_oil_spills', incident.special_condition_oil_spills);
    checkField('special_condition_animals', incident.special_condition_animals);

    // Additional hazards text field
    setFieldText('additional_hazards', incident.additional_hazards);

    // ========================================
    // PAGE 7: Your Vehicle Details (DVLA Data)
    // Database columns: usual_vehicle, vehicle_license_plate, dvla_make,
    //                   dvla_model, dvla_colour, dvla_year, dvla_fuel_type,
    //                   dvla_mot_status, dvla_mot_expiry, dvla_tax_status,
    //                   dvla_tax_due_date
    // ========================================

    // PDF REVISION 3: usual_vehicle field structure changed
    // Old: usual_vehicle_yes / usual_vehicle_no
    // New: usual_vehicle (checkbox for yes) / driving_your_usual_vehicle_no (checkbox for no)
    // FIX: Use checkFieldPair to ensure only one checkbox is checked at a time
    checkFieldPair('usual_vehicle', 'driving_your_usual_vehicle_no', incident.usual_vehicle === 'yes');

    // DVLA lookup registration
    setFieldText('vehicle_license_plate', incident.vehicle_license_plate);

    // DVLA vehicle data
    setFieldText('dvla_make', incident.dvla_make);
    setFieldText('dvla_model', incident.dvla_model);
    setFieldText('dvla_colour', incident.dvla_colour);
    setFieldText('dvla_year', incident.dvla_year);
    setFieldText('dvla_fuel_type', incident.dvla_fuel_type);
    setFieldText('dvla_mot_status', incident.dvla_mot_status);
    setFieldText('dvla_mot_expiry', incident.dvla_mot_expiry);
    setFieldText('dvla_tax_status', incident.dvla_tax_status);
    setFieldText('dvla_tax_due_date', incident.dvla_tax_due_date);
    setFieldText('dvla_insurance_status', incident.dvla_insurance_status);

    // Manual vehicle entry (fallback when DVLA lookup fails)
    setFieldText('manual_make', incident.manual_make);
    setFieldText('manual_model', incident.manual_model);
    setFieldText('manual_colour', incident.manual_colour);
    setFieldText('manual_year', incident.manual_year);

    // Impact points (10 checkboxes)
    checkField('impact_point_front', incident.impact_point_front);
    checkField('impact_point_front_driver', incident.impact_point_front_driver);
    checkField('impact_point_front_passenger', incident.impact_point_front_passenger);
    checkField('impact_point_driver_side', incident.impact_point_driver_side);
    checkField('impact_point_passenger_side', incident.impact_point_passenger_side);
    checkField('impact_point_rear_driver', incident.impact_point_rear_driver);
    checkField('impact_point_rear_passenger', incident.impact_point_rear_passenger);
    checkField('impact_point_rear', incident.impact_point_rear);
    checkField('impact_point_roof', incident.impact_point_roof);
    checkField('impact_point_under_carriage', incident.impact_point_undercarriage);  // PDF REVISION 3: impact_point_undercarriage → impact_point_under_carriage (underscore position changed)

    // Damage details (PDF uses hyphens for some fields!)
    checkField('no_damage', incident.no_damage);
    checkField('no-visible-damage', incident.no_visible_damage);
    setFieldText('damage_to_your_vehicle', incident.damage_to_your_vehicle);
    setFieldText('describe-damage-to-vehicle', incident.describe_damage_to_vehicle);
    setFieldText('describle_the_damage', incident.describle_the_damage);  // DB: describle_the_damage (NEW field with typo) → PDF: describle_the_damage

    // PDF REVISION 3: Vehicle driveability field names changed
    // Old: vehicle_driveable_yes / vehicle_driveable_no / vehicle_driveable_unsure
    // New: yes_i_drove_it_away / no_it_needed_to_be_towed / "unsure _did_not_attempt" (with space!)
    checkField('yes_i_drove_it_away', incident.vehicle_driveable === 'yes');  // PDF REVISION 3
    checkField('no_it_needed_to_be_towed', incident.vehicle_driveable === 'no');  // PDF REVISION 3
    checkField('unsure _did_not_attempt', incident.vehicle_driveable === 'unsure');  // PDF REVISION 3 - NOTE: field name has SPACE before "did"

    // ========================================
    // PAGE 8: Other Vehicle Information
    // Database columns: other_vehicle_registration, other_vehicle_look_up_*,
    //                   other_drivers_insurance_*, other_full_name,
    //                   other_contact_number, other_email_address,
    //                   other_driving_license_number
    // ========================================

    // Driver information (PDF uses hyphens, not underscores!)
    setFieldText('other-full-name', incident.other_full_name);
    setFieldText('other-contact-number', incident.other_contact_number);
    setFieldText('other-email-address', incident.other_email_address);
    setFieldText('other-driving-license-number', incident.other_driving_license_number);

    // Vehicle registration and DVLA data (PDF uses hyphens!)
    setFieldText('other-vehicle-registration', incident.other_vehicle_registration);
    setFieldText('other-vehicle-look-up-make', incident.other_vehicle_look_up_make);
    setFieldText('other-vehicle-look-up-model', incident.other_vehicle_look_up_model);
    setFieldText('other-vehicle-look-up-colour', incident.other_vehicle_look_up_colour);
    setFieldText('other-vehicle-look-up-year', incident.other_vehicle_look_up_year);
    setFieldText('other-vehicle-look-up-fuel-type', incident.other_vehicle_look_up_fuel_type);
    setFieldText('other-vehicle-look-up-mot-status', incident.other_vehicle_look_up_mot_status);
    setFieldText('other-vehicle-look-up-mot-expiry-date', incident.other_vehicle_look_up_mot_expiry_date);  // DB: other_vehicle_look_up_mot_expiry_date → PDF: other-vehicle-look-up-mot-expiry-date
    setFieldText('other-vehicle-look-up-tax-status', incident.other_vehicle_look_up_tax_status);
    setFieldText('other-vehicle-look-up-tax-due-date', incident.other_vehicle_look_up_tax_due_date);
    setFieldText('other-vehicle-look-up-insurance-status', incident.other_vehicle_look_up_insurance_status);

    // Insurance information (PDF uses hyphens!)
    setFieldText('other-drivers-insurance-company', incident.other_drivers_insurance_company);
    setFieldText('other-drivers-policy-number', incident.other_drivers_policy_number);
    setFieldText('other-drivers-policy-holder-name', incident.other_drivers_policy_holder_name);
    setFieldText('other-drivers-policy-cover-type', incident.other_drivers_policy_cover_type);

    // PDF REVISION 4: Field restored in new template with max 14pt font requirement
    // User confirmed field exists in new PDF template: /Users/ianring/Ian.ring\ Dropbox/...
    // FIX: Uncommented and set max 14pt font as requested
    if (data.vehicles && data.vehicles[0] && data.vehicles[0].damage_description) {
      setFieldTextWithMaxFont('describe_the_damage_to_the_other_vehicle', data.vehicles[0].damage_description, 14);
    }

    // ========================================
    // PAGE 9: Witnesses
    // Database columns: witnesses_present, witness_name, witness_mobile_number,
    //                   witness_email_address, witness_statement
    // ========================================

    // FIX: Use checkFieldPair to ensure only one checkbox is checked at a time
    // Database stores: witnesses_present = 'yes' or 'no'
    checkFieldPair('witnesses_present', 'witnesses_present_no', incident.witnesses_present === 'yes');

    // Witness 1 (apply 14pt max font size to statement to prevent huge text)
    if (data.witnesses && data.witnesses[0]) {
      const witness1 = data.witnesses[0];
      setFieldText('witness_name', witness1.witness_name || '');
      setFieldText('witness_mobile_number', witness1.witness_mobile_number || '');
      setFieldText('witness_email_address', witness1.witness_email_address || '');
      setFieldTextWithMaxFont('witness_statement', witness1.witness_statement || '', 14);  // Max 14pt font
    }

    // Witness 2 (apply 14pt max font size to statement)
    if (data.witnesses && data.witnesses[1]) {
      const witness2 = data.witnesses[1];
      setFieldText('witness_name_2', witness2.witness_name || '');
      setFieldText('witness_mobile_number_2', witness2.witness_mobile_number || '');
      setFieldText('witness_email_address_2', witness2.witness_email_address || '');
      setFieldTextWithMaxFont('witness_statement_2', witness2.witness_statement || '', 14);  // Max 14pt font
    }

    // ========================================
    // PAGE 10: Police Involvement
    // Database columns: police_attended, police_force, accident_ref_number,
    //                   officer_name, officer_badge, user_breath_test,
    //                   other_breath_test
    // ========================================

    // FIX: Use checkFieldPair to ensure only one checkbox is checked at a time
    // Database stores: police_attended = true/false
    // PDF has yes/no checkbox pair: police_attended (yes) + police_attended_no (no)
    checkFieldPair('police_attended', 'police_attended_no', incident.police_attended);
    setFieldText('police_force', incident.police_force);
    setFieldText('accident_ref_number', incident.accident_ref_number);
    setFieldText('officer_name', incident.officer_name);
    setFieldText('officer_badge', incident.officer_badge);
    setFieldText('user_breath_test', incident.user_breath_test);
    setFieldText('other_breath_test', incident.other_breath_test);

    // ========================================
    // PAGE 12: Final Feeling & Additional Info
    // Database columns: final_feeling, form_completed_at
    // ========================================

    setFieldText('final_feeling', incident.final_feeling);
    setFieldText('form_completed_at', incident.form_completed_at || incident.updated_at || incident.created_at);

    // ========================================
    // PAGES 11-12: Evidence Collection (Images)
    // ========================================
    // All image URLs now come from user_documents table using ACTUAL PDF field names
    // PDF has 18 total image fields - mapped from database document_type values
    // Auto-fit font size based on field dimensions and URL length

    // Audio recording (1 field)
    setUrlFieldWithAutoFitFont('file_url_record_detailed_account_of_what_happened', data.imageUrls?.file_url_record_detailed_account_of_what_happened || '');

    // Scene images (3 fields) - includes location screenshot
    // FIX: Use ACTUAL PDF field names (not scene_images_path_*)

    // DEBUG: Check what3words/location_map_screenshot mapping
    console.log('\n🔍 DEBUG - What3Words URL Mapping:');
    console.log('  imageUrls object keys:', Object.keys(data.imageUrls || {}));
    console.log('  imageUrls.what3words:', data.imageUrls?.what3words || '[UNDEFINED]');
    console.log('  imageUrls.location_map_screenshot:', data.imageUrls?.location_map_screenshot || '[UNDEFINED]');

    // FIX: Use correct key name from dataFetcher (what3words, not location_map_screenshot)
    setUrlFieldWithAutoFitFont('location_map_screenshot', data.imageUrls?.what3words || '');  // PDF field: location_map_screenshot ← reads from imageUrls.what3words
    setUrlFieldWithAutoFitFont('scene_photo_1_url', data.imageUrls?.scene_photo_1_url || '');  // scene_overview
    setUrlFieldWithAutoFitFont('scene_photo_2_url', data.imageUrls?.scene_photo_2_url || '');  // scene_overview_2
    setUrlFieldWithAutoFitFont('scene_photo_3_url', data.imageUrls?.scene_photo_3_url || '');  // scene_overview_3

    // Other vehicle photos (5 fields)
    // FIX: Add _url suffix to match actual PDF field names
    setUrlFieldWithAutoFitFont('other_vehicle_photo_1_url', data.imageUrls?.other_vehicle_photo_1_url || '');
    setUrlFieldWithAutoFitFont('other_vehicle_photo_2_url', data.imageUrls?.other_vehicle_photo_2_url || '');
    setUrlFieldWithAutoFitFont('other_vehicle_photo_3_url', data.imageUrls?.other_vehicle_photo_3_url || '');
    setUrlFieldWithAutoFitFont('other_vehicle_photo_4_url', data.imageUrls?.other_vehicle_photo_4_url || '');
    setUrlFieldWithAutoFitFont('other_vehicle_photo_5_url', data.imageUrls?.other_vehicle_photo_5_url || '');

    // Vehicle damage photos (5 fields)
    // FIX: Use vehicle_damage_photo_N_url (not vehicle_damage_path_N)
    setUrlFieldWithAutoFitFont('vehicle_damage_photo_1_url', data.imageUrls?.vehicle_damage_photo_1_url || '');
    setUrlFieldWithAutoFitFont('vehicle_damage_photo_2_url', data.imageUrls?.vehicle_damage_photo_2_url || '');
    setUrlFieldWithAutoFitFont('vehicle_damage_photo_3_url', data.imageUrls?.vehicle_damage_photo_3_url || '');
    setUrlFieldWithAutoFitFont('vehicle_damage_photo_4_url', data.imageUrls?.vehicle_damage_photo_4_url || '');
    setUrlFieldWithAutoFitFont('vehicle_damage_photo_5_url', data.imageUrls?.vehicle_damage_photo_5_url || '');

    // ========================================
    // PAGES 13-16: AI Analysis Fields (GPT-4o Generated Content)
    // ========================================
    // Migration 028 added these 6 fields directly to incident_reports table
    // AI analysis fields are now in incident object, not separate table

    console.log('\n🤖 Mapping AI Analysis Fields (Pages 13-16):');

    // Page 13 - Voice Transcription
    setFieldText('voice_transcription', incident.voice_transcription || '');
    console.log(`   ✅ voice_transcription: ${incident.voice_transcription ? incident.voice_transcription.length + ' chars' : 'No data'}`);

    // Page 13 - Analysis Metadata (compact format for small text box)
    const aiMetadata = incident.analysis_metadata || {};
    const aiMetadataText = aiMetadata.model && aiMetadata.timestamp
      ? `Model: ${aiMetadata.model} | Generated: ${new Date(aiMetadata.timestamp).toLocaleString('en-GB')}${aiMetadata.version ? ` | v${aiMetadata.version}` : ''}`
      : '';
    setFieldText('analysis_metadata', aiMetadataText);
    console.log(`   ✅ analysis_metadata: ${aiMetadataText || 'No data'}`);

    // Page 13 - Quality Review
    setFieldText('quality_review', incident.quality_review || '');
    console.log(`   ✅ quality_review: ${incident.quality_review ? incident.quality_review.length + ' chars' : 'No data'}`);

    // Page 14 - AI Summary
    setFieldText('ai_summary', incident.ai_summary || '');
    console.log(`   ✅ ai_summary: ${incident.ai_summary ? incident.ai_summary.length + ' chars' : 'No data'}`);

    // Page 15 - Closing Statement
    setFieldText('closing_statement', incident.closing_statement || '');
    console.log(`   ✅ closing_statement: ${incident.closing_statement ? incident.closing_statement.length + ' chars' : 'No data'}`);

    // Page 16 - Final Review
    setFieldText('final_review', incident.final_review || '');
    console.log(`   ✅ final_review: ${incident.final_review ? incident.final_review.length + ' chars' : 'No data'}`);

    console.log('✅ All 6 AI analysis fields mapped from incident_reports table');

    // ========================================
    // PAGE 17: Legal Documentation and Declaration
    // ========================================
    setFieldText('Signature70', `${user.name || ''} ${user.surname || ''}`.trim());
    setFieldText('Date69_af_date', new Date().toLocaleDateString('en-GB'));

    // ========================================
    // PAGE 18: AI Eavesdropper (Emergency Audio Recording)
    // ========================================
    // Emergency audio transcription from AI Eavesdropper feature (incident.html)
    // Data source: ai_listening_transcripts table → data.emergencyAudio
    // LEGAL REQUIREMENT: TEXT ONLY - No URLs allowed in legal document
    const emergencyTranscription = data.emergencyAudio?.transcription_text || '';
    const emergencyTimestamp = data.emergencyAudio?.recorded_at || '';
    const emergencyDuration = data.emergencyAudio?.duration_seconds || null;

    // Add transcription text with disclaimer
    let emergencyContent = '';
    if (emergencyTranscription) {
      emergencyContent = emergencyTranscription + '\n\n';

      // Add metadata footer
      emergencyContent += '─'.repeat(60) + '\n';
      emergencyContent += 'RECORDING INFORMATION:\n';
      if (emergencyTimestamp) {
        emergencyContent += `Recorded: ${new Date(emergencyTimestamp).toLocaleString('en-GB', {
          dateStyle: 'full',
          timeStyle: 'long',
          timeZone: 'Europe/London'
        })}\n`;
      }
      if (emergencyDuration) {
        const minutes = Math.floor(emergencyDuration / 60);
        const seconds = emergencyDuration % 60;
        emergencyContent += `Duration: ${minutes}m ${seconds}s\n`;
      }
      emergencyContent += '\nNote: This is an AI-generated transcription of emergency audio recorded during the incident. ' +
                         'Transcription accuracy may vary depending on audio quality and background noise.';
    }

    setFieldText('emergency_audio_transcription', emergencyContent.trim());
    setFieldText('emergency_recording_timestamp', emergencyTimestamp);

    console.log(`   ✅ Page 18 (Emergency Audio Transcription): ${emergencyTranscription ? emergencyTranscription.length + ' chars' : 'No data'}`);

    console.log('✅ All form fields mapped with corrected database column names');
    logger.info('✅ PDF form fields populated across all pages (1-18)');
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
        // NOTE: driver_email column doesn't exist in incident_other_vehicles table
        this.setFieldValue(form, 'Additional Driver email:', '');
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
   * CRITICAL FIX (Nov 2025): Adobe PDF Services compression DISABLED
   *
   * Root cause: Adobe compression corrupts XRef table when compressing PDFs
   * that were created by merging form-filled PDFs with Puppeteer-generated pages.
   *
   * Evidence:
   * - Uncompressed PDF: 0 XRef errors, pages 13-19 visible (2985 KB)
   * - Compressed PDF (MEDIUM): 8 XRef errors, pages 13-19 blank (1111 KB)
   *
   * The compression algorithm corrupts object references (entries 2195, 2196,
   * 2176, 2182, 2185, 2187, 2191, 2192) preventing pages from rendering.
   *
   * Solution: Return uncompressed PDF. File size impact: ~2.9MB vs ~1.1MB
   * This is acceptable tradeoff for working pages 13-19.
   *
   * Test: test-form-filling-no-compression.js
   *
   * @param {Buffer} pdfBuffer - The filled PDF buffer
   * @param {String} compressionLevel - 'LOW', 'MEDIUM', or 'HIGH' (IGNORED)
   * @returns {Promise<Buffer>} - Original uncompressed PDF buffer
   */
  async compressPdf(pdfBuffer, compressionLevel = 'MEDIUM') {
    // PERMANENTLY DISABLED - Adobe compression corrupts XRef table
    logger.info('⚠️ PDF compression disabled (prevents XRef corruption)');
    logger.info('   Returning uncompressed PDF to ensure pages 13-19 render correctly');
    return pdfBuffer;
  }
}

// Export singleton instance
module.exports = new AdobePdfFormFillerService();
