
/**
 * AI Service for Car Crash Lawyer AI
 * Handles OpenAI API calls for AI summaries and analysis
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Generate AI Summary using OpenAI
 * @param {string} transcriptionText - The transcription text to analyze
 * @param {string} createUserId - User ID for database operations
 * @param {string} incidentId - Incident or queue ID
 * @param {Object} supabase - Supabase client instance
 * @returns {Object|null} AI analysis object or null if failed
 */
async function generateAISummary(transcriptionText, createUserId, incidentId, supabase) {
  try {
    if (!config.openai.apiKey || !transcriptionText) {
      logger.info('Cannot generate AI summary - missing API key or transcription');
      return null;
    }

    if (transcriptionText.length < 10) {
      logger.warn('Transcription too short for meaningful summary');
      return null;
    }

    logger.info('Generating AI summary for user', { userId: createUserId });

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a legal assistant analyzing car accident statements. Provide objective, factual analysis in JSON format.'
          },
          {
            role: 'user',
            content: `Analyze this car accident witness statement and provide a structured JSON response with the following fields:

1. summary_text: A clear, concise 2-3 paragraph summary of what happened
2. key_points: An array of 5-7 key facts from the statement
3. fault_analysis: An objective assessment of fault based on the statement
4. contributing_factors: Any environmental, weather, or other contributing factors mentioned

Statement to analyze: "${transcriptionText}"

Respond ONLY with valid JSON. No additional text.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    let aiAnalysis;
    try {
      const content = response.data.choices[0].message.content;
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiAnalysis = JSON.parse(cleanContent);
    } catch (parseError) {
      logger.error('Failed to parse AI response as JSON', parseError);
      aiAnalysis = {
        summary_text: response.data.choices[0].message.content,
        key_points: ['See summary for details'],
        fault_analysis: 'Manual review recommended',
        contributing_factors: 'See summary text'
      };
    }

    // Validate AI analysis structure
    aiAnalysis = {
      summary_text: aiAnalysis.summary_text || 'Summary generation failed',
      key_points: Array.isArray(aiAnalysis.key_points) ? aiAnalysis.key_points : [],
      fault_analysis: aiAnalysis.fault_analysis || 'Unable to determine',
      contributing_factors: aiAnalysis.contributing_factors || 'None identified'
    };

    // Save to ai_summary table if supabase is provided
    if (supabase) {
      const { data, error } = await supabase
        .from('ai_summary')
        .insert({
          create_user_id: createUserId,
          incident_id: incidentId || createUserId,
          summary_text: aiAnalysis.summary_text,
          key_points: aiAnalysis.key_points,
          fault_analysis: aiAnalysis.fault_analysis,
          severity_assessment: aiAnalysis.contributing_factors,
          liability_assessment: aiAnalysis.contributing_factors,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error saving AI summary to database', error);
        if (error.message.includes('column')) {
          const { data: retryData } = await supabase
            .from('ai_summary')
            .insert({
              create_user_id: createUserId,
              incident_id: incidentId || createUserId,
              summary_text: aiAnalysis.summary_text,
              key_points: aiAnalysis.key_points,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (retryData) {
            logger.success('AI summary saved with basic fields');
            return aiAnalysis;
          }
        }
        return aiAnalysis;
      }

      logger.success('AI summary generated and saved successfully');
    }

    return aiAnalysis;
  } catch (error) {
    logger.error('AI Summary generation error', error.response?.data || error);
    return null;
  }
}

module.exports = {
  generateAISummary
};
