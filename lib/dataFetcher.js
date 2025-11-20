// lib/dataFetcher.js
const { createClient } = require('@supabase/supabase-js');

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
async function fetchAllData(createUserId) {
  try {
    console.log(`📊 Fetching data for user: ${createUserId}`);

    // Fetch user signup data
    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', createUserId)
      .single();

    if (userError) throw new Error(`User data error: ${userError.message}`);

    // Fetch incident reports (excluding soft-deleted)
    // Check all three user ID columns: auth_user_id, create_user_id, user_id
    const { data: incidentData, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .or(`auth_user_id.eq.${createUserId},create_user_id.eq.${createUserId},user_id.eq.${createUserId}`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

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

    // Extract witness data from incident_reports (stored as columns, not separate table)
    let witnessesData = [];
    if (incidentData && incidentData.length > 0) {
      const incident = incidentData[0];

      // Check if witnesses are present
      if (incident.witnesses_present === 'yes' || incident.witnesses_present === true) {
        // Witness 1 (primary witness)
        if (incident.witness_name) {
          witnessesData.push({
            witness_number: 1,
            witness_name: incident.witness_name,
            witness_mobile_number: incident.witness_mobile_number,
            witness_email_address: incident.witness_email_address,
            witness_statement: incident.witness_statement
          });
        }

        // Witness 2 (if exists)
        if (incident.witness_name_2) {
          witnessesData.push({
            witness_number: 2,
            witness_name: incident.witness_name_2,
            witness_mobile_number: incident.witness_mobile_number_2,
            witness_email_address: incident.witness_email_address_2,
            witness_statement: incident.witness_statement_2
          });
        }

        // Witness 3 (if exists)
        if (incident.witness_name_3) {
          witnessesData.push({
            witness_number: 3,
            witness_name: incident.witness_name_3,
            witness_mobile_number: incident.witness_mobile_number_3,
            witness_email_address: incident.witness_email_address_3,
            witness_statement: incident.witness_statement_3
          });
        }
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
    // Fetch AI transcription data for PDF Page 13 (User's Direct Statement)
    let aiTranscriptionData = null;
    let aiSummaryData = null;

    const { data: transcription, error: transcriptionError } = await supabase
      .from('ai_transcription')
      .select('*')
      .eq('create_user_id', createUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!transcriptionError && transcription) {
      aiTranscriptionData = {
        id: transcription.id,
        // Map all transcript field variants to a single 'transcription' field
        transcription: transcription.transcript_text ||
                       transcription.transcription_text ||
                       transcription.voice_transcription ||
                       transcription.narrative_text ||
                       '',
        model: transcription.model,
        created_at: transcription.created_at
      };

      // Check if ai_summary exists in the transcription record
      if (transcription.ai_summary) {
        aiSummaryData = {
          summary: transcription.ai_summary,
          created_at: transcription.created_at
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
    // IMAGE URL MAPPING - DATABASE → PDF
    // ========================================
    // Map database document_type values to ACTUAL PDF field names
    // PDF field names discovered by reading the PDF template with pdf-lib
    const documentTypeToPdfKey = {
      // PAGE 3: Personal Documentation (5 fields)
      'driving_license_picture': 'driving_license_picture',
      'driving_license_image': 'driving_license_picture',
      'driving_license': 'driving_license_picture',

      'vehicle_front_image': 'vehicle_picture_front',
      'vehicle_front': 'vehicle_picture_front',

      'vehicle_driver_side_image': 'vehicle_picture_driver_side',
      'vehicle_driver_side': 'vehicle_picture_driver_side',

      'vehicle_passenger_side_image': 'vehicle_picture_passenger_side',
      'vehicle_passenger_side': 'vehicle_picture_passenger_side',

      'vehicle_back_image': 'vehicle_picture_back',
      'vehicle_back': 'vehicle_picture_back',

      // PAGES 11-12: Evidence Collection (13 fields)

      // Location screenshot (what3words) - CORRECTED field name
      'location_map_screenshot': 'location_map_screenshot',
      'what3words_screenshot': 'location_map_screenshot',
      'location_screenshot': 'location_map_screenshot',

      // Scene overview images - CORRECTED field names
      'scene_overview': 'scene_photo_1_url',
      'scene_overview_1': 'scene_photo_1_url',
      'scene_overview_2': 'scene_photo_2_url',
      'scene_overview_3': 'scene_photo_3_url',

      // Other vehicle photos - CORRECTED field names
      'other_vehicle': 'other_vehicle_photo_1_url',
      'other_vehicle_1': 'other_vehicle_photo_1_url',
      'other_vehicle_2': 'other_vehicle_photo_2_url',
      'other_vehicle_3': 'other_vehicle_photo_3_url',

      // Vehicle damage images - CORRECTED field names (only 4 fields exist)
      'vehicle_damage': 'vehicle_damage_photo_1_url',
      'vehicle_damage_1': 'vehicle_damage_photo_1_url',
      'vehicle_damage_2': 'vehicle_damage_photo_2_url',
      'vehicle_damage_3': 'vehicle_damage_photo_3_url',
      'vehicle_damage_4': 'vehicle_damage_photo_4_url',

      // Documents - No dedicated PDF field (use spare scene images)
      'document': 'scene_images_path_3',
      'document_1': 'scene_images_path_3',
      'document_2': 'scene_images_path_3',

      // Audio recording
      'audio_account': 'file_url_record_detailed_account_of_what_happened',
      'audio_recording': 'file_url_record_detailed_account_of_what_happened'
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
            const pdfKey = getPdfKeyForDocument(type, index, documentTypeToPdfKey);
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
                const pdfKey = getPdfKeyForDocument(type, index, documentTypeToPdfKey);
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
      const incidentImageMapping = {
        // Audio recording
        'audio_recording_url': 'file_url_record_detailed_account_of_what_happened',

        // Scene photos (may overlap with user_documents location_map_screenshot)
        'scene_photo_1_url': 'scene_images_path_1',
        'scene_photo_2_url': 'scene_images_path_2',
        'scene_photo_3_url': 'scene_images_path_3',

        // Other vehicle photos
        'other_vehicle_photo_1_url': 'other_vehicle_photo_1',
        'other_vehicle_photo_2_url': 'other_vehicle_photo_2',
        'other_vehicle_photo_3_url': 'other_vehicle_photo_3',

        // Vehicle damage photos
        'vehicle_damage_photo_1_url': 'vehicle_damage_path_1',
        'vehicle_damage_photo_2_url': 'vehicle_damage_path_2',
        'vehicle_damage_photo_3_url': 'vehicle_damage_path_3',
        'vehicle_damage_photo_4_url': 'vehicle_damage_path_4',
        'vehicle_damage_photo_5_url': 'vehicle_damage_path_5',
        'vehicle_damage_photo_6_url': 'vehicle_damage_path_6'
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
      dvla: dvlaData || [],
      witnesses: witnessesData,
      vehicles: vehiclesData,
      emergencyAudio: emergencyAudioData, // Page 18: Emergency audio transcription (AI Eavesdropper) - TEXT ONLY, NO URLs
      aiTranscription: aiTranscriptionData, // Page 13: User's direct statement
      aiSummary: aiSummaryData, // Legacy: AI summary (deprecated - use aiAnalysis instead)
      aiAnalysis: aiAnalysisData, // Pages 14-15: Comprehensive AI analysis (combined_report, key_points, nextSteps)
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
        has_ai_analysis: !!aiAnalysisData  // NEW: Indicates full AI analysis available
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