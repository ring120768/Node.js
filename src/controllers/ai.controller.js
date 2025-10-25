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

    // Fetch incident data if available
    let incidentData = null;
    if (incidentId) {
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('id', incidentId)
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
 */
async function generateComprehensiveAnalysis(transcription, incidentData = null) {
  try {
    // Step 1: Generate Summary and Key Points
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

    // Step 2: Generate Quality Review
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

    // Step 3: Generate Combined Report (if incident data available)
    let combinedReport = null;
    if (incidentData) {
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
    }

    // Step 4: Generate Final Review with Next Steps
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
 * Save personal statement to incident report
 * POST /api/incident-reports/save-statement
 */
async function savePersonalStatement(req, res) {
  try {
    const { userId, incidentId, personalStatement } = req.body;

    if (!personalStatement || personalStatement.trim().length === 0) {
      return sendError(res, 400, 'Personal statement is required', 'MISSING_STATEMENT');
    }

    logger.info('Saving personal statement', {
      userId,
      incidentId,
      textLength: personalStatement.length
    });

    // If we have an incident ID, update that specific incident
    if (incidentId) {
      const { data, error } = await supabase
        .from('incident_reports')
        .update({
          witness_statement_text: personalStatement,
          updated_at: new Date().toISOString()
        })
        .eq('id', incidentId)
        .eq('create_user_id', userId)
        .select();

      if (error) {
        logger.error('Failed to save statement', { error: error.message });
        throw error;
      }

      if (!data || data.length === 0) {
        return sendError(res, 404, 'Incident report not found', 'NOT_FOUND');
      }

      logger.success('Personal statement saved', { incidentId });

      return res.json({
        success: true,
        message: 'Personal statement saved successfully',
        incidentId: incidentId
      });

    } else {
      // No incident ID - create a new incident report with just the statement
      const { data, error } = await supabase
        .from('incident_reports')
        .insert([{
          create_user_id: userId,
          witness_statement_text: personalStatement,
          date: new Date().toISOString(),
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        logger.error('Failed to create incident with statement', { error: error.message });
        throw error;
      }

      logger.success('New incident created with statement', { incidentId: data[0].id });

      return res.json({
        success: true,
        message: 'Personal statement saved successfully',
        incidentId: data[0].id
      });
    }

  } catch (error) {
    logger.error('Save statement error', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 500, 'Failed to save statement', 'SAVE_ERROR');
  }
}

module.exports = {
  analyzeStatement,
  savePersonalStatement
};
