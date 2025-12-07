/**
 * AI Controller - Car Crash Lawyer AI
 * Handles AI-powered analysis of personal statements
 * ✅ Uses OpenAI GPT for comprehensive analysis
 * ✅ Two-Phase Architecture (Migration 028):
 *    - Phase 1: Generate form_data_summary when pages 1-12 submitted (gpt-4o-mini)
 *    - Phase 2: Blend form_data_summary + transcription into comprehensive analysis (gpt-4o)
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
  witnesses = [],
  formDataSummary = null  // NEW: Phase 1 form data summary
) {
  try {
    const startTime = Date.now();

    // Step 1: Generate Blended Summary (Phase 2 - combines Phase 1 summary with transcription)
    logger.info('[AI Analysis] Step 1/4: Generating blended summary (form data + transcription)...');

    // Use blended prompt if Phase 1 summary exists, otherwise fall back to transcription-only
    const summaryPrompt = formDataSummary
      ? `Create a comprehensive incident summary that integrates structured form data with the client's personal voice account.

FORM DATA SUMMARY (Phase 1 - Pages 1-12):
"""
${formDataSummary}
"""

PERSONAL VOICE TRANSCRIPTION:
"""
${transcription}
"""

TASK:
Generate a unified comprehensive summary that:
1. Integrates objective form data with personal testimony
2. Uses form data to provide precise details (dates, times, registration numbers, witnesses)
3. Uses voice account to add personal perspective, emotional context, and event sequence
4. Clearly distinguishes form-documented facts from personal testimony when they differ
5. Creates a coherent narrative that solicitors can use for legal assessment

OUTPUT FORMAT (JSON):
{
  "summary": "2-3 sentence comprehensive overview integrating both sources",
  "keyPoints": ["5-8 bullet points covering: incident facts, conditions, vehicles, injuries, emergency response, witnesses, insurance, fault assessment"],
  "faultAnalysis": "1-2 sentences analyzing fault based on BOTH form assessment and personal account",
  "dataQuality": "Brief note on how well form data and voice account complement each other"
}

CRITICAL: Blend both sources seamlessly. When form data provides specific facts (e.g., "incident occurred at 14:30 on 15/03/2024"), integrate that with personal testimony about the experience.`
      : `Analyze this car accident personal statement and extract factual information.

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
        {
          role: 'system',
          content: formDataSummary
            ? 'You are a legal documentation assistant who integrates structured form data with personal testimony to create comprehensive incident summaries for UK solicitors.'
            : 'You are a legal documentation assistant who analyzes car accident statements and extracts factual information objectively.'
        },
        { role: 'user', content: summaryPrompt }
      ],
      temperature: 0.3,  // Reduced for factual accuracy
      response_format: { type: 'json_object' }
    });

    const summaryData = JSON.parse(summaryResponse.choices[0].message.content);
    logger.info('[AI Analysis] Step 1/4 complete', {
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      keyPointsCount: summaryData.keyPoints?.length || 0,
      blendedAnalysis: !!formDataSummary  // Track whether we used Phase 2 blended approach
    });

    // Step 2: Generate Quality Review (considers both form data and transcription)
    logger.info('[AI Analysis] Step 2/4: Generating quality review...');

    const reviewPrompt = formDataSummary
      ? `Review comprehensive accident documentation that combines structured form data with personal testimony.

FORM DATA SUMMARY (Phase 1 - Pages 1-12):
"""
${formDataSummary}
"""

PERSONAL VOICE TRANSCRIPTION:
"""
${transcription}
"""

Assess the quality of this dual-source documentation:
1. Quality assessment (2-3 sentences about how well form data and personal testimony complement each other)
2. Missing critical information (list specific items not adequately covered by EITHER source: exact date/time, precise location, weather conditions, injuries detail, vehicle damage specifics, witness information, police attendance, etc.)
3. Data consistency (note any discrepancies between form data and personal account)
4. Suggestions for improvement (3-5 specific items to strengthen the documentation)

Format as JSON:
{
  "quality": "Assessment of documentation completeness considering both sources",
  "missingInfo": ["Items not covered by either form data or transcription"],
  "dataConsistency": "Note on how well both sources align (or flag any discrepancies)",
  "suggestions": ["Specific improvements for more complete records"]
}`
      : `Review a car accident statement for completeness and identify missing information.

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
        {
          role: 'system',
          content: formDataSummary
            ? 'You review accident documentation to assess how well structured form data and personal testimony complement each other, identifying gaps and inconsistencies.'
            : 'You review accident documentation to identify completeness and missing factual information.'
        },
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

      // Use form_data_summary when available for token optimization (20-30% reduction)
      const closingStatementPrompt = formDataSummary
        ? `Document a comprehensive factual account of a UK road traffic accident integrating structured form data with personal testimony.

This narrative will form the centre piece of the legal document (Page 14 - Comprehensive Factual Narrative).

FORM DATA SUMMARY (Phase 1 - Pages 1-12):
"""
${formDataSummary}
"""

PERSONAL VOICE TRANSCRIPTION:
"""
${transcription}
"""

INSTRUCTIONS:
1. Write in third person, past tense
2. Create a flowing factual narrative (800-1200 words) that integrates both data sources
3. Use professional British legal language (solicitor, claim, A&E, third party)
4. Use form data summary for precise facts (dates, times, registration numbers, insurance details)
5. Use voice transcription to add personal perspective, event sequence, and emotional context
6. Structure logically: Introduction → Incident Details → Environmental Conditions → Vehicles Involved → Injuries/Medical → Emergency Response → Witnesses/Evidence → Insurance & Fault Assessment → Summary
7. State facts objectively and sincerely - this is legal documentation
8. Flag any discrepancies between form data and personal account
9. Do NOT add speculation or information not provided in either source
10. Format with proper paragraphs using <p> tags
11. Ensure every factual claim is supported by provided data
12. Maintain sincere, factual tone - record only what is documented

Provide a complete, accurate record integrating structured form data with personal testimony.`
        : `Document a comprehensive factual account of a traffic accident.

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
            content: formDataSummary
              ? 'You are a legal documentation specialist who integrates structured form data with personal testimony to create comprehensive factual narratives for UK personal injury claims. You blend objective form data with personal accounts while maintaining factual accuracy and sincerity.'
              : 'You document traffic accidents by recording factual information clearly and accurately. You present only the facts provided, maintaining objectivity and sincerity throughout.'
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

    // Use blended assessment when formDataSummary exists
    const finalReviewPrompt = formDataSummary
      ? `Review comprehensive UK road traffic accident documentation and provide expert guidance to the client.

FORM DATA SUMMARY (Phase 1 - Structured Data from Pages 1-12):
"""
${formDataSummary}
"""

PERSONAL VOICE TRANSCRIPTION:
"""
${transcription}
"""

${otherVehicles.length > 0 ? `Other Vehicles Involved: ${otherVehicles.length}` : ''}
${witnesses.length > 0 ? `Witnesses Documented: ${witnesses.length}` : ''}

ASSESSMENT TASK:
Evaluate the completeness and quality of this dual-source documentation (structured form data + personal testimony) and provide actionable guidance.

Provide:
1. Completeness score (0-100) - Assess how well both sources complement each other and cover all critical legal requirements
2. Strengths (2-4 bullet points) - Highlight what's well-documented across BOTH sources (use <ul><li> HTML format)
3. Recommended next steps (5-8 specific, prioritized UK legal action items) - Clear actionable steps based on gaps identified
4. Legal considerations (2-4 important UK legal points specific to this case) - Use <p> HTML format

SCORING GUIDANCE:
- 90-100: Exceptional documentation with structured data AND personal testimony covering all legal requirements
- 75-89: Strong documentation, minor gaps or discrepancies between sources
- 60-74: Adequate documentation but missing key details in one or both sources
- 40-59: Significant gaps in documentation requiring immediate action
- 0-39: Critical information missing from both sources

Format as JSON:
{
  "completenessScore": 85,
  "strengths": "<ul><li>Comprehensive structured form data with precise incident details</li><li>Personal testimony adds valuable context and event sequence</li><li>Both sources align on key facts</li></ul>",
  "nextSteps": [
    "Seek immediate medical evaluation if not already completed, even for delayed symptoms",
    "Obtain official police report (crime reference number documented: XXX)",
    "Document all ongoing medical treatment and expenses with receipts",
    "Collect additional photographic evidence of vehicle damage",
    "Obtain formal witness statements (3 witnesses documented)",
    "Notify insurance company within required timeframe",
    "Do not admit fault or discuss case details on social media",
    "Consult with a personal injury solicitor specializing in road traffic accidents"
  ],
  "legalConsiderations": "<p>UK law requires notification to insurers within reasonable time regardless of fault. The documented policy details should facilitate this process.</p><p>Medical evidence is crucial for personal injury claims - ensure all treatments and symptoms are formally documented by medical professionals.</p><p>The documented environmental conditions and third-party fault indicators strengthen the liability case.</p>"
}`
      : `Review the car accident documentation and provide guidance to the client.

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
          content: formDataSummary
            ? 'You are a UK personal injury legal advisor who evaluates comprehensive accident documentation from multiple sources (structured form data + personal testimony). You assess documentation completeness, identify gaps, and provide specific actionable guidance based on UK legal requirements.'
            : 'You provide clear, actionable guidance to UK traffic accident victims based on standard legal procedures and documentation requirements.'
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
 * Helper function to build weather conditions array from individual boolean columns
 * Converts boolean weather_* columns to readable array
 */
