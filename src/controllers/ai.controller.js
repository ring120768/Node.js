/**
 * AI Controller - Car Crash Lawyer AI
 * Handles AI-powered analysis of personal statements
 * ✅ Uses OpenAI GPT for comprehensive analysis
 */

const OpenAI = require('openai');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const { createClient } = require('@supabase/supabase-js');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

/**
 * Analyze personal statement with AI
 * POST /api/ai/analyze-statement
 *
 * Generates:
 * 1. Summary with key points
 * 2. Quality review with missing info and suggestions
 * 3. Combined report (if incident data available)
 * 4. Final review with completeness score and next steps
 */
async function analyzeStatement(req, res) {
  try {
    const { userId, incidentId, transcription } = req.body;

    if (!transcription || transcription.trim().length === 0) {
      return sendError(res, 400, 'Transcription text is required', 'MISSING_TRANSCRIPTION');
    }

    logger.info('Starting AI analysis', {
      userId,
      incidentId,
      textLength: transcription.length
    });

    // Fetch comprehensive incident data (ALL fields for Page 14 narrative)
    let incidentData = null;
    let otherVehicles = [];
    let witnesses = [];

    if (incidentId) {
      // Fetch main incident report (160+ fields)
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('id', incidentId)
        .is('deleted_at', null)
        .single();

      if (!error && data) {
        incidentData = data;
        logger.info('Incident data retrieved', { incidentId, fieldCount: Object.keys(data).length });
      }

      // Fetch other vehicles (up to 5 vehicles)
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('incident_other_vehicles')
        .select('*')
        .eq('create_user_id', userId)
        .is('deleted_at', null)
        .order('vehicle_index', { ascending: true });

      if (!vehiclesError && vehiclesData) {
        otherVehicles = vehiclesData;
        logger.info('Other vehicles retrieved', { count: vehiclesData.length });
      }

      // Fetch witnesses (up to 3 witnesses)
      const { data: witnessesData, error: witnessesError } = await supabase
        .from('incident_witnesses')
        .select('*')
        .eq('create_user_id', userId)
        .is('deleted_at', null)
        .order('witness_index', { ascending: true });

      if (!witnessesError && witnessesData) {
        witnesses = witnessesData;
        logger.info('Witnesses retrieved', { count: witnessesData.length });
      }
    }

    // Generate comprehensive AI analysis using ALL data
    const analysis = await generateComprehensiveAnalysis(
      transcription,
      incidentData,
      otherVehicles,
      witnesses
    );

    // Store analysis in database for audit
    if (incidentId) {
      await storeAIAnalysis(userId, incidentId, transcription, analysis);
    }

    logger.success('AI analysis complete', {
      userId,
      incidentId,
      completenessScore: analysis.finalReview?.completenessScore,
      narrativeWordCount: analysis.combinedReport ? analysis.combinedReport.split(/\s+/).length : 0
    });

    res.json({
      success: true,
      analysis: analysis
    });

  } catch (error) {
    logger.error('AI analysis error', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 500, 'Failed to analyze statement', 'ANALYSIS_ERROR');
  }
}

/**
 * Generate comprehensive AI analysis using GPT
 *
 * ENHANCED VERSION - Uses ALL 160+ incident fields for Page 14 comprehensive narrative
 *
 * IMPORTANT: This function makes 3-4 sequential OpenAI API calls:
 * - Summary generation (~5-10s)
 * - Quality review (~5-10s)
 * - Combined report (~10-20s, if incident data exists) ← ENHANCED with all fields
 * - Final review (~5-10s)
 * Total time: 25-50+ seconds
 *
 * The /api/ai/* routes have a 120-second timeout configured in app.js
 * to accommodate these long-running operations.
 */
