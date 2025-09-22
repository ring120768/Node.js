// lib/dataFetcher.js
// This file is responsible for fetching all data from Supabase needed for PDF generation
// It acts as a central data collection point, gathering information from multiple database tables

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with environment variables
// SERVICE_ROLE_KEY gives us admin access to bypass Row Level Security (RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

/**
 * Fetch all data needed for PDF generation
 * This is the main function that orchestrates all data collection
 * 
 * @param {string} createUserId - The unique identifier from Typeform (UUID format)
 * @returns {object} Consolidated data object containing all information from various tables
 * @throws {Error} If any critical data fetch fails
 */
async function fetchAllData(createUserId) {
  try {
    console.log(`📊 Starting data fetch for user: ${createUserId}`);

    // We'll collect all our data in stages, checking for errors at each step
    // This helps us identify exactly where issues occur if something fails

    // ========================================
    // STEP 1: Fetch User Profile Data
    // ========================================
    console.log('  📋 Fetching user profile...');
    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('*')  // Get all columns
      .eq('create_user_id', createUserId)  // Match our user
      .single();  // Expect exactly one result

    if (userError) {
      console.error('  ❌ User data error:', userError.message);
      throw new Error(`User data error: ${userError.message}`);
    }
    console.log('  ✅ User profile fetched');

    // ========================================
    // STEP 2: Fetch Incident Reports
    // ========================================
    console.log('  📋 Fetching incident reports...');
    const { data: incidentData, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('create_user_id', createUserId)
      .order('created_at', { ascending: false });  // Most recent first

    if (incidentError) {
      console.error('  ⚠️ Incident data warning:', incidentError.message);
      // We don't throw here because a user might not have incidents yet
    }
    console.log(`  ✅ Found ${incidentData?.length || 0} incident(s)`);

    // ========================================
    // STEP 3: Fetch DVLA Vehicle Information
    // ========================================
    console.log('  📋 Fetching DVLA vehicle info...');
    const { data: dvlaData, error: dvlaError } = await supabase
      .from('dvla_vehicle_info_new')
      .select('*')
      .eq('create_user_id', createUserId);

    if (dvlaError) {
      console.error('  ⚠️ DVLA data warning:', dvlaError.message);
      // Non-critical - user might not have DVLA lookups yet
    }
    console.log(`  ✅ Found ${dvlaData?.length || 0} DVLA record(s)`);

    // ========================================
    // STEP 4: Fetch AI Transcriptions
    // ========================================
    console.log('  📋 Fetching AI transcriptions...');
    const { data: aiTranscriptionData, error: transcriptionError } = await supabase
      .from('ai_transcription')
      .select('*')
      .eq('create_user_id', createUserId)
      .order('created_at', { ascending: false });  // Most recent first

    if (transcriptionError) {
      console.error('  ⚠️ AI transcription warning:', transcriptionError.message);
      // Non-critical - might not have transcriptions yet
    }
    console.log(`  ✅ Found ${aiTranscriptionData?.length || 0} transcription(s)`);

    // ========================================
    // STEP 5: Fetch AI Summaries
    // ========================================
    console.log('  📋 Fetching AI summaries...');
    const { data: aiSummaryData, error: summaryError } = await supabase
      .from('ai_summary')
      .select('*')
      .eq('create_user_id', createUserId)
      .order('created_at', { ascending: false });  // Most recent first

    if (summaryError) {
      console.error('  ⚠️ AI summary warning:', summaryError.message);
      // Non-critical - might not have summaries yet
    }
    console.log(`  ✅ Found ${aiSummaryData?.length || 0} summary(ies)`);

    // ========================================
    // STEP 6: Fetch Incident Images
    // ========================================
    console.log('  📋 Fetching incident images...');
    const { data: imagesData, error: imagesError } = await supabase
      .from('incident_images')
      .select('*')
      .eq('create_user_id', createUserId)
      .is('deletion_completed', null);  // Only get non-deleted images

    if (imagesError) {
      console.error('  ⚠️ Images data warning:', imagesError.message);
    }
    console.log(`  ✅ Found ${imagesData?.length || 0} image(s)`);

    // ========================================
    // STEP 7: Process Images by Type
    // ========================================
    // Organize images into a dictionary for easy access by type
    // This makes it easier to map specific image types to PDF fields
    const imagesByType = {};
    if (imagesData && imagesData.length > 0) {
      console.log('  🖼️ Organizing images by type...');
      imagesData.forEach(img => {
        // Store each image indexed by its type (e.g., 'vehicle_damage', 'scene_overview')
        imagesByType[img.image_type] = img;
      });
      console.log(`  ✅ Organized ${Object.keys(imagesByType).length} image type(s)`);
    }

    // ========================================
    // STEP 8: Generate Signed URLs for Images
    // ========================================
    // Create temporary secure URLs that allow PDF to access images
    // These URLs expire after 1 hour for security
    const signedUrls = {};
    if (Object.keys(imagesByType).length > 0) {
      console.log('  🔗 Generating signed URLs for images...');

      for (const [type, image] of Object.entries(imagesByType)) {
        if (image.file_name) {
          try {
            const { data, error } = await supabase.storage
              .from('incident-images-secure')
              .createSignedUrl(image.file_name, 3600);  // Valid for 1 hour

            if (data && !error) {
              signedUrls[type] = data.signedUrl;
              console.log(`    ✅ Generated URL for ${type}`);
            } else if (error) {
              console.error(`    ⚠️ URL generation failed for ${type}:`, error.message);
            }
          } catch (urlError) {
            console.error(`    ⚠️ URL generation error for ${type}:`, urlError.message);
          }
        }
      }
      console.log(`  ✅ Generated ${Object.keys(signedUrls).length} signed URL(s)`);
    }

    // ========================================
    // STEP 9: Try to Match AI Data with Incidents
    // ========================================
    // Attempt to find AI data that corresponds to the most recent incident
    let matchedTranscription = null;
    let matchedSummary = null;

    if (incidentData && incidentData.length > 0) {
      const currentIncidentId = incidentData[0].id;

      // Look for transcription matching this incident
      if (aiTranscriptionData && aiTranscriptionData.length > 0) {
        matchedTranscription = aiTranscriptionData.find(t => 
          t.incident_report_id === currentIncidentId
        ) || aiTranscriptionData[0];  // Fallback to most recent
      }

      // Look for summary matching this incident
      if (aiSummaryData && aiSummaryData.length > 0) {
        matchedSummary = aiSummaryData.find(s => 
          s.incident_id === currentIncidentId
        ) || aiSummaryData[0];  // Fallback to most recent
      }
    } else {
      // No incidents, just use most recent AI data if available
      matchedTranscription = aiTranscriptionData?.[0] || null;
      matchedSummary = aiSummaryData?.[0] || null;
    }

    // ========================================
    // STEP 10: Compile All Data
    // ========================================
    // Create our final data structure with everything organized
    const allData = {
      // User profile information
      user: userData || {},

      // All incidents (might be multiple)
      incidents: incidentData || [],

      // Most recent incident (what we'll use for the PDF)
      currentIncident: incidentData && incidentData.length > 0 ? incidentData[0] : {},

      // DVLA vehicle lookups
      dvla: dvlaData || [],

      // Images organized by type
      images: imagesByType,

      // Secure URLs for images
      imageUrls: signedUrls,

      // AI transcription (matched to current incident if possible)
      aiTranscription: matchedTranscription,

      // AI summary (matched to current incident if possible)
      aiSummary: matchedSummary,

      // Metadata about this data fetch
      metadata: {
        create_user_id: createUserId,
        generated_at: new Date().toISOString(),
        total_incidents: incidentData ? incidentData.length : 0,
        total_images: imagesData ? imagesData.length : 0,
        has_ai_transcription: !!matchedTranscription,
        has_ai_summary: !!matchedSummary
      }
    };

    // Final status report
    console.log('✅ Data fetch complete! Summary:');
    console.log(`   - User profile: ${allData.user.driver_name || 'Unknown'}`);
    console.log(`   - Incidents: ${allData.metadata.total_incidents}`);
    console.log(`   - Images: ${allData.metadata.total_images}`);
    console.log(`   - AI Transcription: ${allData.metadata.has_ai_transcription ? 'Yes' : 'No'}`);
    console.log(`   - AI Summary: ${allData.metadata.has_ai_summary ? 'Yes' : 'No'}`);

    return allData;

  } catch (error) {
    console.error('❌ Critical error during data fetch:', error);
    throw error;  // Re-throw to let calling function handle it
  }
}

// Export the function so other files can use it
module.exports = { fetchAllData };