function buildWeatherArray(incidentData) {
  const conditions = [];
  if (incidentData.weather_bright_sunlight) conditions.push('Bright Sunlight');
  if (incidentData.weather_clear) conditions.push('Clear');
  if (incidentData.weather_cloudy) conditions.push('Cloudy');
  if (incidentData.weather_raining) conditions.push('Raining');
  if (incidentData.weather_heavy_rain) conditions.push('Heavy Rain');
  if (incidentData.weather_drizzle) conditions.push('Drizzle');
  if (incidentData.weather_fog) conditions.push('Fog');
  if (incidentData.weather_snow) conditions.push('Snow');
  if (incidentData.weather_ice) conditions.push('Ice');
  if (incidentData.weather_windy) conditions.push('Windy');
  if (incidentData.weather_hail) conditions.push('Hail');
  if (incidentData.weather_thunder_lightning) conditions.push('Thunder/Lightning');
  return conditions.length > 0 ? conditions.join(', ') : null;
}

/**
 * Helper function to build medical symptoms array from individual boolean columns
 * Converts boolean medical_symptom_* columns to readable array
 */
function buildMedicalSymptomsArray(incidentData) {
  const symptoms = [];
  if (incidentData.medical_symptom_chest_pain) symptoms.push('Chest Pain');
  if (incidentData.medical_symptom_uncontrolled_bleeding) symptoms.push('Uncontrolled Bleeding');
  if (incidentData.medical_symptom_breathlessness) symptoms.push('Breathlessness');
  if (incidentData.medical_symptom_limb_weakness) symptoms.push('Limb Weakness');
  if (incidentData.medical_symptom_loss_of_consciousness) symptoms.push('Loss of Consciousness');
  if (incidentData.medical_symptom_severe_headache) symptoms.push('Severe Headache');
  if (incidentData.medical_symptom_change_in_vision) symptoms.push('Change in Vision');
  if (incidentData.medical_symptom_abdominal_pain) symptoms.push('Abdominal Pain');
  if (incidentData.medical_symptom_abdominal_bruising) symptoms.push('Abdominal Bruising');
  if (incidentData.medical_symptom_limb_pain_mobility) symptoms.push('Limb Pain/Mobility Issues');
  if (incidentData.medical_symptom_dizziness) symptoms.push('Dizziness');
  if (incidentData.medical_symptom_life_threatening) symptoms.push('Life-Threatening Condition');
  if (incidentData.medical_symptom_none) symptoms.push('No Symptoms');
  return symptoms.length > 0 ? symptoms.join(', ') : null;
}

