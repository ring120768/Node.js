// ========================================
// ENHANCED USER ID MANAGEMENT SYSTEM
// Ensures proper create_user_id flow from Typeform → Transcription → Database → PDF
// ========================================

// 1. ENHANCED USER ID VALIDATION (More Permissive for Typeform)
const UserIDManager = {

  // Enhanced validation to accept various Typeform UUID formats
  validateTypeformUserId: (userId) => {
    if (!userId || typeof userId !== 'string') {
      console.error('❌ User ID is null, undefined, or not a string:', userId);
      return false;
    }

    // Clean the user ID (remove whitespace, convert to lowercase for UUID check)
    const cleanUserId = userId.trim();

    // Block obvious test/temporary patterns
    const blockedPatterns = [
      'temp_user_', 'test_user_', 'dummy_', 'mock_', 'sample_',
      'undefined', 'null', 'anonymous', 'guest'
    ];

    for (const pattern of blockedPatterns) {
      if (cleanUserId.toLowerCase().includes(pattern.toLowerCase())) {
        console.error('❌ Blocked suspicious user ID pattern:', cleanUserId);
        return false;
      }
    }

    // Accept UUID format (standard Typeform format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(cleanUserId)) {
      console.log('✅ Valid Typeform UUID:', cleanUserId.substring(0, 8) + '...');
      return true;
    }

    // Accept alphanumeric IDs (some Typeform integrations use these)
    const alphanumericRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/;
    if (alphanumericRegex.test(cleanUserId)) {
      console.log('✅ Valid alphanumeric user ID:', cleanUserId);
      return true;
    }

    // Accept development/testing IDs in non-production
    if (process.env.NODE_ENV !== 'production') {
      const devRegex = /^(dev_|test_|local_)[a-zA-Z0-9_-]{1,50}$/;
      if (devRegex.test(cleanUserId)) {
        console.log('✅ Valid development user ID:', cleanUserId);
        return true;
      }
    }

    console.error('❌ Invalid user ID format:', cleanUserId);
    return false;
  },

  // Extract user ID from multiple sources with priority
  extractUserId: (req) => {
    const sources = [
      req.body?.create_user_id,
      req.query?.create_user_id, 
      req.params?.create_user_id,
      req.body?.user_id,
      req.query?.user_id,
      req.params?.user_id,
      req.body?.userId,
      req.query?.userId,
      req.headers['x-user-id'],
      req.headers['x-create-user-id']
    ];

    for (const source of sources) {
      if (source && this.validateTypeformUserId(source)) {
        console.log('✅ Found valid user ID:', source);
        return source.trim();
      }
    }

    console.error('❌ No valid user ID found in request');
    return null;
  },

  // Generate consistent database object with proper field naming
  createDatabaseUserObject: (userId, additionalData = {}) => {
    return {
      create_user_id: userId,
      user_id: userId, // Legacy compatibility
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...additionalData
    };
  }
};

// 2. ENHANCED URL PARAMETER HANDLING FOR TRANSCRIPTION PAGE
const URLParameterManager = {

  // Extract and validate user ID from URL (for transcription-status.html)
  extractUserIdFromURL: () => {
    const urlParams = new URLSearchParams(window.location.search);

    console.log('🔍 Checking URL parameters:', Object.fromEntries(urlParams.entries()));

    // Try multiple parameter names in order of preference
    const paramNames = [
      'create_user_id',
      'user_id', 
      'userId',
      'typeform_user_id',
      'form_user_id'
    ];

    for (const paramName of paramNames) {
      const value = urlParams.get(paramName);
      if (value && UserIDManager.validateTypeformUserId(value)) {
        console.log(`✅ Found valid user ID in parameter '${paramName}':`, value);

        // Store in localStorage for persistence
        localStorage.setItem('create_user_id', value);
        localStorage.setItem('user_id_source', paramName);
        localStorage.setItem('user_id_timestamp', new Date().toISOString());

        return value;
      }
    }

    // Fallback to localStorage if URL doesn't contain user ID
    const storedUserId = localStorage.getItem('create_user_id');
    if (storedUserId && UserIDManager.validateTypeformUserId(storedUserId)) {
      console.log('✅ Using stored user ID from localStorage:', storedUserId);
      return storedUserId;
    }

    console.error('❌ No valid user ID found in URL or localStorage');
    return null;
  },

  // Build proper URLs with user ID for navigation
  buildURLWithUserId: (baseUrl, userId, additionalParams = {}) => {
    const url = new URL(baseUrl, window.location.origin);
    url.searchParams.set('create_user_id', userId);

    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, value);
      }
    });

    return url.href;
  }
};

