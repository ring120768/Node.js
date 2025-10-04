// lib/dataFetcher.js
// Enhanced Data Fetcher for Car Crash Lawyer AI System
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
 * Validates if a string is a valid UUID v4
 * @param {string} uuid - The string to validate
 * @returns {boolean} True if valid UUID, false otherwise
 */
function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Calculate data completeness percentage
 * @param {object} userData - User profile data
 * @param {array} incidentData - Incident reports array
 * @param {array} vehiclesData - Additional vehicles array
 * @param {array} witnessData - Witness reports array
 * @returns {number} Percentage of data completeness (0-100)
 */
function calculateCompleteness(userData, incidentData, vehiclesData, witnessData) {
  let score = 0;
  let total = 10; // Total possible sections

  // Safely check each condition
  if (userData && Object.keys(userData).length > 0) score++;
  if (Array.isArray(incidentData) && incidentData.length > 0) score++;
  if (Array.isArray(vehiclesData) && vehiclesData.length > 0) score++;
  if (Array.isArray(witnessData) && witnessData.length > 0) score++;

  // Check for critical user fields with safe navigation
  if (userData?.driver_name) score++;
  if (userData?.email) score++;
  if (userData?.phone) score++;
  if (userData?.gdpr_consent) score++;

  // Check for incident details with safe navigation
  if (incidentData?.[0]?.incident_date) score++;
  if (incidentData?.[0]?.incident_location) score++;

  return Math.round((score / total) * 100);
}

/**
 * Perform a database query with retry logic
 * @param {Function} queryFn - The query function to execute
 * @param {string} tableName - Name of the table for logging
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<object>} Query result
 */