/**
 * Helper function to build road conditions array from individual boolean columns
 * Converts boolean road_condition_* columns to readable array
 */
function buildRoadConditionsArray(incidentData) {
  const conditions = [];
  if (incidentData.road_condition_dry) conditions.push('Dry');
  if (incidentData.road_condition_wet) conditions.push('Wet');
  if (incidentData.road_condition_icy) conditions.push('Icy');
  if (incidentData.road_condition_snow_covered) conditions.push('Snow Covered');
  if (incidentData.road_condition_loose_surface) conditions.push('Loose Surface');
  if (incidentData.road_condition_slush_on_road) conditions.push('Slush on Road');
  return conditions.length > 0 ? conditions.join(', ') : null;
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
      weather: buildWeatherArray(incidentData) || 'Not specified',
      lighting: incidentData.lighting_conditions || null,
      roadSurface: buildRoadConditionsArray(incidentData) || null,
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
      injuries: buildMedicalSymptomsArray(incidentData) || incidentData.medical_how_are_you_feeling || null,
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

/**
 * Generate Phase 1 AI Summary: Form Data Summary (BEFORE transcription)
 *
 * This function generates a comprehensive factual summary of the structured form data
 * collected from pages 1-12. It runs when the form submission completes, BEFORE the
 * user provides their voice transcription.
 *
 * Purpose: Create a foundation summary that will later be blended with the personal
 * voice account in Phase 2 (when transcription is completed).
 *
 * @param {string} userId - Supabase Auth user ID
 * @param {string} incidentId - Incident report ID
 * @returns {Promise<Object>} Generated form data summary with metadata
 */
async function generateFormDataSummary(userId, incidentId) {
  logger.info(`[Phase 1 AI] Starting form data summary generation for incident ${incidentId}`);

  try {
    // Step 1: Fetch data from all 3 tables
    logger.info('[Phase 1 AI] Fetching incident data from database...');

    const { data: incidentData, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('id', incidentId)
      .eq('create_user_id', userId)
      .single();

    if (incidentError) throw incidentError;
    if (!incidentData) throw new Error('Incident report not found');

    // Fetch other vehicles
    const { data: otherVehicles, error: vehiclesError } = await supabase
      .from('incident_other_vehicles')
      .select('*')
      .eq('create_user_id', userId)
      .order('vehicle_index', { ascending: true });

    if (vehiclesError) throw vehiclesError;

    // Fetch witnesses
    const { data: witnesses, error: witnessesError } = await supabase
      .from('incident_witnesses')
      .select('*')
      .eq('create_user_id', userId)
      .order('witness_index', { ascending: true });

    if (witnessesError) throw witnessesError;

    // Step 2: Build comprehensive data structure (160+ fields)
    logger.info('[Phase 1 AI] Building comprehensive data structure...');
    const comprehensiveData = buildComprehensiveIncidentData(
      incidentData,
      otherVehicles || [],
      witnesses || []
    );

    // Step 3: Generate form data summary using GPT-4o-mini
    logger.info('[Phase 1 AI] Calling OpenAI GPT-4o-mini for form data summary...');

    const formDataSummaryPrompt = `Document a comprehensive factual summary of a UK road traffic accident based on structured form data.

You are a legal documentation assistant preparing a foundation summary for solicitors reviewing a personal injury claim. This summary captures all form-documented facts before the client's personal voice account is added.

STRUCTURED INCIDENT DATA (160+ fields from pages 1-12):
${JSON.stringify(comprehensiveData, null, 2)}

INSTRUCTIONS:
1. Generate a professional factual summary of 400-600 words (5-7 structured paragraphs)
2. Use British English terminology throughout (solicitor, claim, number plate, A&E, third party)
3. Format dates as DD/MM/YYYY and times in 24-hour format
4. Structure logically with clear topic paragraphs:
   - Paragraph 1: Incident overview (date, time, location, what3words, road type)
   - Paragraph 2: Environmental conditions (weather, lighting, road surface, visibility, traffic density)
   - Paragraph 3: Vehicles involved (user vehicle + other vehicles - make, model, registration, damage)
   - Paragraph 4: Medical information (injuries, symptoms, hospital attendance, treatment)
   - Paragraph 5: Emergency response (police attendance, crime reference, breathalyzer, ambulance)
   - Paragraph 6: Witnesses and evidence (witness details, dashcam, photographs)
   - Paragraph 7: Insurance and fault assessment (insurers, policy numbers, fault opinion, contributing factors)
5. State only documented facts - if information is missing, write "Not documented" rather than inferring
6. Use precise numeric data (speed limits, number of occupants, vehicle counts)
7. Reference specific field names when documenting critical facts (e.g., "dashcamPresent: true")
8. Maintain neutral, factual tone suitable for legal documentation
9. Include all relevant insurance details (policy numbers, insurer names, claim numbers)
10. Document all parties involved with complete details (names, contact info, registration numbers)

OUTPUT FORMAT:
Return a single comprehensive text summary in paragraph form. Do NOT use JSON or structured data - just flowing prose organized into 5-7 clear paragraphs as described above.

CRITICAL REQUIREMENTS:
- Use ONLY information present in the structured data
- Never infer, assume, or add details not explicitly provided
- If a field is null, undefined, or empty, skip it or state "Not documented"
- Focus on facts that would be relevant to a personal injury solicitor
- Ensure all names, numbers, and dates are accurate
- British legal context: right to claim compensation, duty of care, negligence assessment`;

    const startTime = Date.now();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 10x cheaper than gpt-4o, suitable for structured data
      messages: [
        {
          role: 'system',
          content: 'You are a legal documentation assistant specializing in UK personal injury claims. Generate factual, professional summaries of road traffic accidents based on structured form data.'
        },
        {
          role: 'user',
          content: formDataSummaryPrompt
        }
      ],
      temperature: 0.3, // Low temperature for factual accuracy
      max_tokens: 1500, // 400-600 words ≈ 800-1200 tokens
    });

    const duration = Date.now() - startTime;
    const formDataSummary = completion.choices[0].message.content;

    logger.info(`[Phase 1 AI] Form data summary generated successfully (${duration}ms)`);

    // Step 4: Store in database with metadata
    logger.info('[Phase 1 AI] Storing form data summary in database...');

    const metadata = {
      model: completion.model,
      generatedAt: new Date().toISOString(),
      promptTokens: completion.usage.prompt_tokens,
      completionTokens: completion.usage.completion_tokens,
      totalTokens: completion.usage.total_tokens,
      durationMs: duration,
      phase: 'Phase 1: Form Data Summary',
      dataSource: 'incident_reports + incident_other_vehicles + incident_witnesses',
      fieldCount: Object.keys(comprehensiveData).length
    };

    const { error: updateError } = await supabase
      .from('incident_reports')
      .update({
        form_data_summary: formDataSummary,
        form_data_summary_metadata: metadata
      })
      .eq('id', incidentId)
      .eq('create_user_id', userId);

    if (updateError) throw updateError;

    logger.info('[Phase 1 AI] Form data summary stored successfully');
    logger.info(`[Phase 1 AI] Token usage - Prompt: ${metadata.promptTokens}, Completion: ${metadata.completionTokens}, Total: ${metadata.totalTokens}`);

    return {
      success: true,
      summary: formDataSummary,
      metadata,
      message: 'Phase 1 form data summary generated successfully'
    };

  } catch (error) {
    logger.error('[Phase 1 AI] Error generating form data summary:', error);

    // Store error in metadata for debugging
    const errorMetadata = {
      error: error.message,
      errorAt: new Date().toISOString(),
      phase: 'Phase 1: Form Data Summary',
      status: 'failed'
    };

    try {
      await supabase
        .from('incident_reports')
        .update({
          form_data_summary_metadata: errorMetadata
        })
        .eq('id', incidentId)
        .eq('create_user_id', userId);
    } catch (metadataError) {
      logger.error('[Phase 1 AI] Failed to store error metadata:', metadataError);
    }

    throw new Error(`Failed to generate form data summary: ${error.message}`);
  }
}

module.exports = {
  analyzeStatement,
  savePersonalStatement,
  getAnalysis,
  generateFormDataSummary // Export new Phase 1 function
};