async function generateComprehensiveAnalysis(
  transcription,
  incidentData = null,
  otherVehicles = [],
  witnesses = []
) {
  try {
    const startTime = Date.now();

    // Step 1: Generate Summary and Key Points (FOR PAGE 15)
    logger.info('[AI Analysis] Step 1/4: Generating summary and key points...');
    const summaryPrompt = `Analyze this car accident personal statement and extract factual information.

Personal Statement:
"""
${transcription}
"""

Provide:
1. A concise 2-3 sentence summary stating the facts of what occurred
2. 3-7 key bullet points documenting main events, injuries, and critical details
3. Brief fault analysis based solely on the facts presented (1-2 sentences)

Format as JSON:
{
  "summary": "...",
  "keyPoints": ["...", "...", "..."],
  "faultAnalysis": "..."
}`;

    const summaryResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a legal documentation assistant who analyzes car accident statements and extracts factual information objectively.' },
        { role: 'user', content: summaryPrompt }
      ],
      temperature: 0.3,  // Reduced for factual accuracy
      response_format: { type: 'json_object' }
    });

    const summaryData = JSON.parse(summaryResponse.choices[0].message.content);
    logger.info('[AI Analysis] Step 1/4 complete', {
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      keyPointsCount: summaryData.keyPoints?.length || 0
    });

    // Step 2: Generate Quality Review
    logger.info('[AI Analysis] Step 2/4: Generating quality review...');
    const reviewPrompt = `Review a car accident statement for completeness and identify missing information.

Personal Statement:
"""
${transcription}
"""

Review the statement and provide:
1. Quality assessment (2-3 sentences about the completeness of the documentation)
2. Missing critical information (list specific items not mentioned: exact date/time, precise location, weather conditions, injuries detail, vehicle damage specifics, witness information, police attendance, etc.)
3. Suggestions for improvement (3-5 specific items to document for more complete records)

Format as JSON:
{
  "quality": "...",
  "missingInfo": ["...", "..."],
  "suggestions": ["...", "...", "..."]
}`;

    const reviewResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You review accident documentation to identify completeness and missing factual information.' },
        { role: 'user', content: reviewPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const reviewData = JSON.parse(reviewResponse.choices[0].message.content);
    logger.info('[AI Analysis] Step 2/4 complete', {
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
    });

    // Step 3: Generate Comprehensive Factual Narrative (FOR PAGE 14 - CENTRE PIECE)
    let combinedReport = null;
    if (incidentData) {
      logger.info('[AI Analysis] Step 3/4: Generating comprehensive factual narrative (Page 14)...');

      // Build comprehensive data structure using ALL available fields
      const comprehensiveData = buildComprehensiveIncidentData(
        incidentData,
        otherVehicles,
        witnesses
      );

      const closingStatementPrompt = `Document a comprehensive factual account of a traffic accident.

Create a complete, factual narrative that documents the incident. This narrative will form the centre piece of the legal document (Page 14).

PERSONAL STATEMENT FROM CLIENT:
"""
${transcription}
"""

COMPREHENSIVE INCIDENT DATA:
${JSON.stringify(comprehensiveData, null, 2)}

INSTRUCTIONS:
1. Write in third person, past tense
2. Create a flowing factual narrative (800-1200 words) presenting the incident information clearly and accurately
3. Use professional language that is clear and accessible
4. Include ALL relevant factual details from both the personal statement and incident data
5. Structure logically: Introduction → Incident Details → Conditions → Vehicles Involved → Injuries/Medical → Witnesses/Evidence → Summary
6. State facts objectively and sincerely - this is documentation for legal purposes
7. Do NOT add speculation, interpretation, or information not provided
8. Format with proper paragraphs using <p> tags
9. Ensure every factual claim is supported by the provided data
10. Maintain a sincere, factual tone throughout - record only what is presented

Provide a complete, accurate record that documents all factual aspects of the incident.`;

      const combinedResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You document traffic accidents by recording factual information clearly and accurately. You present only the facts provided, maintaining objectivity and sincerity throughout.'
          },
          { role: 'user', content: closingStatementPrompt }
        ],
        temperature: 0.3,  // Low temperature for factual accuracy in legal context
        max_tokens: 3000   // Increased to accommodate 800-1200 word narrative
      });

      combinedReport = combinedResponse.choices[0].message.content;
      const wordCount = combinedReport.split(/\s+/).length;
      logger.info('[AI Analysis] Step 3/4 complete - Comprehensive factual narrative generated', {
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
        wordCount: wordCount,
        targetRange: '800-1200 words',
        withinRange: wordCount >= 800 && wordCount <= 1200
      });
    } else {
      logger.info('[AI Analysis] Step 3/4: Skipped (no incident data available)');
    }

    // Step 4: Generate Final Review with Next Steps (FOR PAGE 15)
    logger.info('[AI Analysis] Step 4/4: Generating final review and next steps guide...');
    const finalReviewPrompt = `Review the car accident documentation and provide guidance to the client.

Personal Statement:
"""
${transcription}
"""

${incidentData ? `Additional Comprehensive Incident Data: Available (${Object.keys(incidentData).length} fields)` : 'Additional Incident Data: Not Available'}
${otherVehicles.length > 0 ? `Other Vehicles Involved: ${otherVehicles.length}` : ''}
${witnesses.length > 0 ? `Witnesses: ${witnesses.length}` : ''}

Provide:
1. Completeness score (0-100 based on documentation quality and thoroughness)
2. Strengths (2-4 bullet points about what's well-documented) - use <ul><li> HTML format
3. Recommended next steps (5-8 specific, prioritized action items for the client) - clear actionable steps
4. Legal considerations (2-4 important legal points the client should be aware of) - use <p> HTML format

Format as JSON:
{
  "completenessScore": 85,
  "strengths": "<ul><li>Detailed account of incident sequence</li><li>Clear medical documentation</li></ul>",
  "nextSteps": [
    "Seek immediate medical evaluation if not already completed, even for delayed symptoms",
    "Obtain official police report (reference number if available)",
    "Document all ongoing medical treatment and expenses",
    "Collect all photographic evidence of vehicle damage and scene",
    "Obtain witness contact details and statements",
    "Notify insurance company within required timeframe",
    "Do not admit fault or discuss case details on social media",
    "Consult with a solicitor specializing in traffic accidents"
  ],
  "legalConsiderations": "<p>UK law requires notification to insurers within reasonable time regardless of fault...</p><p>Medical evidence is crucial for personal injury claims...</p>"
}`;

    const finalReviewResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You provide clear, actionable guidance to UK traffic accident victims based on standard legal procedures and documentation requirements.'
        },
        { role: 'user', content: finalReviewPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const finalReviewData = JSON.parse(finalReviewResponse.choices[0].message.content);

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.success(`[AI Analysis] All 4 steps complete in ${totalDuration}s`, {
      summaryGenerated: !!summaryData.summary,
      keyPointsCount: summaryData.keyPoints?.length || 0,
      qualityReviewGenerated: !!reviewData.quality,
      closingStatementGenerated: !!combinedReport,
      closingStatementWordCount: combinedReport ? combinedReport.split(/\s+/).length : 0,
      nextStepsCount: finalReviewData.nextSteps?.length || 0,
      completenessScore: finalReviewData.completenessScore
    });

    return {
      summary: summaryData.summary,
      keyPoints: summaryData.keyPoints || [],
      faultAnalysis: summaryData.faultAnalysis,
      review: {
        quality: reviewData.quality,
        missingInfo: reviewData.missingInfo || [],
        suggestions: reviewData.suggestions || []
      },
      combinedReport: combinedReport,  // Page 14: Comprehensive closing statement
      finalReview: finalReviewData      // Page 15: Next steps and legal considerations
    };

  } catch (error) {
    logger.error('AI generation error:', error);
    throw new Error('Failed to generate AI analysis: ' + error.message);
  }
}