async function queryWithRetry(queryFn, tableName, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await queryFn();
      return result;
    } catch (error) {
      lastError = error;
      console.error(`  ⚠️ Attempt ${attempt}/${maxRetries} failed for ${tableName}:`, error.message);

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`  ⏳ Retrying ${tableName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`  ❌ All retry attempts failed for ${tableName}`);
  throw lastError;
}

/**
 * Fetch data from a single table with error handling
 * @param {string} tableName - Name of the table
 * @param {string} createUserId - User ID to filter by
 * @param {object} options - Additional query options
 * @returns {Promise<Array>} Array of records or empty array on failure
 */
async function fetchTableData(tableName, createUserId, options = {}) {
  const { 
    orderBy = 'created_at', 
    ascending = false, 
    additionalFilters = [],
    singleResult = false 
  } = options;

  try {
    let query = supabase
      .from(tableName)
      .select('*')
      .eq('create_user_id', createUserId);

    // Apply additional filters
    additionalFilters.forEach(filter => {
      if (filter.type === 'is_null') {
        query = query.is(filter.column, null);
      } else if (filter.type === 'eq') {
        query = query.eq(filter.column, filter.value);
      }
    });

    // Apply ordering if specified
    if (orderBy) {
      query = query.order(orderBy, { ascending });
    }

    // Get single result if specified
    if (singleResult) {
      query = query.single();
    }

    const { data, error } = await query;

    if (error && singleResult) {
      // For single result queries, throw error to be handled by retry logic
      throw error;
    } else if (error) {
      // For multi-result queries, log and return empty array
      console.error(`  ⚠️ Error fetching ${tableName}:`, error.message);
      return [];
    }

    return data || (singleResult ? null : []);
  } catch (error) {
    console.error(`  ⚠️ Error in fetchTableData for ${tableName}:`, error.message);
    if (singleResult) {
      throw error;
    }
    return [];
  }
}

/**
 * Fetch all data needed for PDF generation
 * This is the main function that orchestrates all data collection
 * 
 * @param {string} createUserId - The unique identifier from Typeform (UUID format)
 * @returns {object} Consolidated data object containing all information from various tables
 * @throws {Error} If createUserId is invalid or user doesn't exist
 */
async function fetchAllData(createUserId) {
  const startTime = Date.now();

  try {
    // ========================================
    // STEP 0: Validate Input
    // ========================================
    if (!isValidUUID(createUserId)) {
      const error = new Error(`Invalid create_user_id format: ${createUserId}`);
      error.code = 'INVALID_UUID';
      throw error;
    }

    console.log(`📊 Starting comprehensive data fetch for user: ${createUserId}`);
    console.log(`  ⏰ Start time: ${new Date().toISOString()}`);

    // ========================================
    // STEP 1: Fetch User Profile Data (CRITICAL - With Retry)
    // ========================================
    console.log('  📋 Fetching user profile (critical)...');

    let userData = null;
    try {
      const result = await queryWithRetry(
        () => fetchTableData('user_signup', createUserId, { singleResult: true }),
        'user_signup',
        3
      );
      userData = result;
    } catch (userError) {
      const error = new Error(`User not found: ${createUserId}`);
      error.code = 'USER_NOT_FOUND';
      error.details = userError.message;
      console.error('  ❌ Critical error - user not found:', error.message);
      throw error;
    }

    if (!userData) {
      const error = new Error(`User data is empty for: ${createUserId}`);
      error.code = 'USER_DATA_EMPTY';
      throw error;
    }

    console.log('  ✅ User profile fetched:', userData.driver_name || 'Unknown');

    // ========================================
    // STEP 2: Parallel Fetch Non-Critical Data
    // ========================================
    console.log('  🔄 Starting parallel data fetch for 10 tables...');

    // Define all parallel fetch operations
    const parallelFetches = await Promise.allSettled([
      // Incident Reports
      fetchTableData('incident_reports', createUserId, { 
        orderBy: 'created_at', 
        ascending: false 
      }),

      // DVLA Vehicle Info
      fetchTableData('dvla_vehicle_info_new', createUserId),

      // AI Transcriptions
      fetchTableData('ai_transcription', createUserId, {
        orderBy: 'created_at',
        ascending: false
      }),

      // AI Summaries
      fetchTableData('ai_summary', createUserId, {
        orderBy: 'created_at',
        ascending: false
      }),

      // Incident Images (only non-deleted)
      fetchTableData('incident_images', createUserId, {
        additionalFilters: [{ type: 'is_null', column: 'deletion_completed' }]
      }),

      // Additional Vehicles
      fetchTableData('additional_vehicles', createUserId, {
        orderBy: 'created_at',
        ascending: false
      }),

      // Witness Reports
      fetchTableData('witness_reports', createUserId, {
        orderBy: 'created_at',
        ascending: false
      }),

      // Incident Evidence
      fetchTableData('incident_evidence', createUserId, {
        orderBy: 'created_at',
        ascending: false
      }),

      // Dashcam Footage
      fetchTableData('dash_cam_footage', createUserId, {
        orderBy: 'created_at',
        ascending: false
      }),

      // Transcription Queue
      fetchTableData('transcription_queue', createUserId, {
        orderBy: 'created_at',
        ascending: false
      })
    ]);

    // Extract results from parallel fetches with safe defaults
    const [
      incidentResult,
      dvlaResult,
      transcriptionResult,
      summaryResult,
      imagesResult,
      vehiclesResult,
      witnessResult,
      evidenceResult,
      dashcamResult,
      queueResult
    ] = parallelFetches;

    // Process results with fallbacks for failed fetches
    const incidentData = incidentResult.status === 'fulfilled' ? incidentResult.value : [];
    const dvlaData = dvlaResult.status === 'fulfilled' ? dvlaResult.value : [];
    const aiTranscriptionData = transcriptionResult.status === 'fulfilled' ? transcriptionResult.value : [];
    const aiSummaryData = summaryResult.status === 'fulfilled' ? summaryResult.value : [];
    const imagesData = imagesResult.status === 'fulfilled' ? imagesResult.value : [];
    const vehiclesData = vehiclesResult.status === 'fulfilled' ? vehiclesResult.value : [];
    const witnessData = witnessResult.status === 'fulfilled' ? witnessResult.value : [];
    const evidenceData = evidenceResult.status === 'fulfilled' ? evidenceResult.value : [];
    const dashcamData = dashcamResult.status === 'fulfilled' ? dashcamResult.value : [];
    const queueData = queueResult.status === 'fulfilled' ? queueResult.value : [];

    // Log fetch results
    console.log('  📊 Parallel fetch complete:');
    console.log(`     ✅ Incidents: ${incidentData.length}`);
    console.log(`     ✅ DVLA records: ${dvlaData.length}`);
    console.log(`     ✅ Transcriptions: ${aiTranscriptionData.length}`);
    console.log(`     ✅ Summaries: ${aiSummaryData.length}`);
    console.log(`     ✅ Images: ${imagesData.length}`);
    console.log(`     ✅ Additional vehicles: ${vehiclesData.length}`);
    console.log(`     ✅ Witnesses: ${witnessData.length}`);
    console.log(`     ✅ Evidence files: ${evidenceData.length}`);
    console.log(`     ✅ Dashcam files: ${dashcamData.length}`);
    console.log(`     ✅ Queue items: ${queueData.length}`);

    // ========================================
    // STEP 3: Process Transcription Queue Status
    // ========================================
    const pendingTranscriptions = queueData.filter(q => 
      ['PENDING', 'PROCESSING', 'QUEUED'].includes(q.status)
    );

    const failedTranscriptions = queueData.filter(q => 
      ['FAILED', 'ERROR', 'INVALID_USER'].includes(q.status)
    );

    const completedTranscriptions = queueData.filter(q => 
      ['COMPLETED', 'SUCCESS'].includes(q.status)
    );

    if (pendingTranscriptions.length > 0) {
      console.log(`  ⏳ ${pendingTranscriptions.length} transcription(s) in progress`);
    }

    if (failedTranscriptions.length > 0) {
      console.log(`  ⚠️ ${failedTranscriptions.length} transcription(s) failed`);
    }

    // ========================================
    // STEP 4: Process Images by Type
    // ========================================
    const imagesByType = {};
    const signedUrls = {};

    if (imagesData && imagesData.length > 0) {
      console.log('  🖼️ Processing images...');

      // Organize images by type (only if both type and filename exist)
      imagesData.forEach(img => {
        if (img.image_type && img.file_name) {
          imagesByType[img.image_type] = img;
        }
      });

      // Generate signed URLs with error handling for each
      if (Object.keys(imagesByType).length > 0) {
        console.log('  🔗 Generating signed URLs for images...');

        const urlPromises = Object.entries(imagesByType).map(async ([type, image]) => {
          try {
            const { data, error } = await supabase.storage
              .from('incident-images-secure')
              .createSignedUrl(image.file_name, 3600); // 1 hour expiry

            if (data && !error) {
              signedUrls[type] = data.signedUrl;
              return { type, status: 'success' };
            } else {
              console.error(`    ⚠️ Failed to generate URL for ${type}:`, error?.message);
              return { type, status: 'failed', error: error?.message };
            }
          } catch (err) {
            console.error(`    ⚠️ Exception generating URL for ${type}:`, err.message);
            return { type, status: 'error', error: err.message };
          }
        });

        const urlResults = await Promise.allSettled(urlPromises);
        const successCount = urlResults.filter(r => 
          r.status === 'fulfilled' && r.value?.status === 'success'
        ).length;

        console.log(`  ✅ Generated ${successCount}/${Object.keys(imagesByType).length} signed URLs`);
      }
    }

    // ========================================
    // STEP 5: Match AI Data with Incidents (Safe Navigation)
    // ========================================
    let matchedTranscription = null;
    let matchedSummary = null;

    // Safely get current incident
    const currentIncident = Array.isArray(incidentData) && incidentData.length > 0 
      ? incidentData[0] 
      : null;

    if (currentIncident && currentIncident.id) {
      const currentIncidentId = currentIncident.id;

      // Try to match transcription to current incident
      if (Array.isArray(aiTranscriptionData) && aiTranscriptionData.length > 0) {
        matchedTranscription = aiTranscriptionData.find(t => 
          t.incident_report_id === currentIncidentId
        ) || aiTranscriptionData[0];
      }

      // Try to match summary to current incident
      if (Array.isArray(aiSummaryData) && aiSummaryData.length > 0) {
        matchedSummary = aiSummaryData.find(s => 
          s.incident_id === currentIncidentId || 
          s.incident_report_id === currentIncidentId
        ) || aiSummaryData[0];
      }

      if (matchedTranscription || matchedSummary) {
        console.log(`  🔄 Matched AI data to incident: ${currentIncidentId}`);
      }
    } else {
      // No incidents, use most recent AI data if available
      matchedTranscription = aiTranscriptionData?.[0] || null;
      matchedSummary = aiSummaryData?.[0] || null;
    }

    // ========================================
    // STEP 6: Build Comprehensive Data Object
    // ========================================
    const allData = {
      // User profile information (guaranteed to exist)
      user: userData,

      // All incidents
      incidents: incidentData,

      // Most recent incident
      currentIncident: currentIncident || {},

      // DVLA vehicle lookups
      dvla: dvlaData,

      // Additional vehicles involved
      additionalVehicles: vehiclesData,

      // Witness reports
      witnesses: witnessData,

      // Evidence files
      evidence: evidenceData,

      // Dashcam footage
      dashcam: dashcamData,

      // Images organized by type
      images: imagesByType,

      // Secure URLs for images
      imageUrls: signedUrls,

      // AI transcription (matched to current incident if possible)
      aiTranscription: matchedTranscription,

      // AI summary (matched to current incident if possible)
      aiSummary: matchedSummary,

      // Comprehensive transcription queue status
      transcriptionQueue: {
        pending: pendingTranscriptions,
        failed: failedTranscriptions,
        completed: completedTranscriptions,
        all: queueData
      },

      // Enhanced metadata
      metadata: {
        create_user_id: createUserId,
        generated_at: new Date().toISOString(),
        fetch_duration_ms: Date.now() - startTime,

        // Counts
        total_incidents: incidentData.length,
        total_images: imagesData.length,
        total_signed_urls: Object.keys(signedUrls).length,
        total_vehicles: vehiclesData.length,
        total_witnesses: witnessData.length,
        total_evidence: evidenceData.length,
        total_dashcam: dashcamData.length,

        // Status flags
        has_incident: incidentData.length > 0,
        has_ai_transcription: !!matchedTranscription,
        has_ai_summary: !!matchedSummary,
        has_dashcam: dashcamData.length > 0,
        has_witnesses: witnessData.length > 0,
        has_evidence: evidenceData.length > 0,

        // Processing status
        pending_transcriptions: pendingTranscriptions.length,
        failed_transcriptions: failedTranscriptions.length,
        completed_transcriptions: completedTranscriptions.length,

        // Data completeness
        data_completeness: calculateCompleteness(userData, incidentData, vehiclesData, witnessData)
      }
    };

    // ========================================
    // STEP 7: Generate Summary Report
    // ========================================
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DATA FETCH COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 User: ${allData.user.driver_name || 'Unknown'}`);
    console.log(`📧 Email: ${allData.user.email || 'Not provided'}`);
    console.log(`📍 Incidents: ${allData.metadata.total_incidents}`);
    console.log(`🚗 Vehicles: ${allData.metadata.total_vehicles}`);
    console.log(`👥 Witnesses: ${allData.metadata.total_witnesses}`);
    console.log(`📸 Images: ${allData.metadata.total_images} (${allData.metadata.total_signed_urls} URLs)`);
    console.log(`📹 Dashcam: ${allData.metadata.total_dashcam}`);
    console.log(`📄 Evidence: ${allData.metadata.total_evidence}`);
    console.log(`🤖 AI Data: Transcription=${allData.metadata.has_ai_transcription ? '✓' : '✗'}, Summary=${allData.metadata.has_ai_summary ? '✓' : '✗'}`);
    console.log(`📊 Queue: ${allData.metadata.pending_transcriptions} pending, ${allData.metadata.failed_transcriptions} failed`);
    console.log(`✨ Data Completeness: ${allData.metadata.data_completeness}%`);
    console.log(`⏱️ Fetch Duration: ${allData.metadata.fetch_duration_ms}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return allData;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ DATA FETCH FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Error: ${error.message}`);
    console.error(`Code: ${error.code || 'UNKNOWN'}`);
    console.error(`User ID: ${createUserId}`);
    console.error(`Duration: ${duration}ms`);
    if (error.details) {
      console.error(`Details: ${error.details}`);
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Re-throw with additional context
    error.fetchDuration = duration;
    error.userId = createUserId;
    throw error;
  }
}

// Export functions for use in other modules
module.exports = { 
  fetchAllData,
  isValidUUID,
  calculateCompleteness
};