// 3. DATABASE CONSISTENCY MANAGER
const DatabaseManager = {

  // Ensure all database operations use consistent user ID field
  async saveTranscriptionData(supabase, userId, transcriptionData) {
    try {
      const userObject = UserIDManager.createDatabaseUserObject(userId, {
        transcription_text: transcriptionData.text,
        audio_url: transcriptionData.audioUrl,
        incident_report_id: transcriptionData.incidentId,
        transcription_confidence: transcriptionData.confidence || 'high',
        processing_metadata: transcriptionData.metadata || {}
      });

      // Save to ai_transcription table
      const { data: transcription, error: transcriptionError } = await supabase
        .from('ai_transcription')
        .insert(userObject)
        .select()
        .single();

      if (transcriptionError) {
        throw new Error(`Transcription save failed: ${transcriptionError.message}`);
      }

      console.log('✅ Transcription saved successfully:', transcription.id);
      return transcription;

    } catch (error) {
      console.error('❌ Error saving transcription data:', error);
      throw error;
    }
  },

  // Update incident report with transcription reference
  async linkTranscriptionToIncident(supabase, userId, transcriptionId, incidentId) {
    try {
      if (!incidentId) {
        console.log('ℹ️ No incident ID provided, skipping link');
        return null;
      }

      const { data, error } = await supabase
        .from('incident_reports')
        .update({
          transcription_id: transcriptionId,
          transcription_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('create_user_id', userId)
        .eq('id', incidentId)
        .select()
        .single();

      if (error) {
        console.warn('⚠️ Could not link transcription to incident:', error.message);
        return null;
      }

      console.log('✅ Transcription linked to incident successfully');
      return data;

    } catch (error) {
      console.error('❌ Error linking transcription to incident:', error);
      return null;
    }
  },

  // Get all user data for PDF generation
  async getAllUserData(supabase, userId) {
    try {
      console.log('📊 Collecting all data for user:', userId);

      const userData = {};

      // Get user signup data
      const { data: signup } = await supabase
        .from('user_signup')
        .select('*')
        .eq('create_user_id', userId)
        .single();
      userData.signup = signup;

      // Get incident reports
      const { data: incidents } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('create_user_id', userId)
        .order('created_at', { ascending: false });
      userData.incidents = incidents || [];

      // Get transcriptions
      const { data: transcriptions } = await supabase
        .from('ai_transcription')
        .select('*')
        .eq('create_user_id', userId)
        .order('created_at', { ascending: false });
      userData.transcriptions = transcriptions || [];

      // Get AI summaries/legal narratives
      const { data: summaries } = await supabase
        .from('ai_summary')
        .select('*')
        .eq('create_user_id', userId)
        .order('created_at', { ascending: false });
      userData.summaries = summaries || [];

      // Get evidence (images, audio, etc.)
      const { data: evidence } = await supabase
        .from('incident_evidence')
        .select('*')
        .eq('create_user_id', userId)
        .order('created_at', { ascending: false });
      userData.evidence = evidence || [];

      console.log('✅ User data collection complete:', {
        signup: !!userData.signup,
        incidents: userData.incidents.length,
        transcriptions: userData.transcriptions.length,
        summaries: userData.summaries.length,
        evidence: userData.evidence.length
      });

      return userData;

    } catch (error) {
      console.error('❌ Error collecting user data:', error);
      throw error;
    }
  }
};

// 4. PDF GENERATION DATA PREPARATION
const PDFDataManager = {

  // Prepare consolidated data structure for PDF generation
  preparePDFData: (userData) => {
    const pdfData = {
      user_id: userData.signup?.create_user_id,

      // Personal Information
      personal: {
        full_name: userData.signup?.name || userData.signup?.full_name,
        email: userData.signup?.email,
        phone: userData.signup?.mobile || userData.signup?.phone,
        address: userData.signup?.address,
        date_of_birth: userData.signup?.date_of_birth
      },

      // Incident Information
      incident: userData.incidents[0] || {},

      // Transcription Data
      transcription: userData.transcriptions[0]?.transcription_text || '',

      // AI Analysis
      ai_summary: userData.summaries[0]?.summary_text || '',
      legal_narrative: userData.summaries.find(s => s.summary_type === 'legal_narrative')?.summary_text || '',

      // Evidence
      evidence: userData.evidence.map(e => ({
        type: e.evidence_type,
        url: e.file_url,
        description: e.description,
        timestamp: e.created_at
      })),

      // Metadata
      report_generated_at: new Date().toISOString(),
      data_completeness: {
        has_personal_info: !!(userData.signup?.name && userData.signup?.email),
        has_incident_data: userData.incidents.length > 0,
        has_transcription: userData.transcriptions.length > 0,
        has_ai_analysis: userData.summaries.length > 0,
        has_evidence: userData.evidence.length > 0
      }
    };

    return pdfData;
  }
};

// Export for use in both frontend and backend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UserIDManager,
    URLParameterManager, 
    DatabaseManager,
    PDFDataManager
  };
}