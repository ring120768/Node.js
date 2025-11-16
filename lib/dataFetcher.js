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

    // Organize user documents by type
    const userDocumentsByType = {};
    if (userDocumentsData) {
      userDocumentsData.forEach(doc => {
        userDocumentsByType[doc.document_type] = doc;
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

    // Fetch emergency audio recording (AI Eavesdropper)
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
        // Generate fresh signed URL for audio file if storage path exists
        if (emergencyAudio.audio_storage_path) {
          const { data: signedData, error: signedError } = await supabase.storage
            .from('incident-audio')
            .createSignedUrl(emergencyAudio.audio_storage_path, 31536000); // 365 days

          if (signedData && !signedError) {
            emergencyAudio.audio_url = signedData.signedUrl;
          }
        }
        emergencyAudioData = emergencyAudio;
      }
    }

    // Get signed URLs for images from user_documents table (NEW)
    // These are pre-generated during upload and valid for 24 hours
    const signedUrls = {};
    for (const [type, doc] of Object.entries(userDocumentsByType)) {
      // Check if signed URL exists and hasn't expired
      if (doc.signed_url) {
        const expiresAt = doc.signed_url_expires_at ? new Date(doc.signed_url_expires_at) : null;
        const now = new Date();

        if (!expiresAt || expiresAt > now) {
          // URL is valid, use it directly
          signedUrls[type] = doc.signed_url;
        } else {
          // URL expired, generate a fresh one
          console.log(`⚠️  Signed URL expired for ${type}, generating fresh URL`);
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
              signedUrls[type] = data.signedUrl;
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

    // Compile all data
    const allData = {
      user: userData || {},
      incidents: incidentData || [],
      currentIncident: incidentData && incidentData.length > 0 ? incidentData[0] : {},
      dvla: dvlaData || [],
      witnesses: witnessesData,
      vehicles: vehiclesData,
      emergencyAudio: emergencyAudioData, // NEW: Emergency audio recording (AI Eavesdropper)
      images: imagesByType,
      userDocuments: userDocumentsByType, // NEW: Include user_documents data
      imageUrls: signedUrls,
      metadata: {
        create_user_id: createUserId,
        generated_at: new Date().toISOString(),
        total_incidents: incidentData ? incidentData.length : 0,
        total_images: imagesData ? imagesData.length : 0,
        total_user_documents: userDocumentsData ? userDocumentsData.length : 0, // NEW
        total_witnesses: witnessesData.length,
        total_vehicles: vehiclesData.length,
        has_emergency_audio: !!emergencyAudioData // NEW
      }
    };

    console.log(`✅ Data fetched successfully: ${allData.metadata.total_incidents} incidents, ${allData.metadata.total_images} legacy images, ${allData.metadata.total_user_documents} user documents, ${allData.metadata.total_witnesses} witnesses, ${allData.metadata.total_vehicles} vehicles`);

    return allData;

  } catch (error) {
    console.error('❌ Error fetching data:', error);
    throw error;
  }
}

module.exports = { fetchAllData };