/**
 * Build comprehensive incident data structure using ALL available fields
 * This is used for the Page 14 closing statement narrative
 */
function buildComprehensiveIncidentData(incidentData, otherVehicles = [], witnesses = []) {
  const data = {
    // Incident Basic Information
    incident: {
      date: incidentData.when_did_the_accident_happen || 'Not specified',
      time: incidentData.what_time_did_the_accident_happen || 'Not specified',
      location: incidentData.where_exactly_did_this_happen || 'Not specified',
      what3words: incidentData.what_3_words_location || null,
      roadType: incidentData.road_type || null,
      speedLimit: incidentData.speed_limit || null,
      description: incidentData.what_happened_detailed_account || incidentData.detailed_account_of_what_happened || null
    },

    // Environmental Conditions
    conditions: {
      weather: extractArrayField(incidentData.weather_conditions) || 'Not specified',
      lighting: incidentData.lighting_conditions || null,
      roadSurface: extractArrayField(incidentData.road_surface_conditions) || null,
      visibility: incidentData.visibility || null,
      trafficDensity: incidentData.traffic_density || null,
      roadFeatures: extractArrayField(incidentData.road_features) || null
    },

    // User's Vehicle Information
    userVehicle: {
      make: incidentData.make_of_car || 'Not specified',
      model: incidentData.model_of_car || 'Not specified',
      registration: incidentData.registration_number || null,
      color: incidentData.vehicle_colour || null,
      damage: incidentData.damage_to_your_vehicle || null,
      damageEstimate: incidentData.estimated_damage_cost || null,
      occupants: incidentData.number_of_occupants || null,
      seatbeltsWorn: incidentData.seatbelts_worn || null,
      airbagsDeployed: incidentData.airbags_deployed || null,
      vehicleMoving: incidentData.was_vehicle_moving || null,
      speed: incidentData.approximate_speed || null
    },

    // User Information
    user: {
      wasDriver: incidentData.were_you_the_driver || null,
      licenseValid: incidentData.valid_driving_license || null,
      insuranceValid: incidentData.valid_insurance || null,
      motValid: incidentData.valid_mot || null,
      dashcamPresent: incidentData.dashcam_installed || null,
      dashcamRecording: incidentData.dashcam_recording || null
    },

    // Other Vehicles Involved
    otherVehicles: otherVehicles.map((vehicle, index) => ({
      index: vehicle.vehicle_index || index + 1,
      make: vehicle.make || null,
      model: vehicle.model || null,
      registration: vehicle.registration || null,
      color: vehicle.color || null,
      damage: vehicle.damage_description || null,
      driverName: vehicle.driver_name || null,
      driverContact: vehicle.driver_contact || null,
      insurerName: vehicle.insurer_name || null,
      insurerContact: vehicle.insurer_contact || null,
      policyNumber: vehicle.policy_number || null,
      wasMoving: vehicle.was_moving || null,
      direction: vehicle.direction || null
    })),

    // Medical Information
    medical: {
      injuries: extractArrayField(incidentData.medical_symptoms) || incidentData.medical_how_are_you_feeling || null,
      symptomsAppearance: incidentData.symptoms_appearance_time || null,
      hospitalVisit: incidentData.hospital_visit || null,
      hospitalName: incidentData.hospital_name || null,
      ambulanceCalled: incidentData.ambulance_called || null,
      treatmentReceived: incidentData.treatment_received || null,
      ongoingSymptoms: incidentData.ongoing_symptoms || null,
      priorInjuries: incidentData.prior_injuries || null
    },

    // Emergency Services & Police
    emergency: {
      policeAttended: incidentData.police_attended || incidentData.did_police_attend || null,
      policeStation: incidentData.police_station || null,
      crimeReferenceNumber: incidentData.crime_reference_number || null,
      officerName: incidentData.officer_name || null,
      officerBadgeNumber: incidentData.officer_badge_number || null,
      breathalyzerGiven: incidentData.breathalyzer_test || null,
      arrestsMade: incidentData.arrests_made || null
    },

    // Witnesses
    witnesses: witnesses.map((witness, index) => ({
      index: witness.witness_index || index + 1,
      name: witness.witness_name || null,
      contact: witness.witness_contact || null,
      relationship: witness.witness_relationship || null,
      statement: witness.witness_statement || null,
      willingness: witness.willing_to_testify || null
    })),

    // Insurance Information
    insurance: {
      userInsurer: incidentData.insurer_name || null,
      userPolicyNumber: incidentData.policy_number || null,
      userClaimNumber: incidentData.claim_number || null,
      otherDriverInsurer: incidentData.other_driver_insurer || null,
      otherDriverPolicyNumber: incidentData.other_driver_policy_number || null,
      claimFiled: incidentData.claim_filed || null,
      claimDate: incidentData.claim_filed_date || null
    },

    // Fault & Liability
    fault: {
      userOpinion: incidentData.who_was_at_fault || incidentData.fault_assessment || null,
      otherDriverOpinion: incidentData.other_driver_fault_opinion || null,
      contributingFactors: extractArrayField(incidentData.contributing_factors) || null,
      trafficViolations: incidentData.traffic_violations || null,
      roadSignsPresent: incidentData.road_signs_present || null,
      signalCompliance: incidentData.signal_compliance || null
    },

    // Additional Context
    additional: {
      previousAccidents: incidentData.previous_accidents || null,
      dashcamFootageAvailable: incidentData.dashcam_footage_available || null,
      photographsTaken: incidentData.photographs_taken || null,
      witnessStatementsTaken: incidentData.witness_statements_taken || null,
      reportFiledWithInsurer: incidentData.report_filed_with_insurer || null,
      legalRepresentation: incidentData.legal_representation || null,
      otherRelevantInfo: incidentData.other_relevant_information || null
    }
  };

  return data;
}

