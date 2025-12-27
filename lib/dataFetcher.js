// lib/dataFetcher.js
const { createClient } = require('@supabase/supabase-js');
const logger = require('../src/utils/logger');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

/**
 * Fetch all data needed for PDF generation
 * @param {string} createUserId - The UUID from Typeform
 * @returns {object} All collected data from various tables
 */
async function fetchAllData(createUserId, options = {}) {
  try {
    console.log(`📊 Fetching data for user: ${createUserId}`);
    const { incidentId } = options || {};

    // Fetch user signup data
    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', createUserId)
      .single();

    if (userError) throw new Error(`User data error: ${userError.message}`);

    // Fetch incident reports (excluding soft-deleted)
    // Check all three user ID columns: auth_user_id, create_user_id, user_id
    let incidentData = [];
    let incidentError = null;

    if (incidentId) {
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('id', incidentId)
        .or(`auth_user_id.eq.${createUserId},create_user_id.eq.${createUserId},user_id.eq.${createUserId}`)
        .is('deleted_at', null)
        .limit(1);

      incidentData = data || [];
      incidentError = error;

      if (!incidentData.length) {
        logger.warn('No incident found for requested incidentId; falling back to most recent', {
          createUserId,
          incidentId
        });
      }
    }

    if (!incidentData.length) {
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .or(`auth_user_id.eq.${createUserId},create_user_id.eq.${createUserId},user_id.eq.${createUserId}`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      incidentData = data || [];
      incidentError = error;
    }

    // Fetch DVLA vehicle info
    const { data: dvlaData, error: dvlaError } = await supabase
      .from('dvla_vehicle_info_new')
      .select('*')
      .eq('create_user_id', createUserId);

    // Fetch incident images (legacy table)
    const { data: imagesData, error: imagesError } = await supabase
      .from('incident_images')
      .select('*')
      .eq('create_user_id', createUserId)
      .is('deletion_completed', null);

    // Organize images by type
    const imagesByType = {};
    if (imagesData) {
      imagesData.forEach(img => {
        imagesByType[img.image_type] = img;
      });
    }

    // Fetch user documents (NEW: includes images from Typeform/signup)
    const { data: userDocumentsData, error: userDocsError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', createUserId)
      .eq('status', 'completed')
      .is('deleted_at', null);

    // Organize user documents by type (ARRAY to support multiple photos of same type)
    const userDocumentsByType = {};
    if (userDocumentsData) {
      userDocumentsData.forEach(doc => {
        const type = doc.document_type;
        if (!userDocumentsByType[type]) {
          userDocumentsByType[type] = [];
        }
        userDocumentsByType[type].push(doc);
      });
    }

    // Fetch witness data from incident_witnesses table (normalized schema)
    let witnessesData = [];
    if (incidentData && incidentData.length > 0) {
      const latestIncidentId = incidentData[0].id;
      const { data: witnesses, error: witnessesError } = await supabase
        .from('incident_witnesses')
        .select('*')
        .eq('incident_report_id', latestIncidentId)
        .order('witness_number', { ascending: true });

      if (witnessesError) {
        logger.error('Error fetching witnesses:', witnessesError);
      } else if (witnesses && witnesses.length > 0) {
        // Pass through DB column names directly - adobePdfFormFillerService.js expects original names
        witnessesData = witnesses.map(witness => ({
          witness_number: witness.witness_number,
          witness_name: witness.witness_name,
          witness_mobile_number: witness.witness_mobile_number,  // Keep original DB column name
          witness_email_address: witness.witness_email_address,  // Keep original DB column name
          witness_statement: witness.witness_statement
        }));
      }
    }

    // Fetch other vehicles (if there's an incident)
    let vehiclesData = [];
    if (incidentData && incidentData.length > 0) {
      const latestIncidentId = incidentData[0].id;
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('incident_other_vehicles')
        .select('*')
        .eq('incident_id', latestIncidentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (!vehiclesError && vehicles) {
        vehiclesData = vehicles;
      }
    }

    // Fetch emergency audio recording (AI Eavesdropper) - Page 18
    // LEGAL REQUIREMENT: NO URLs - transcription text only for legal document
    let emergencyAudioData = null;
    if (incidentData && incidentData.length > 0) {
      const latestIncidentId = incidentData[0].id;
      const { data: emergencyAudio, error: audioError } = await supabase
        .from('ai_listening_transcripts')
        .select('*')
        .eq('incident_id', latestIncidentId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (!audioError && emergencyAudio) {
        // ❌ REMOVED: URL generation for audio file (violates "no URLs" legal requirement)
        // Page 18 must contain ONLY transcription text for legal purposes
        if (!emergencyAudio.transcription_text) {
          console.warn('⚠️  Emergency audio has no transcription text (Page 18 will be incomplete)', {
            userId: createUserId,
            audioId: emergencyAudio.id
          });
        }

        emergencyAudioData = {
          id: emergencyAudio.id,
          incident_id: emergencyAudio.incident_id,
          transcription_text: emergencyAudio.transcription_text || '',
          recorded_at: emergencyAudio.recorded_at,
          duration_seconds: emergencyAudio.duration_seconds || null,
          created_at: emergencyAudio.created_at
          // ❌ REMOVED: audio_url - violates "no URLs" legal requirement for Page 18
        };
      }
    }

    // ========================================
    // AI TRANSCRIPTION & SUMMARY (Page 13)
    // ========================================
    // CRITICAL FIX: AI fields are stored in incident_reports table (voice_transcription, ai_summary)
    // DO NOT fetch from separate ai_transcription table - it's not linked by incident_id
    // and may return OLD data from previous incidents for the same user
    let aiTranscriptionData = null;
    let aiSummaryData = null;

    // Use AI fields from the LATEST incident_reports record (already fetched above)
    if (incidentData && incidentData.length > 0) {
      const latestIncident = incidentData[0];

      if (latestIncident.voice_transcription) {
        aiTranscriptionData = {
          id: latestIncident.id,
          transcription: latestIncident.voice_transcription,
          model: latestIncident.form_data_summary_metadata?.model || 'gpt-4o',
          created_at: latestIncident.created_at
        };
      }

      if (latestIncident.ai_summary) {
        aiSummaryData = {
          summary: latestIncident.ai_summary,
          created_at: latestIncident.created_at
        };
      }
    }

    // ========================================
    // AI ANALYSIS (Pages 13-16) - GPT-4o Generated Content
    // ========================================
    // AI analysis fields are now stored directly in incident_reports table:
    // - Page 13: voice_transcription, analysis_metadata, quality_review
    // - Page 14: ai_summary
    // - Page 15: closing_statement
    // - Page 16: final_review
    // These fields are already included in incidentData fetched above

    // ========================================
    // IMAGE URL MAPPING - DATABASE → imageUrls OBJECT
    // ========================================
    // Map database document_type values to imageUrls keys (NOT PDF field names)
    // PDF generators (pdf.controller.js, adobePdfFormFillerService.js) expect these SHORT keys
    const documentTypeToImageUrlKey = {
      // PAGE 3: Personal Documentation (5 fields)
      'driving_license_picture': 'driving_license',
      'driving_license_image': 'driving_license',
      'driving_license': 'driving_license',

      'vehicle_front_image': 'vehicle_front',
      'vehicle_front': 'vehicle_front',

      'vehicle_driver_side_image': 'vehicle_driver_side',
      'vehicle_driver_side': 'vehicle_driver_side',

      'vehicle_passenger_side_image': 'vehicle_passenger_side',
      'vehicle_passenger_side': 'vehicle_passenger_side',

      'vehicle_back_image': 'vehicle_back',
      'vehicle_back': 'vehicle_back',

      // PAGES 11-12: Evidence Collection

      // Location screenshot (what3words)
      'location_map_screenshot': 'what3words',
      'what3words_screenshot': 'what3words',
      'location_screenshot': 'what3words',

      // Scene overview images - map to PDF field names
      // PDF expects: scene_photo_1_url, scene_photo_2_url, scene_photo_3_url
      'scene_overview': 'scene_photo_1_url',
      'scene_overview_1': 'scene_photo_1_url',
      'scene_overview_2': 'scene_photo_2_url',
      'scene_overview_3': 'scene_photo_3_url',

      // Scene photos (NEW naming from incident forms)
      // Note: scene_photo uses multiPhotoTypes logic (getPdfKeyForDocument)
      'scene_photo': 'scene_photo',

      // Other vehicle photos (legacy naming)
      'other_vehicle': 'other_vehicle',
      'other_vehicle_1': 'other_vehicle',
      'other_vehicle_2': 'other_vehicle_2',
      'other_vehicle_3': 'other_vehicle_3',

      // Other vehicle photos (NEW naming from incident forms)
      // Note: other_vehicle_photo uses multiPhotoTypes logic (getPdfKeyForDocument)
      'other_vehicle_photo': 'other_vehicle_photo',

      // Vehicle damage images (legacy naming)
      'vehicle_damage': 'vehicle_damage',
      'vehicle_damage_1': 'vehicle_damage',
      'vehicle_damage_2': 'vehicle_damage_2',
      'vehicle_damage_3': 'vehicle_damage_3',
      'vehicle_damage_4': 'vehicle_damage_4',

      // Vehicle damage photos (NEW naming from incident forms)
      // Note: vehicle_damage_photo uses multiPhotoTypes logic (getPdfKeyForDocument)
      'vehicle_damage_photo': 'vehicle_damage_photo',

      // Documents
      'document': 'document',
      'document_1': 'document',
      'document_2': 'document_2',

      // Audio recording (use audio_account naming for consistency)
      'audio_account': 'audio_account',
      'audio_recording': 'audio_account'  // Legacy support, map to audio_account
    };

    // Helper function to map document type + index to PDF field name
    const getPdfKeyForDocument = (documentType, index, mappingDict) => {
      // For photo types that support multiple files, add numbered suffix
      const multiPhotoTypes = {
        'vehicle_damage_photo': 'vehicle_damage_photo_{N}_url',
        'other_vehicle_photo': 'other_vehicle_photo_{N}_url',
        'scene_photo': 'scene_photo_{N}_url'
      };

      if (multiPhotoTypes[documentType]) {
        // Replace {N} with 1-indexed number
        const photoNumber = index + 1;
        return multiPhotoTypes[documentType].replace('{N}', photoNumber);
      }

      // For single-file types, use the mapping dictionary
      return mappingDict[documentType] || documentType;
    };

    // Get signed URLs for images from user_documents table (NEW)
    // These are pre-generated during upload and valid for 24 hours
    const signedUrls = {};
    for (const [type, docs] of Object.entries(userDocumentsByType)) {
      // docs is now an ARRAY of documents with the same type
      const docsArray = Array.isArray(docs) ? docs : [docs];

      for (let index = 0; index < docsArray.length; index++) {
        const doc = docsArray[index];

        // Check if signed URL exists and hasn't expired
        if (doc.signed_url) {
          const expiresAt = doc.signed_url_expires_at ? new Date(doc.signed_url_expires_at) : null;
          const now = new Date();

          if (!expiresAt || expiresAt > now) {
            // URL is valid, use it directly
            // Map database type to PDF-expected key with numbering
            const pdfKey = getPdfKeyForDocument(type, index, documentTypeToImageUrlKey);
            signedUrls[pdfKey] = doc.signed_url;
            console.log(`✅ Mapped image: ${type}[${index}] → ${pdfKey}`);
          } else {
            // URL expired, generate a fresh one
            console.log(`⚠️  Signed URL expired for ${type}[${index}], generating fresh URL`);
            if (doc.storage_path) {
              const bucket = 'user-documents';
              let path = doc.storage_path;
              if (path.startsWith('user-documents/')) {
                path = path.replace('user-documents/', '');
              }

              const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(path, 31536000); // 365 days (12 months) for on-demand generation

              if (data && !error) {
                // Map database type to PDF-expected key with numbering
                const pdfKey = getPdfKeyForDocument(type, index, documentTypeToImageUrlKey);
                signedUrls[pdfKey] = data.signedUrl;
                console.log(`✅ Mapped image (refreshed): ${type}[${index}] → ${pdfKey}`);
              }
            }
          }
        }
      }
    }

    // Fallback: Get signed URLs for legacy incident_images table
    for (const [type, image] of Object.entries(imagesByType)) {
      // Only generate if not already present from user_documents
      if (!signedUrls[type] && image.file_name) {
        const { data, error } = await supabase.storage
          .from('incident-images-secure')
          .createSignedUrl(image.file_name, 31536000); // 365 days (12 months)

        if (data && !error) {
          signedUrls[type] = data.signedUrl;
        }
      }
    }

    // ========================================
    // INCIDENT REPORT IMAGES (Pages 11-12)
    // ========================================
    // Pull 13 image URLs directly from incident_reports table
    // These are evidence collection images uploaded during incident reporting
    if (incidentData && incidentData.length > 0) {
      const incident = incidentData[0];

      // Map incident_reports columns to PDF field names
      // IMPORTANT: These must match the keys adobePdfFormFillerService.js expects
      const incidentImageMapping = {
        // Audio recording
        'audio_recording_url': 'file_url_record_detailed_account_of_what_happened',

        // Scene photos - use numbered format matching PDF fields
        'scene_photo_1_url': 'scene_photo_1_url',
        'scene_photo_2_url': 'scene_photo_2_url',
        'scene_photo_3_url': 'scene_photo_3_url',

        // Other vehicle photos - use numbered format matching PDF fields
        'other_vehicle_photo_1_url': 'other_vehicle_photo_1_url',
        'other_vehicle_photo_2_url': 'other_vehicle_photo_2_url',
        'other_vehicle_photo_3_url': 'other_vehicle_photo_3_url',

        // Vehicle damage photos - use numbered format matching PDF fields
        'vehicle_damage_photo_1_url': 'vehicle_damage_photo_1_url',
        'vehicle_damage_photo_2_url': 'vehicle_damage_photo_2_url',
        'vehicle_damage_photo_3_url': 'vehicle_damage_photo_3_url',
        'vehicle_damage_photo_4_url': 'vehicle_damage_photo_4_url',
        'vehicle_damage_photo_5_url': 'vehicle_damage_photo_5_url',
        'vehicle_damage_photo_6_url': 'vehicle_damage_photo_6_url'
      };

      // Add incident images to signedUrls (prefer user_documents if already present)
      for (const [dbColumn, pdfField] of Object.entries(incidentImageMapping)) {
        if (incident[dbColumn]) {
          // Don't overwrite user_documents images (signup images take priority)
          // Exception: scene_photo_1 can add to scene_images_path_1 if location screenshot didn't fill it
          if (!signedUrls[pdfField]) {
            signedUrls[pdfField] = incident[dbColumn];
            console.log(`✅ Mapped incident image: ${dbColumn} → ${pdfField}`);
          } else {
            console.log(`⚠️  Skipped ${dbColumn} → ${pdfField} (already populated from user_documents)`);
          }
        }
      }
    }

    // Compile all data
    const allData = {
      user: userData || {},
      incidents: incidentData || [],
      currentIncident: incidentData && incidentData.length > 0 ? incidentData[0] : {},
      incident: incidentData && incidentData.length > 0 ? incidentData[0] : {}, // CRITICAL: Alias for backward compatibility with prepareFormDataForRestAPI
      dvla: dvlaData || [],
      witnesses: witnessesData,
      vehicles: vehiclesData,
      emergencyAudio: emergencyAudioData, // Page 18: Emergency audio transcription (AI Eavesdropper) - TEXT ONLY, NO URLs
      aiTranscription: aiTranscriptionData, // Page 13: User's direct statement
      aiSummary: aiSummaryData, // Legacy: AI summary (deprecated - use aiAnalysis instead)
      // AI analysis fields (Pages 13-16) are now in incidentData directly
      images: imagesByType,
      userDocuments: userDocumentsByType,
      imageUrls: signedUrls,
      metadata: {
        create_user_id: createUserId,
        generated_at: new Date().toISOString(),
        total_incidents: incidentData ? incidentData.length : 0,
        total_images: imagesData ? imagesData.length : 0,
        total_user_documents: userDocumentsData ? userDocumentsData.length : 0,
        total_witnesses: witnessesData.length,
        total_vehicles: vehiclesData.length,
        has_emergency_audio: !!emergencyAudioData,
        has_ai_transcription: !!aiTranscriptionData,
        has_ai_summary: !!aiSummaryData,
        has_ai_analysis: !!(incidentData && incidentData.length > 0 && incidentData[0].ai_summary)  // Check if AI analysis fields populated in incident
      }
    };

    console.log(`✅ Data fetched successfully: ${allData.metadata.total_incidents} incidents, ${allData.metadata.total_images} legacy images, ${allData.metadata.total_user_documents} user documents, ${allData.metadata.total_witnesses} witnesses, ${allData.metadata.total_vehicles} vehicles, AI transcription: ${allData.metadata.has_ai_transcription ? 'YES' : 'NO'}, AI analysis: ${allData.metadata.has_ai_analysis ? 'YES' : 'NO'}`);

    return allData;

  } catch (error) {
    console.error('❌ Error fetching data:', error);
    throw error;
  }
}

module.exports = { fetchAllData };
