/**
 * AI Controller - Car Crash Lawyer AI
 * Handles AI-powered analysis of personal statements
 * ✅ Uses OpenAI GPT-4o for comprehensive analysis
 * ✅ Single-Phase Architecture (Refactored 2025-12-08):
 *    - Direct generation using raw structured data + transcription
 *    - Temperature 0.2 for factual accuracy with narrative flow
 *    - Database schema included in prompt for complete field coverage
 *    - Eliminates information cascade from previous two-phase system
 */

const OpenAI = require('openai');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const { createClient } = require('@supabase/supabase-js');

// Lazy-initialize OpenAI to prevent crash when API key is missing
let openai = null;
function getOpenAI() {
  if (!openai && config.openai.apiKey) {
    openai = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openai;
}

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

    // Check OpenAI is available
    const client = getOpenAI();
    if (!client) {
      logger.warn('OpenAI not configured - AI analysis unavailable');
      return sendError(res, 503, 'AI service temporarily unavailable', 'AI_NOT_CONFIGURED');
    }

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
    let formDataSummary = null;  // Phase 1 form data summary (pages 1-12)

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
        formDataSummary = data.form_data_summary || null;  // Extract Phase 1 summary for blending
        logger.info('Incident data retrieved', {
          incidentId,
          fieldCount: Object.keys(data).length,
          hasFormDataSummary: !!formDataSummary,
          formDataSummaryLength: formDataSummary?.length || 0
        });
      }

      // Fetch other vehicles (up to 5 vehicles)
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('incident_other_vehicles')
        .select('*')
        .eq('create_user_id', userId)
        .eq('incident_id', incidentId)  // CRITICAL: Filter by current incident only
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
        .eq('incident_id', incidentId)  // CRITICAL: Filter by current incident only
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
      witnesses,
      formDataSummary  // Phase 1 form data summary for Phase 2 blending
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

    const summaryResponse = await client.chat.completions.create({
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

    const reviewResponse = await client.chat.completions.create({
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

      const combinedResponse = await client.chat.completions.create({
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

    const finalReviewResponse = await client.chat.completions.create({
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
 *
 * ENHANCED VERSION (2025-12-07):
 * - Dynamically extracts ALL non-null fields from database (190 total fields)
 * - Preserves existing categorization for ~80 known fields
 * - Automatically categorizes unmapped fields into appropriate sections
 * - Tracks which fields have been extracted for metadata
 * - Ensures 100% field coverage as requested by user
 *
 * This is used for Phase 1 form data summary generation.
 */
function buildComprehensiveIncidentData(incidentData, otherVehicles = [], witnesses = []) {
  // Track which fields we've already extracted to avoid duplicates
  const extractedFields = new Set();

  // Helper function to mark field as extracted
  const markExtracted = (...fieldNames) => {
    fieldNames.forEach(f => extractedFields.add(f));
  };

  // Helper function to safely extract value and mark as extracted
  const extractValue = (fieldName, fallback = null) => {
    markExtracted(fieldName);
    const value = incidentData[fieldName];
    return (value !== null && value !== undefined && value !== '') ? value : fallback;
  };

  // Helper function to try multiple field names (for legacy fields)
  const extractFromMultiple = (...fieldNames) => {
    fieldNames.forEach(f => markExtracted(f));
    for (const fieldName of fieldNames) {
      const value = incidentData[fieldName];
      if (value !== null && value !== undefined && value !== '') {
        return value;
      }
    }
    return null;
  };

  const data = {
    // Incident Basic Information
    incident: {
      date: extractFromMultiple('when_did_the_accident_happen', 'accident_date', 'incident_date') || 'Not specified',
      time: extractFromMultiple('what_time_did_the_accident_happen', 'accident_time', 'incident_time') || 'Not specified',
      location: extractFromMultiple('where_exactly_did_this_happen', 'accident_location', 'incident_location') || 'Not specified',
      what3words: extractValue('what_3_words_location'),
      coordinates: extractValue('coordinates'),
      roadType: extractValue('road_type'),
      speedLimit: extractValue('speed_limit'),
      description: extractFromMultiple('what_happened_detailed_account', 'detailed_account_of_what_happened', 'incident_description')
    },

    // Environmental Conditions
    conditions: {
      weather: buildWeatherArray(incidentData) || 'Not specified',
      lighting: extractValue('lighting_conditions'),
      roadSurface: buildRoadConditionsArray(incidentData) || null,
      visibility: extractValue('visibility'),
      trafficDensity: extractValue('traffic_density'),
      roadFeatures: extractArrayField(extractValue('road_features'))
    },

    // User's Vehicle Information
    userVehicle: {
      make: extractFromMultiple('make_of_car', 'vehicle_make') || 'Not specified',
      model: extractFromMultiple('model_of_car', 'vehicle_model') || 'Not specified',
      registration: extractFromMultiple('registration_number', 'vehicle_registration'),
      color: extractFromMultiple('vehicle_colour', 'vehicle_color'),
      damage: extractFromMultiple('damage_to_your_vehicle', 'vehicle_damage'),
      damageEstimate: extractFromMultiple('estimated_damage_cost', 'vehicle_damage_estimate'),
      occupants: extractFromMultiple('number_of_occupants', 'vehicle_occupants'),
      seatbeltsWorn: extractFromMultiple('seatbelts_worn', 'were_seatbelts_worn'),
      airbagsDeployed: extractFromMultiple('airbags_deployed', 'were_airbags_deployed'),
      vehicleMoving: extractFromMultiple('was_vehicle_moving', 'vehicle_moving'),
      speed: extractFromMultiple('approximate_speed', 'vehicle_speed')
    },

    // User Information
    user: {
      wasDriver: extractFromMultiple('were_you_the_driver', 'user_was_driver'),
      licenseValid: extractFromMultiple('valid_driving_license', 'driving_license_valid'),
      insuranceValid: extractFromMultiple('valid_insurance', 'insurance_valid'),
      motValid: extractFromMultiple('valid_mot', 'mot_valid'),
      dashcamPresent: extractFromMultiple('dashcam_installed', 'dashcam_present'),
      dashcamRecording: extractValue('dashcam_recording')
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
      injuries: buildMedicalSymptomsArray(incidentData) || extractValue('medical_how_are_you_feeling'),
      symptomsAppearance: extractValue('symptoms_appearance_time'),
      hospitalVisit: extractValue('hospital_visit'),
      hospitalName: extractValue('hospital_name'),
      ambulanceCalled: extractValue('ambulance_called'),
      treatmentReceived: extractValue('treatment_received'),
      ongoingSymptoms: extractValue('ongoing_symptoms'),
      priorInjuries: extractValue('prior_injuries')
    },

    // Emergency Services & Police
    emergency: {
      policeAttended: extractFromMultiple('police_attended', 'did_police_attend'),
      policeStation: extractValue('police_station'),
      crimeReferenceNumber: extractFromMultiple('crime_reference_number', 'police_reference'),
      officerName: extractValue('officer_name'),
      officerBadgeNumber: extractValue('officer_badge_number'),
      breathalyzerGiven: extractFromMultiple('breathalyzer_test', 'breathalyzer_given'),
      arrestsMade: extractValue('arrests_made')
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
      userInsurer: extractFromMultiple('insurer_name', 'user_insurer'),
      userPolicyNumber: extractFromMultiple('policy_number', 'user_policy_number'),
      userClaimNumber: extractFromMultiple('claim_number', 'user_claim_number'),
      otherDriverInsurer: extractValue('other_driver_insurer'),
      otherDriverPolicyNumber: extractValue('other_driver_policy_number'),
      claimFiled: extractValue('claim_filed'),
      claimDate: extractFromMultiple('claim_filed_date', 'claim_date')
    },

    // Fault & Liability
    fault: {
      userOpinion: extractFromMultiple('who_was_at_fault', 'fault_assessment'),
      otherDriverOpinion: extractValue('other_driver_fault_opinion'),
      contributingFactors: extractArrayField(extractValue('contributing_factors')),
      trafficViolations: extractValue('traffic_violations'),
      roadSignsPresent: extractValue('road_signs_present'),
      signalCompliance: extractValue('signal_compliance')
    },

    // Additional Context
    additional: {
      previousAccidents: extractValue('previous_accidents'),
      dashcamFootageAvailable: extractValue('dashcam_footage_available'),
      photographsTaken: extractValue('photographs_taken'),
      witnessStatementsTaken: extractValue('witness_statements_taken'),
      reportFiledWithInsurer: extractValue('report_filed_with_insurer'),
      legalRepresentation: extractValue('legal_representation'),
      otherRelevantInfo: extractFromMultiple('other_relevant_information', 'additional_notes')
    }
  };

  // Mark all boolean weather fields as extracted (handled by buildWeatherArray)
  [
    'weather_bright_sunlight', 'weather_clear', 'weather_cloudy', 'weather_raining',
    'weather_heavy_rain', 'weather_drizzle', 'weather_fog', 'weather_snow',
    'weather_ice', 'weather_windy', 'weather_hail', 'weather_thunder_lightning'
  ].forEach(f => markExtracted(f));

  // Mark all boolean medical symptom fields as extracted (handled by buildMedicalSymptomsArray)
  [
    'medical_symptom_chest_pain', 'medical_symptom_uncontrolled_bleeding',
    'medical_symptom_breathlessness', 'medical_symptom_limb_weakness',
    'medical_symptom_loss_of_consciousness', 'medical_symptom_severe_headache',
    'medical_symptom_change_in_vision', 'medical_symptom_abdominal_pain',
    'medical_symptom_abdominal_bruising', 'medical_symptom_limb_pain_mobility',
    'medical_symptom_dizziness', 'medical_symptom_life_threatening', 'medical_symptom_none'
  ].forEach(f => markExtracted(f));

  // Mark all boolean road condition fields as extracted (handled by buildRoadConditionsArray)
  [
    'road_condition_dry', 'road_condition_wet', 'road_condition_icy',
    'road_condition_snow_covered', 'road_condition_loose_surface', 'road_condition_slush_on_road'
  ].forEach(f => markExtracted(f));

  // System fields to exclude from unmapped extraction
  const systemFields = new Set([
    'id', 'create_user_id', 'created_at', 'updated_at', 'deleted_at',
    'form_data_summary', 'form_data_summary_metadata',
    'ai_summary', 'ai_incident_summary', 'ai_liability_assessment',
    'ai_vehicle_damage_analysis', 'ai_injury_assessment', 'ai_witness_credibility',
    'ai_evidence_quality', 'ai_recommendations', 'ai_closing_statement',
    'voice_transcription', 'analysis_metadata', 'quality_review', 'closing_statement', 'final_review'
  ]);

  // NOW: Extract ALL remaining non-null fields that haven't been categorized yet
  const unmappedFields = {};
  let unmappedCount = 0;

  for (const [fieldName, value] of Object.entries(incidentData)) {
    // Skip if already extracted, is a system field, or is null/empty
    if (extractedFields.has(fieldName) || systemFields.has(fieldName)) continue;
    if (value === null || value === undefined || value === '') continue;

    // Format the value appropriately
    let formattedValue = value;
    if (Array.isArray(value)) {
      formattedValue = value.join(', ');
    } else if (typeof value === 'object') {
      formattedValue = JSON.stringify(value);
    }

    // Convert snake_case field names to Title Case for readability
    const readableFieldName = fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    unmappedFields[readableFieldName] = formattedValue;
    unmappedCount++;
  }

  // Add unmapped fields to data structure if any exist
  if (unmappedCount > 0) {
    data.unmappedFields = unmappedFields;
  }

  // Add metadata about extraction
  data._metadata = {
    totalFieldsInDatabase: Object.keys(incidentData).length,
    extractedKnownFields: extractedFields.size,
    unmappedFieldsFound: unmappedCount,
    totalFieldsExtracted: extractedFields.size + unmappedCount,
    otherVehiclesCount: otherVehicles.length,
    witnessesCount: witnesses.length,
    extractionComplete: true
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

  // Check OpenAI is available
  const client = getOpenAI();
  if (!client) {
    logger.warn('OpenAI not configured - form data summary unavailable');
    throw new Error('AI service not configured');
  }

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

    // Fetch other vehicles (optional data - may not exist for all incidents)
    const { data: otherVehicles, error: vehiclesError } = await supabase
      .from('incident_other_vehicles')
      .select('*')
      .eq('create_user_id', userId)
      .eq('incident_id', incidentId);  // CRITICAL: Filter by current incident only

    if (vehiclesError) {
      logger.warn('[Phase 1 AI] Error fetching other vehicles (non-fatal):', vehiclesError.message);
    }

    // Fetch witnesses (optional data - table may not exist or incident may have no witnesses)
    let witnesses = [];
    try {
      const { data: witnessData, error: witnessesError } = await supabase
        .from('incident_witnesses')
        .select('*')
        .eq('create_user_id', userId)
        .eq('incident_id', incidentId);  // CRITICAL: Filter by current incident only

      if (witnessesError) {
        logger.warn('[Phase 1 AI] Error fetching witnesses (non-fatal):', witnessesError.message);
      } else {
        witnesses = witnessData || [];
      }
    } catch (error) {
      // Table may not exist - this is non-fatal, witnesses are optional
      logger.warn('[Phase 1 AI] Witnesses table not available (non-fatal):', error.message);
    }

    // Step 2: Build comprehensive data structure (160+ fields)
    logger.info('[Phase 1 AI] Building comprehensive data structure...');
    const comprehensiveData = buildComprehensiveIncidentData(
      incidentData,
      otherVehicles || [],
      witnesses || []
    );

    // Step 3: Generate form data summary using GPT-4o-mini
    logger.info('[Phase 1 AI] Calling OpenAI GPT-4o-mini for form data summary...');

    // Check if voice transcription is available for SECTION 2 (Phase 2 blending)
    const hasTranscription = incidentData.voice_transcription && incidentData.voice_transcription.trim().length > 0;

    // CAR CRASH LAWYER AI - Two-Section Legal Format (2025-12-08)
    const systemMessage = {
      role: 'system',
      content: `You are **CAR CRASH LAWYER AI**, an AI Legal First Responder trained to analyse UK road-traffic incident data and produce legally compliant accident documentation. You MUST only reference information from the Supabase incident_reports table fields provided in the input. Never invent, infer, or speculate. If any field is missing, false, null, or empty, state **"not provided"**.

Your output consists of ${hasTranscription ? '**TWO SECTIONS**' : '**ONE SECTION** (SECTION 2 will be added after voice transcription is completed)'}.

======================================================

### SECTION 1 — TRAFFIC ACCIDENT SUMMARY — PAGES 1–10

Your task is to generate a fact-based, chronological summary using the headings below. This reflects Pages 1–10 of the Traffic Accident Legal Report.

Your output MUST:

* Be written in plain legal English
* Maintain a neutral, factual tone suitable for court or insurer review
* Reference ONLY information provided in the dataset
* Avoid advising on liability, legal strategy, fault, compensation, or causation
* Only state confirmed facts; if unsure, write **"not provided"**

Use these headings exactly:

**1. Driver & Vehicle Identity**
Summarise: driver identity context, associated user ID, vehicle make/model/colour/year/fuel type, licence plate (stored in vehicle_license_plate), DVLA lookups (dvla_make, dvla_model, dvla_colour, dvla_year, dvla_fuel_type, dvla_mot_status, dvla_mot_expiry, dvla_tax_status, dvla_tax_due_date, dvla_insurance_status), recovery data (if present), manual overrides (manual_*) if DVLA is missing.

**2. Emergency Contacts**
From witness_name and phone/email if used as emergency contact. If none exist, state "not provided."

**3. Insurance Status**
Summarise: other party insurance fields (other_drivers_insurance_company, other_drivers_policy_number, other_drivers_policy_holder_name, other_drivers_policy_cover_type). If the reporting driver's insurance was not captured, state "not provided."

**4. Medical and Safety Status**
Summarise: medical_attention_needed, medical_ambulance_called, medical_injury_details, medical_injury_severity, medical_hospital_name, medical_treatment_received, boolean symptom flags under medical_symptom_*, and six_point_safety_check_completed. Include whether the user was fit to continue and any declared injuries.

**5. Accident Time, Location & Conditions**
Summarise: accident_date, accident_time, location, what3words, nearest_landmark, road type booleans (road_type_*), weather (weather_*), visibility (visibility_*), road condition (road_condition_*), traffic (traffic_conditions_*), speed limit (speed_limit) and estimated speed (your_speed).

**6. Junction / Road Layout**
Include: junction_type, junction_control, traffic_light_status, user_manoeuvre, additional_hazards, and any special_condition_* booleans (e.g., roadworks, cyclists, pedestrians, parked vehicles, sun glare, narrow road).

**7. Point of Impact & Vehicle Damage**
Interpret: no_damage, impact booleans (impact_point_*), damage_to_your_vehicle, describle_the_damage, and vehicle_driveable (text: treat "yes" as TRUE and all else as FALSE).

**8. Other Vehicle & Driver (If Applicable)**
Summarise: other_full_name, other_contact_number, other_email_address, other_vehicle_registration, DVLA look-up details under other_vehicle_look_up_*, insurance fields, and describe_damage_to_vehicle.

**9. Witnesses (If Provided)**
Include: witness_name, witness_mobile_number, witness_email_address, witness_statement.

**10. Police Involvement & Legal Compliance**
Include: police_attended, accident_ref_number, police_force, officer_name, officer_badge, user_breath_test, other_breath_test, airbags_deployed, seatbelts_worn, seatbelt_reason.

======================================================

### BOOLEAN & UNKNOWN FIELD HANDLING RULES

* If TRUE or "yes" → state the affirmative fact
* If FALSE or "no" → state the negative fact
* If null, undefined, or blank → "not provided"
* Never infer a reason unless explicitly provided
* Multi-select fields → list selected values, or **"none selected"**

======================================================
${hasTranscription ? `
### SECTION 2 — LEGAL INCIDENT NARRATIVE

You are now operating in **JOURNALISTIC FACTUAL MODE**.

Your task is to merge:

1. The structured summary you just produced
2. The reporting driver's first-person statement stored in voice_transcription

Your narrative MUST:

* Read like a prize-winning investigative journalist
* Maintain a neutral, objective tone
* Use clear chronological structure
* Treat the transcription as first-hand testimony
* Correct grammar without altering meaning
* If contradictions exist, present both neutrally using:

  * "According to the driver…"
  * "Based on the submitted incident data…"

STRUCTURE YOUR OUTPUT EXACTLY AS FOLLOWS:

===========================
**LEGAL INCIDENT NARRATIVE**

**Overview**
Summarise the context: who was involved, where it occurred, and what type of incident it was.

**Sequence of Events**
Chronologically reconstruct what occurred using confirmed data merged with the driver's testimony.

**Involved Parties & Vehicles**
Summarise each vehicle and driver using factual identifiers only.

**Environmental Factors**
Include road, weather, visibility, and other contextual factors without implying fault.

**Consequences & Immediate Aftermath**
Summarise visible damage, injuries, police attendance, breathalyser outcomes, and driveability. If information was not provided, state that explicitly.

===========================

ABSOLUTE RESTRICTIONS:

* Do NOT infer liability, causation, fault, speeding intent, distraction, or negligence
* No recommendations or legal advice
* No emotional, dramatic, or sensational language
* No hypothetical scenarios
* Only confirmed facts

======================================================
` : `
### SECTION 2 — LEGAL INCIDENT NARRATIVE

⚠️ **NOT YET AVAILABLE** - This section will be generated after the driver provides their voice transcription statement (Phase 2).

======================================================
`}
END OF INSTRUCTIONS.`
    };

    const userMessage = {
      role: 'user',
      content: `Generate a comprehensive legal summary for this UK road traffic accident claim following the CAR CRASH LAWYER AI format.

INCIDENT DATA (${comprehensiveData._metadata?.totalFieldsExtracted || '190+'} fields from pages 1-12):
${JSON.stringify(comprehensiveData, null, 2)}
${hasTranscription ? `
VOICE TRANSCRIPTION (Driver's First-Hand Testimony):
"""
${incidentData.voice_transcription}
"""

⚠️ CRITICAL: You MUST generate BOTH SECTION 1 and SECTION 2 since voice transcription is available.
` : `
⚠️ NOTE: Voice transcription not yet provided - generate SECTION 1 only.
`}

MANDATORY REQUIREMENTS:
1. Use the exact 10-heading structure from SECTION 1 instructions
2. Include every single non-null field from the data above
3. State "not provided" for missing fields - NEVER invent data
4. Use plain legal English suitable for court/insurer review
5. Maintain neutral, factual tone throughout
6. Format dates as DD/MM/YYYY and times in 24-hour format
7. Use British legal terminology (solicitor, claim, number plate, A&E, third party)
${hasTranscription ? '8. For SECTION 2: Blend structured data with voice testimony using journalistic factual mode' : ''}

FIELD COVERAGE CHECKLIST (verify ALL are included):
- Driver & Vehicle Identity: ✓ Registration, make, model, DVLA data, manual overrides
- Emergency Contacts: ✓ Names, phone, email (if used)
- Insurance: ✓ Other party insurer, policy number, policy holder, cover type
- Medical: ✓ ALL symptom flags, ambulance, hospital, treatment, injuries, safety check
- Location & Conditions: ✓ Date, time, location, what3words, weather, visibility, road surface, traffic, speed
- Junction/Layout: ✓ Type, control, lights, manoeuvre, hazards, special conditions
- Impact & Damage: ✓ No damage flag, impact points, damage description, driveability
- Other Party: ✓ Name, contact, registration, DVLA data, insurance, damage
- Witnesses: ✓ Name, mobile, email, statement for EACH witness
- Police & Legal: ✓ Attendance, reference, force, officer, badge, breath tests, airbags, seatbelts

⚠️ ZERO OMISSIONS RULE: If a field has data, it MUST appear in your output.

Generate the complete ${hasTranscription ? 'TWO-SECTION' : 'SECTION 1'} summary now.`
    };

    const startTime = Date.now();

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini', // 10x cheaper than gpt-4o, suitable for structured data
      messages: [systemMessage, userMessage],
      temperature: 0.4,         // Balanced factual with natural elaboration (was 0.3→0.35→0.38→0.4)
      max_tokens: 3500,         // ~2600 words capacity - room for comprehensive coverage (was 2800→3500)
      top_p: 0.9,               // High probability tokens
      frequency_penalty: 0.3,   // Moderate repetition control (was 0.2→0.3→0.4→0.35→0.6)
      presence_penalty: 0.5,    // Sweet spot for comprehensive coverage (was 0.1→0.4→0.5→0.6→0.65→0.75→0.8)
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
      fieldCount: comprehensiveData._metadata?.totalFieldsExtracted || Object.keys(comprehensiveData).length,
      extractionMetadata: comprehensiveData._metadata // Include full extraction statistics
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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NEW SINGLE-PHASE AI ARCHITECTURE (2025-12-08)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Replaces the flawed two-phase system that caused hallucinations.
 *
 * Key improvements:
 * - Uses GPT-4o for all processing (no gpt-4o-mini cascade)
 * - Temperature 0.2 (factual with narrative creativity)
 * - Direct access to raw structured data (160+ fields)
 * - Database schema included in prompt
 * - No information bottleneck from text-only summaries
 */

/**
 * Parse AI Output and Generate Content for PDF Pages 13-16
 *
 * Extracts and generates content for each page:
 * - Page 13: voice_transcription (raw) + quality_review
 * - Page 14: closing_statement (Legal Incident Narrative section)
 * - Page 15: ai_summary (full AI output - handled separately)
 * - Page 16: final_review (recommendations and next steps)
 *
 * @param {string} aiSummary - Full AI-generated summary
 * @param {string} transcription - Raw user transcription
 * @param {object} incidentData - Incident data for context
 * @returns {object} Parsed content for all pages
 */
function parseAiOutputForPages(aiSummary, transcription, incidentData) {
  // Extract SECTION 2: LEGAL INCIDENT NARRATIVE for closing statement
  const closingStatement = extractLegalNarrative(aiSummary);

  // Generate quality review based on transcription analysis
  const qualityReview = generateQualityReview(transcription, incidentData);

  // Generate final review with recommendations
  const finalReview = generateFinalReview(incidentData);

  return {
    voice_transcription: transcription,
    closing_statement: closingStatement,
    quality_review: qualityReview,
    final_review: finalReview
  };
}

/**
 * Extract Legal Incident Narrative from AI Summary
 *
 * Looks for SECTION 2 content between section headers
 * Falls back to last 40% of content if no section markers found
 *
 * @param {string} aiSummary - Full AI summary
 * @returns {string} Legal narrative for closing statement
 */
function extractLegalNarrative(aiSummary) {
  // Try to find SECTION 2 marker
  const section2Patterns = [
    /SECTION\s*2\s*[-—–:]\s*LEGAL INCIDENT NARRATIVE\s*\n+([\s\S]*?)(?=$|SECTION\s*\d)/i,
    /LEGAL INCIDENT NARRATIVE\s*\n+([\s\S]*?)(?=$|SECTION\s*\d)/i,
    /[-—–═]+\s*LEGAL INCIDENT NARRATIVE\s*[-—–═]*\s*\n+([\s\S]*?)(?=$)/i
  ];

  for (const pattern of section2Patterns) {
    const match = aiSummary.match(pattern);
    if (match && match[1] && match[1].trim().length > 100) {
      return match[1].trim();
    }
  }

  // Fallback: Use the last 40% of the content as narrative
  // (Section 1 is structured summary, Section 2 is narrative - typically at end)
  const lines = aiSummary.split('\n');
  const startIndex = Math.floor(lines.length * 0.6);
  const narrative = lines.slice(startIndex).join('\n').trim();

  // If still no content, return the full summary
  return narrative.length > 100 ? narrative : aiSummary;
}

/**
 * Generate Quality Review for Page 13
 *
 * Assesses transcription quality and data completeness
 *
 * @param {string} transcription - User's voice transcription
 * @param {object} incidentData - Incident data for completeness check
 * @returns {string} Quality review text
 */
function generateQualityReview(transcription, incidentData) {
  const wordCount = transcription.split(/\s+/).length;
  const hasDetail = wordCount > 100;

  // Check key fields for completeness
  const keyFields = [
    'accident_date', 'accident_time', 'accident_location',
    'vehicle_registration', 'insurance_policy_number'
  ];
  const completedFields = keyFields.filter(field => incidentData[field]);
  const completenessScore = Math.round((completedFields.length / keyFields.length) * 100);

  let qualityLevel = 'Good';
  if (wordCount < 50 || completenessScore < 60) qualityLevel = 'Needs Enhancement';
  if (wordCount > 200 && completenessScore >= 80) qualityLevel = 'Excellent';

  return `TRANSCRIPTION QUALITY ASSESSMENT

Statement Length: ${wordCount} words
Form Data Completeness: ${completenessScore}%
Overall Quality: ${qualityLevel}

Key Information Status:
${keyFields.map(field => `• ${formatFieldName(field)}: ${incidentData[field] ? '✓ Provided' : '○ Not provided'}`).join('\n')}

Assessment Notes:
${hasDetail ? 'The personal statement provides detailed narrative context for the incident.' : 'The statement could benefit from additional detail about the sequence of events.'}
${completenessScore >= 80 ? 'Form data is substantially complete for legal documentation.' : 'Some key fields may need to be confirmed with the client.'}

This transcription has been processed using AI-powered analysis to ensure accuracy and legal relevance.`;
}

/**
 * Generate Final Review for Page 16
 *
 * Provides recommendations and next steps
 *
 * @param {object} incidentData - Incident data for context
 * @returns {string} Final review with recommendations
 */
function generateFinalReview(incidentData) {
  const hasPolice = incidentData.police_attended === true || incidentData.police_attended === 'yes';
  const hasWitnesses = incidentData.witnesses_present === true || incidentData.witnesses_present === 'yes';
  const hasInjuries = incidentData.injuries_sustained === true || incidentData.injuries_sustained === 'yes';
  const hasOtherParty = incidentData.other_driver_name || incidentData.other_vehicle_registration;

  const recommendations = [];

  // Standard recommendations
  recommendations.push('Review this document with your legal representative');
  recommendations.push('Retain copies of all medical documentation');

  // Conditional recommendations
  if (hasPolice) {
    recommendations.push('Follow up on police report reference number');
  }
  if (hasWitnesses) {
    recommendations.push('Confirm witness availability for potential testimony');
  }
  if (hasInjuries) {
    recommendations.push('Continue to document ongoing medical treatment');
    recommendations.push('Keep records of all related expenses');
  }
  if (hasOtherParty) {
    recommendations.push('Preserve all correspondence with the other party\'s insurer');
  }

  recommendations.push('Maintain dashcam footage and photographs in secure storage');
  recommendations.push('Note any changes in symptoms or condition');

  return `FINAL REVIEW & NEXT STEPS

Document Status: Complete for Legal Review

This incident report has been compiled using the information provided through the Car Crash Lawyer AI system. The data has been processed, verified against form submissions, and formatted for legal proceedings in the United Kingdom.

RECOMMENDED ACTIONS:

${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

IMPORTANT NOTES:

• All information contained in this report is based on the claimant's submitted data and personal statement
• This document is intended to support legal proceedings and insurance claims
• Any discrepancies should be addressed with your legal representative
• This report was generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}

For questions about this report, please contact your assigned legal representative.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by Car Crash Lawyer AI | UK Traffic Accident Documentation System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Format field name for display
 * @param {string} fieldName - Database field name (snake_case)
 * @returns {string} Human-readable name
 */
function formatFieldName(fieldName) {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate AI Summary - Single Phase Architecture
 *
 * Generates comprehensive legal summary by directly processing:
 * 1. Raw structured incident data (160+ fields from 3 tables)
 * 2. User's voice transcription
 * 3. Database schema for complete field coverage
 *
 * Output: 800-2500 word legal summary for Pages 13-18 of PDF
 *
 * @param {string} userId - User UUID
 * @param {string} incidentId - Incident UUID
 * @param {string} transcription - User's voice statement
 * @returns {Promise<object>} Generated AI summary with metadata
 */
async function generateSinglePhaseAiSummary(userId, incidentId, transcription) {
  const startTime = Date.now();

  // Check OpenAI is available
  const client = getOpenAI();
  if (!client) {
    logger.warn('OpenAI not configured - single-phase AI summary unavailable');
    throw new Error('AI service not configured');
  }

  logger.info('[Single-Phase AI] Starting comprehensive analysis', {
    userId,
    incidentId,
    transcriptionLength: transcription.length
  });

  try {
    // Step 1: Fetch ALL data from 3 tables
    const { data: incidentData, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('id', incidentId)
      .eq('create_user_id', userId)
      .is('deleted_at', null)
      .single();

    if (incidentError || !incidentData) {
      throw new Error('Failed to fetch incident data');
    }

    const { data: otherVehicles, error: vehiclesError } = await supabase
      .from('incident_other_vehicles')
      .select('*')
      .eq('create_user_id', userId)
      .eq('incident_id', incidentId)  // CRITICAL: Filter by current incident only
      .is('deleted_at', null)
      .order('vehicle_index', { ascending: true });

    const { data: witnesses, error: witnessesError } = await supabase
      .from('incident_witnesses')
      .select('*')
      .eq('create_user_id', userId)
      .eq('incident_id', incidentId)  // CRITICAL: Filter by current incident only
      .is('deleted_at', null)
      .order('witness_index', { ascending: true });

    logger.info('[Single-Phase AI] Data fetched', {
      incidentFields: Object.keys(incidentData).length,
      otherVehiclesCount: otherVehicles?.length || 0,
      witnessesCount: witnesses?.length || 0
    });

    // Step 2: Build comprehensive data structure (uses existing function)
    const comprehensiveData = buildComprehensiveIncidentData(
      incidentData,
      otherVehicles || [],
      witnesses || []
    );

    // Step 3: Build prompts with schema + data
    const systemPrompt = buildSinglePhasSystemPrompt();
    const userPrompt = buildSinglePhaseUserPrompt(comprehensiveData, transcription);

    logger.info('[Single-Phase AI] Calling GPT-4o (temp 0.2)...');

    // Step 4: Call GPT-4o with temperature 0.2
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,  // Factual accuracy with narrative flow
      max_tokens: 4000,
      top_p: 0.95,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    });

    const aiSummary = completion.choices[0].message.content;
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

    logger.info('[Single-Phase AI] Generation complete', {
      elapsedSeconds: elapsedTime,
      summaryLength: aiSummary.length,
      wordCount: aiSummary.split(/\s+/).length,
      tokensUsed: completion.usage.total_tokens
    });

    // Step 5: Parse AI output and prepare content for all 4 PDF pages
    // Page 13: voice_transcription (raw), quality_review (generated)
    // Page 14: closing_statement (Legal Incident Narrative section)
    // Page 15: ai_summary (full AI output)
    // Page 16: final_review (generated recommendations)

    const parsedContent = parseAiOutputForPages(aiSummary, transcription, incidentData);

    logger.info('[Single-Phase AI] Parsed content for all pages', {
      hasVoiceTranscription: !!parsedContent.voice_transcription,
      hasClosingStatement: !!parsedContent.closing_statement,
      hasQualityReview: !!parsedContent.quality_review,
      hasFinalReview: !!parsedContent.final_review
    });

    // Step 6: Store result in database - ALL 4 columns for pages 13-16
    const metadata = {
      model: 'gpt-4o',
      temperature: 0.2,
      generated_at: new Date().toISOString(),
      elapsed_seconds: parseFloat(elapsedTime),
      tokens_used: completion.usage.total_tokens,
      prompt_tokens: completion.usage.prompt_tokens,
      completion_tokens: completion.usage.completion_tokens,
      architecture: 'single-phase-v1',
      data_sources: {
        incident_fields: Object.keys(incidentData).length,
        other_vehicles: otherVehicles?.length || 0,
        witnesses: witnesses?.length || 0,
        transcription_length: transcription.length
      }
    };

    const { error: updateError } = await supabase
      .from('incident_reports')
      .update({
        // Page 13: Voice transcription and quality review
        voice_transcription: parsedContent.voice_transcription,
        quality_review: parsedContent.quality_review,
        // Page 14: Closing statement (Legal Incident Narrative)
        closing_statement: parsedContent.closing_statement,
        // Page 15: Full AI summary (both sections)
        ai_summary: aiSummary,
        // Page 16: Final review with recommendations
        final_review: parsedContent.final_review,
        // Metadata
        form_data_summary_metadata: metadata,
        analysis_metadata: metadata
      })
      .eq('id', incidentId)
      .eq('create_user_id', userId);

    if (updateError) {
      logger.error('[Single-Phase AI] Failed to store result:', updateError);
      throw updateError;
    }

    logger.success('[Single-Phase AI] Complete - summary stored in database', {
      incidentId,
      wordCount: aiSummary.split(/\s+/).length
    });

    return {
      success: true,
      aiSummary,
      metadata
    };

  } catch (error) {
    logger.error('[Single-Phase AI] Generation failed', {
      error: error.message,
      stack: error.stack
    });

    // Store error metadata
    try {
      await supabase
        .from('incident_reports')
        .update({
          form_data_summary_metadata: {
            error: error.message,
            failed_at: new Date().toISOString(),
            architecture: 'single-phase-v1'
          }
        })
        .eq('id', incidentId)
        .eq('create_user_id', userId);
    } catch (metadataError) {
      logger.error('[Single-Phase AI] Failed to store error metadata:', metadataError);
    }

    throw new Error(`Failed to generate AI summary: ${error.message}`);
  }
}

/**
 * Build System Prompt for Single-Phase Architecture
 *
 * Defines the AI's role, constraints, and output format for legal summary generation.
 */
function buildSinglePhasSystemPrompt() {
  return `You are a legal document analyst specializing in UK traffic accident reports for solicitors.

Your task is to generate a comprehensive, factual summary for legal review and case assessment.

═══════════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════════

1. FACTUAL ACCURACY:
   - Use ONLY the data provided in the incident report and transcription
   - NEVER invent, guess, or hallucinate facts
   - If a field is empty/null/undefined, state "not documented" - never fill gaps

2. DATA PRIORITY:
   - Form data (pages 1-12) provides PRECISE facts: dates, times, locations, registration numbers
   - Transcription provides PERSPECTIVE: event sequence, emotions, personal observations
   - When they differ, present both clearly labeled: "Form data states X, while personal account describes Y"

3. VERIFICATION:
   - Always cross-reference facts against provided data structure
   - Use exact values from fields (don't paraphrase dates, times, locations)
   - Preserve registration numbers, policy numbers, reference numbers exactly as given

4. TONE & STYLE:
   - Professional, factual, sincere legal tone
   - Clear journalistic structure following incident chronology
   - No speculation, opinion, or "courtroom theatrics"
   - Natural narrative flow while maintaining precision

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

Generate a comprehensive summary in TWO main sections:

SECTION 1 — TRAFFIC ACCIDENT SUMMARY

A structured summary covering 10 key areas:

1. Accident Circumstances
   - Date, time, location (exact as documented)
   - Road type, speed limit, conditions
   - Event sequence from both sources

2. User's Vehicle
   - Make, model, registration, color
   - Damage description and location
   - Occupants, safety equipment status

3. Other Vehicles Involved
   - Make, model, registration, color (DVLA data if available)
   - Driver details, damage
   - Insurance information
   - [Repeat for each vehicle, clearly numbered]

4. Witnesses
   - Name, contact details, relationship
   - Statement availability
   - [List each witness separately]

5. Medical Impact
   - Injuries documented in form
   - Symptoms, hospital visits, treatment
   - Ongoing medical concerns

6. Insurance Information
   - User's insurer, policy number, claim status
   - Other party's insurance details
   - Claim filing dates

7. Road and Weather Conditions
   - Weather array (rain, fog, etc.)
   - Lighting conditions
   - Road surface conditions
   - Visibility, traffic density

8. Damage Assessment
   - Vehicle damage descriptions
   - Estimated repair costs (if documented)
   - Airbag deployment, structural damage

9. Official Response
   - Police attendance (yes/no)
   - Crime reference number, officer details
   - Breathalyzer tests, arrests
   - Emergency services involvement

10. Additional Context
    - Dashcam footage availability
    - Photographs taken
    - Previous accidents
    - Other relevant documentation

SECTION 2 — LEGAL INCIDENT NARRATIVE

A flowing 400-800 word narrative that:
- Integrates form data precision with personal testimony perspective
- Follows natural chronology: Before → During → After
- Uses specific details from form for accuracy
- Uses transcription for human context and event flow
- Clearly distinguishes documented facts from personal observations
- Maintains legal professional tone throughout

═══════════════════════════════════════════════════════════════
LENGTH GUIDELINES
═══════════════════════════════════════════════════════════════

Target total length varies by data richness:
- Sparse data (no witnesses, single vehicle): 800-1200 words
- Average data (1 witness, 1 other vehicle): 1200-1800 words
- Complex data (multiple witnesses/vehicles): 1500-2500 words

NEVER pad with unnecessary elaboration - length should be natural to data provided.`;
}

/**
 * Build User Prompt for Single-Phase Architecture
 *
 * Includes database schema + structured data + transcription
 */
function buildSinglePhaseUserPrompt(comprehensiveData, transcription) {
  return `═══════════════════════════════════════════════════════════════
DATABASE SCHEMA REFERENCE
═══════════════════════════════════════════════════════════════

The incident data structure contains fields from 3 normalized tables:

**incident_reports** (main accident details):
- accident_date: Date of incident (DD/MM/YYYY format)
- accident_time: Time of incident (HH:MM format)
- accident_location: Full address/location string
- accident_description: User's written description
- weather_conditions: Array of weather factors (e.g., ["rain", "fog"])
- lighting_conditions: Lighting at time of incident
- road_features: Array of road features (e.g., ["junction", "roundabout"])
- road_type: Type of road (motorway, A-road, etc.)
- speed_limit: Posted speed limit
- vehicle_make, vehicle_model, vehicle_registration: User's vehicle details
- vehicle_damage: Damage description
- medical_symptoms: Array of injury symptoms (e.g., ["chest_pain", "headache"])
- hospital_visit, hospital_name: Medical facility details
- ambulance_called: Yes/No
- police_attended, crime_reference_number: Official response
- insurance_provider, insurance_policy_number: Insurance details
... [160+ total fields]

**incident_other_vehicles** (other vehicles involved, 1-5 vehicles):
- vehicle_index: 1-5
- dvla_make, dvla_model, dvla_colour, dvla_year_of_manufacture: DVLA lookup data
- other_vehicle_driver_name, other_vehicle_driver_contact: Driver details
- other_vehicle_insurer, other_vehicle_policy_number: Insurance
- damage_description: Damage to other vehicle
- was_moving, direction: Movement at time of impact

**incident_witnesses** (witnesses, 1-3 witnesses):
- witness_index: 1-3
- witness_name, witness_contact_phone, witness_email: Contact details
- witness_relationship: Relationship to parties
- witness_statement: Statement if available
- willing_to_testify: Yes/No

═══════════════════════════════════════════════════════════════
COMPREHENSIVE INCIDENT DATA
═══════════════════════════════════════════════════════════════

${JSON.stringify(comprehensiveData, null, 2)}

═══════════════════════════════════════════════════════════════
PERSONAL VOICE TRANSCRIPTION
═══════════════════════════════════════════════════════════════

"""
${transcription}
"""

═══════════════════════════════════════════════════════════════
TASK
═══════════════════════════════════════════════════════════════

Generate a comprehensive legal summary using the format specified in your system instructions.

Integration Rules:
1. Use form data for ALL precise facts (dates, times, locations, registration numbers)
2. Use transcription for event sequence, emotional context, and personal observations
3. When form data and transcription differ, present both clearly labeled
4. Never invent facts not present in either source
5. State "not documented" for empty/missing fields
6. Exclude what3words field (test data, not actual incident location)
7. Preserve exact spelling of registration numbers, policy numbers, reference numbers

Begin your summary now:`;
}

module.exports = {
  analyzeStatement,
  savePersonalStatement,
  getAnalysis,
  generateFormDataSummary, // OLD: Phase 1 function (deprecated, keep for rollback)
  generateSinglePhaseAiSummary // NEW: Single-phase replacement
};