/**
 * Helper function to extract and format PostgreSQL array fields
 */
function extractArrayField(field) {
  if (!field) return null;
  if (Array.isArray(field)) return field.join(', ');
  if (typeof field === 'string') {
    // Handle PostgreSQL array format: {item1,item2,item3}
    const cleaned = field.replace(/[{}]/g, '');
    return cleaned || null;
  }
  return null;
}

/**
 * Store AI analysis in incident_reports table for PDF generation
 *
 * This function updates the incident_reports record with AI-generated content
 * that will appear in the final PDF document (Pages 13-16).
 *
 * Migration 028 added these columns to incident_reports:
 * - voice_transcription (Page 13): User's transcription
 * - analysis_metadata (Page 13): GPT model info
 * - quality_review (Page 13): Quality assessment
 * - ai_summary (Page 14): Summary with key points
 * - closing_statement (Page 15): Comprehensive narrative
 * - final_review (Page 16): Next steps and recommendations
 */
async function storeAIAnalysis(userId, incidentId, transcription, analysis) {
  try {
    // Format AI summary: Combine summary text with key points as bullets
    const keyPointsBullets = analysis.keyPoints && analysis.keyPoints.length > 0
      ? '\n\nKey Points:\n' + analysis.keyPoints.map(point => `• ${point}`).join('\n')
      : '';
    const aiSummary = `${analysis.summary || ''}${keyPointsBullets}`;

    // Format quality review: Extract quality text from review object
    const qualityReviewText = typeof analysis.review === 'object' && analysis.review.quality
      ? analysis.review.quality
      : '';

    // Format final review: Convert JSONB to readable text
    let finalReviewText = '';
    if (analysis.finalReview) {
      if (analysis.finalReview.strengths) {
        finalReviewText += `Strengths:\n${analysis.finalReview.strengths}\n\n`;
      }
      if (analysis.finalReview.nextSteps && Array.isArray(analysis.finalReview.nextSteps)) {
        finalReviewText += 'Next Steps:\n' + analysis.finalReview.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n') + '\n\n';
      }
      if (analysis.finalReview.legalConsiderations) {
        finalReviewText += `Legal Considerations:\n${analysis.finalReview.legalConsiderations}`;
      }
    }

    // Create metadata object
    const analysisMetadata = {
      model: 'gpt-4o',
      timestamp: new Date().toISOString(),
      version: '2.0',
      temperature: 0.3,
      wordCount: analysis.combinedReport ? analysis.combinedReport.split(/\s+/).length : 0
    };

    // Update incident_reports record with AI analysis fields
    const updateData = {
      voice_transcription: transcription,
      analysis_metadata: analysisMetadata,
      quality_review: qualityReviewText,
      ai_summary: aiSummary,
      closing_statement: analysis.combinedReport,  // HTML narrative for Page 15
      final_review: finalReviewText
    };

    const { data, error } = await supabase
      .from('incident_reports')
      .update(updateData)
      .eq('id', incidentId)
      .select();

    if (error) {
      // Log error but don't fail the analysis request
      logger.warn('Failed to store AI analysis in incident_reports (non-critical)', {
        error: error.message,
        userId,
        incidentId
      });
    } else {
      logger.success('AI analysis stored in incident_reports table', {
        incidentId,
        userId,
        fieldsUpdated: Object.keys(updateData),
        wordCount: analysisMetadata.wordCount
      });
    }

    // ALSO store in ai_analysis table for audit trail (optional)
    const auditData = {
      create_user_id: userId,
      incident_id: incidentId,
      transcription_text: transcription,
      summary: analysis.summary,
      key_points: analysis.keyPoints,
      fault_analysis: analysis.faultAnalysis,
      quality_review: analysis.review,
      combined_report: analysis.combinedReport,
      completeness_score: analysis.finalReview?.completenessScore,
      final_review: analysis.finalReview,
      created_at: new Date().toISOString()
    };

    await supabase
      .from('ai_analysis')
      .insert([auditData])
      .select();
    // Ignore errors - audit trail is non-critical

  } catch (error) {
    logger.warn('Error storing AI analysis (non-critical)', { error: error.message });
  }
}

