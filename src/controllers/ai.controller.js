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

    // Fetch incident data if available (excluding soft-deleted)
    let incidentData = null;
    if (incidentId) {
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('id', incidentId)
        .is('deleted_at', null)
        .single();

      if (!error && data) {
        incidentData = data;
        logger.info('Incident data retrieved', { incidentId });
      }
    }

    // Generate comprehensive AI analysis
    const analysis = await generateComprehensiveAnalysis(transcription, incidentData);

    // Store analysis in database for audit
    if (incidentId) {
      await storeAIAnalysis(userId, incidentId, transcription, analysis);
    }

    logger.success('AI analysis complete', {
      userId,
      incidentId,
      completenessScore: analysis.finalReview?.completenessScore
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
 * IMPORTANT: This function makes 3-4 sequential OpenAI API calls:
 * - Summary generation (~5-10s)
 * - Quality review (~5-10s)
 * - Combined report (~5-15s, if incident data exists)
 * - Final review (~5-10s)
 * Total time: 20-45+ seconds
 *
 * The /api/ai/* routes have a 120-second timeout configured in app.js
 * to accommodate these long-running operations.
 */
async function generateComprehensiveAnalysis(transcription, incidentData = null) {
  try {
    const startTime = Date.now();

    // Step 1: Generate Summary and Key Points
    logger.info('[AI Analysis] Step 1/4: Generating summary...');
    const summaryPrompt = `You are an expert legal assistant analyzing a car accident personal statement.

Personal Statement:
"""
${transcription}
"""

Provide:
1. A concise 2-3 sentence summary
2. 3-5 key bullet points highlighting main events, injuries, and critical details
3. Brief fault analysis (1-2 sentences)

Format as JSON:
{
  "summary": "...",
  "keyPoints": ["...", "...", "..."],
  "faultAnalysis": "..."
}`;

    const summaryResponse = await openai.chat.completions.create({
      model: 'gpt-4o',  // gpt-4o supports JSON mode
      messages: [
        { role: 'system', content: 'You are a legal assistant specializing in car accident cases.' },
        { role: 'user', content: summaryPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const summaryData = JSON.parse(summaryResponse.choices[0].message.content);
    logger.info('[AI Analysis] Step 1/4 complete', {
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
    });

    // Step 2: Generate Quality Review
    logger.info('[AI Analysis] Step 2/4: Generating quality review...');
    const reviewPrompt = `You are an expert legal assistant reviewing a car accident statement for completeness.

Personal Statement:
"""
${transcription}
"""

Analyze the statement and provide:
1. Quality assessment (2-3 sentences about overall quality)
2. Missing critical information (list specific items not mentioned: date, time, location, weather, injuries, vehicle damage, witnesses, etc.)
3. Suggestions for improvement (3-5 specific actionable suggestions)

Format as JSON:
{
  "quality": "...",
  "missingInfo": ["...", "..."],
  "suggestions": ["...", "...", "..."]
}`;

    const reviewResponse = await openai.chat.completions.create({
      model: 'gpt-4o',  // gpt-4o supports JSON mode
      messages: [
        { role: 'system', content: 'You are a legal assistant specializing in accident documentation.' },
        { role: 'user', content: reviewPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const reviewData = JSON.parse(reviewResponse.choices[0].message.content);
    logger.info('[AI Analysis] Step 2/4 complete', {
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
    });

    // Step 3: Generate Combined Report (if incident data available)
    let combinedReport = null;
    if (incidentData) {
      logger.info('[AI Analysis] Step 3/4: Generating combined report...');
      const combinedPrompt = `You are a legal assistant creating a comprehensive incident report.

Personal Statement:
"""
${transcription}
"""

Incident Details from Form:
- Date: ${incidentData.when_did_the_accident_happen || 'Not specified'}
- Time: ${incidentData.what_time_did_the_accident_happen || 'Not specified'}
- Location: ${incidentData.where_exactly_did_this_happen || 'Not specified'}
- Weather: ${incidentData.weather_conditions || 'Not specified'}
- Medical Status: ${incidentData.medical_how_are_you_feeling || 'Not specified'}
- Vehicle Make/Model: ${incidentData.make_of_car || 'Not specified'} ${incidentData.model_of_car || 'Not specified'}
- Other Driver: ${incidentData.other_drivers_name || 'Not specified'}

Create a cohesive narrative that combines both sources into a professional incident report. Write in third person, past tense. Include all available details in a logical flow: introduction, incident description, vehicle information, injuries/medical, witness information (if any), and conclusion.

Provide the narrative in HTML format with proper paragraphs using <p> tags.`;

      const combinedResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a professional legal report writer.' },
          { role: 'user', content: combinedPrompt }
        ],
        temperature: 0.7
      });

      combinedReport = combinedResponse.choices[0].message.content;
      logger.info('[AI Analysis] Step 3/4 complete', {
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
      });
    } else {
      logger.info('[AI Analysis] Step 3/4: Skipped (no incident data)');
    }

    // Step 4: Generate Final Review with Next Steps
    logger.info('[AI Analysis] Step 4/4: Generating final review...');
    const finalReviewPrompt = `You are a senior legal advisor reviewing a car accident case.

Personal Statement:
"""
${transcription}
"""

${incidentData ? `Additional Incident Data Available: Yes` : 'Additional Incident Data Available: No'}

Provide:
1. Completeness score (0-100 based on how complete the documentation is)
2. Strengths (2-3 bullet points about what's well-documented)
3. Recommended next steps (5-7 specific action items in priority order)
4. Legal considerations (2-3 important legal points to be aware of)

Format as JSON:
{
  "completenessScore": 85,
  "strengths": "<ul><li>...</li><li>...</li></ul>",
  "nextSteps": ["Seek immediate medical attention if not already done", "..."],
  "legalConsiderations": "<p>...</p><p>...</p>"
}`;

    const finalReviewResponse = await openai.chat.completions.create({
      model: 'gpt-4o',  // gpt-4o supports JSON mode
      messages: [
        { role: 'system', content: 'You are a senior legal advisor with 20 years of experience in accident law.' },
        { role: 'user', content: finalReviewPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const finalReviewData = JSON.parse(finalReviewResponse.choices[0].message.content);

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.success(`[AI Analysis] All steps complete in ${totalDuration}s`);

    return {
      summary: summaryData.summary,
      keyPoints: summaryData.keyPoints || [],
      faultAnalysis: summaryData.faultAnalysis,
      review: {
        quality: reviewData.quality,
        missingInfo: reviewData.missingInfo || [],
        suggestions: reviewData.suggestions || []
      },
      combinedReport: combinedReport,
      finalReview: finalReviewData
    };

  } catch (error) {
    logger.error('AI generation error:', error);
    throw new Error('Failed to generate AI analysis: ' + error.message);
  }
}

/**
 * Store AI analysis in database for audit trail
 */
async function storeAIAnalysis(userId, incidentId, transcription, analysis) {
  try {
    const analysisData = {
      user_id: userId,
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

    const { error } = await supabase
      .from('ai_analysis')
      .insert([analysisData]);

    if (error) {
      // Non-critical error - just log it
      logger.warn('Failed to store AI analysis (non-critical)', { error: error.message });
    } else {
      logger.success('AI analysis stored in database', { incidentId });
    }

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

module.exports = {
  analyzeStatement,
  savePersonalStatement
};