/**
 * Save personal statement to ai_transcription table
 * POST /api/incident-reports/save-statement
 */
async function savePersonalStatement(req, res) {
  try {
    const { userId, incidentId, personalStatement, accidentNarrative, voiceTranscription } = req.body;

    // Validate inputs
    if (!userId) {
      return sendError(res, 400, 'User ID is required', 'MISSING_USER_ID');
    }

    if (!personalStatement || personalStatement.trim().length === 0) {
      return sendError(res, 400, 'Personal statement is required', 'MISSING_STATEMENT');
    }

    logger.info('Saving personal statement', {
      userId,
      incidentId,
      textLength: personalStatement.length
    });

    // Verify user exists (check both auth.users and user_signup)
    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('create_user_id')
      .eq('create_user_id', userId)
      .maybeSingle();

    if (userError) {
      logger.error('Error checking user existence', {
        error: userError.message,
        code: userError.code,
        userId
      });
      // Continue anyway - user might be in auth.users but not user_signup yet
    }

    if (!userData) {
      logger.warn('User not found in user_signup table, proceeding anyway', { userId });
    }

    // Check if a transcription already exists for this user/incident
    const { data: existingData, error: checkError } = await supabase
      .from('ai_transcription')
      .select('id')
      .eq('create_user_id', userId)
      .maybeSingle(); // Use maybeSingle instead of single to handle no rows gracefully

    if (checkError) {
      logger.error('Error checking existing transcription', {
        error: checkError.message,
        code: checkError.code,
        userId,
        incidentId
      });
      // Continue anyway - we'll try to create a new one
    }

    // If transcription exists, update it; otherwise create new one
    if (existingData) {
      logger.info('Updating existing transcription', { transcriptionId: existingData.id });

      const { data, error } = await supabase
        .from('ai_transcription')
        .update({
          transcript_text: personalStatement,
          narrative_text: accidentNarrative || null,
          voice_transcription: voiceTranscription || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData.id)
        .select();

      if (error) {
        logger.error('Failed to update statement', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Database update failed: ${error.message}`);
      }

      logger.success('Personal statement updated', { transcriptionId: existingData.id });

      return res.json({
        success: true,
        message: 'Personal statement updated successfully',
        transcriptionId: existingData.id,
        incidentId: incidentId
      });

    } else {
      logger.info('Creating new transcription record');

      // Create new transcription record
      const { data, error } = await supabase
        .from('ai_transcription')
        .insert([{
          create_user_id: userId,
          transcript_text: personalStatement,
          narrative_text: accidentNarrative || null,
          voice_transcription: voiceTranscription || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        logger.error('Failed to create transcription', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          userId,
          incidentId
        });
        throw new Error(`Database insert failed: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from insert operation');
      }

      logger.success('New transcription created', { transcriptionId: data[0].id });

      return res.json({
        success: true,
        message: 'Personal statement saved successfully',
        transcriptionId: data[0].id,
        incidentId: incidentId
      });
    }

  } catch (error) {
    logger.error('Save statement error', {
      error: error.message,
      stack: error.stack,
      userId: req.body?.userId,
      incidentId: req.body?.incidentId
    });

    // Return more detailed error message
    const errorMessage = error.message || 'Failed to save statement';
    sendError(res, 500, errorMessage, 'SAVE_ERROR');
  }
}

/**
 * Get existing AI analysis for an incident
 * GET /api/ai/analysis/:incidentId
 */
async function getAnalysis(req, res) {
  try {
    const { incidentId } = req.params;

    if (!incidentId) {
      return sendError(res, 400, 'Incident ID is required', 'MISSING_INCIDENT_ID');
    }

    logger.info('Fetching AI analysis', { incidentId });

    // Fetch stored analysis from incident_reports table
    const { data, error } = await supabase
      .from('incident_reports')
      .select(`
        voice_transcription,
        analysis_metadata,
        quality_review,
        ai_summary,
        closing_statement,
        final_review
      `)
      .eq('id', incidentId)
      .is('deleted_at', null)
      .single();

    if (error) {
      logger.error('Failed to fetch analysis', { error: error.message, incidentId });
      return sendError(res, 404, 'Incident not found', 'INCIDENT_NOT_FOUND');
    }

    // Check if analysis exists
    if (!data.ai_summary && !data.closing_statement) {
      logger.info('No analysis found for incident', { incidentId });
      return res.json({
        success: true,
        analysis: null,
        message: 'No analysis available yet'
      });
    }

    // Reconstruct analysis object from stored data
    const analysis = reconstructAnalysisObject(data);

    logger.success('AI analysis retrieved', {
      incidentId,
      hasAnalysis: !!analysis,
      wordCount: analysis.combinedReport ? analysis.combinedReport.split(/\s+/).length : 0
    });

    res.json({
      success: true,
      analysis: analysis
    });

  } catch (error) {
    logger.error('Get analysis error', {
      error: error.message,
      stack: error.stack,
      incidentId: req.params?.incidentId
    });
    sendError(res, 500, 'Failed to retrieve analysis', 'RETRIEVAL_ERROR');
  }
}

/**
 * Reconstruct analysis object from database columns
 * Reverses the storage format used by storeAIAnalysis()
 */
function reconstructAnalysisObject(data) {
  const analysis = {};

  // Extract summary and key points from ai_summary
  if (data.ai_summary) {
    const summaryParts = data.ai_summary.split('\n\nKey Points:\n');
    analysis.summary = summaryParts[0] || '';

    if (summaryParts.length > 1) {
      // Parse key points from bullet list
      analysis.keyPoints = summaryParts[1]
        .split('\n')
        .filter(line => line.trim().startsWith('•'))
        .map(line => line.replace(/^•\s*/, '').trim());
    } else {
      analysis.keyPoints = [];
    }
  }

  // Reconstruct review object from quality_review
  if (data.quality_review) {
    analysis.review = {
      quality: data.quality_review,
      missingInfo: [],
      suggestions: []
    };
  }

  // Add combined report (Page 14 narrative)
  if (data.closing_statement) {
    analysis.combinedReport = data.closing_statement;
  }

  // Reconstruct final review from final_review text
  if (data.final_review) {
    analysis.finalReview = parseFinalReview(data.final_review);
  }

  return analysis;
}

/**
 * Parse final_review text back into structured object
 */
function parseFinalReview(finalReviewText) {
  const finalReview = {};

  // Extract strengths section
  const strengthsMatch = finalReviewText.match(/Strengths:\n([\s\S]*?)\n\nNext Steps:/);
  if (strengthsMatch) {
    finalReview.strengths = strengthsMatch[1].trim();
  }

  // Extract next steps
  const nextStepsMatch = finalReviewText.match(/Next Steps:\n([\s\S]*?)\n\nLegal Considerations:/);
  if (nextStepsMatch) {
    finalReview.nextSteps = nextStepsMatch[1]
      .split('\n')
      .filter(line => line.match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').trim());
  }

  // Extract legal considerations
  const legalMatch = finalReviewText.match(/Legal Considerations:\n([\s\S]*?)$/);
  if (legalMatch) {
    finalReview.legalConsiderations = legalMatch[1].trim();
  }

  return finalReview;
}

module.exports = {
  analyzeStatement,
  savePersonalStatement,
  getAnalysis
};
