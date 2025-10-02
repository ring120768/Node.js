
// mockFunctions.js
// PRODUCTION WARNING: These functions should NEVER return mock data in production
// They will throw errors to prevent contamination of legal records

const { CONSTANTS } = require('../constants');

// AI Summary generation prompt - FACTUAL DATA ONLY
const AI_SUMMARY_PROMPT = `You are an AI assistant specialized in creating concise, factual summaries of car accident transcriptions for UK legal proceedings.

CRITICAL REQUIREMENTS - NO FABRICATED DATA:
- Use ONLY factual information explicitly provided in the transcription
- NEVER invent, infer, speculate, or add any details not clearly stated
- NEVER use placeholder data, example scenarios, or hypothetical information
- NEVER assume standard details that "typically occur" in accidents
- DO NOT generate any content if factual data is insufficient
- If any information is missing or unclear, explicitly state "Not mentioned" or "Details not provided"
- Use neutral, objective language without blame or fault attribution
- Focus exclusively on observable facts and direct statements from the transcription

DATA SUFFICIENCY REQUIREMENTS:
Before generating any summary, verify the transcription contains:
- At least 5 concrete, factual statements about the incident
- Clear details about what actually happened (not vague descriptions)
- Specific information about location, time, vehicles, or parties involved
- Verifiable facts that can be used in legal proceedings

ERROR CONDITIONS - When to return error messages instead of summary:
1. If transcription is empty, unclear, or contains less than 50 meaningful words: "Service is Unavailable - insufficient transcription data"
2. If transcription contains fewer than 5 concrete facts: "There is not currently enough data to provide you with a substantial summary"
3. If transcription appears to be test data, placeholder content, or gibberish: "Service is Unavailable - transcription quality insufficient for legal use"
4. If transcription is mainly emotional content without factual incident details: "There is not currently enough data to provide you with a substantial summary"

ONLY proceed with summary generation if transcription meets all sufficiency requirements.

Your task is to analyze the provided transcription and create a structured summary that includes:

1. **Key Facts**: Extract only the factual details explicitly mentioned (date, time, location, parties involved)
2. **Sequence of Events**: Chronological account based only on what was stated
3. **Damage Assessment**: Description of damage and injuries only as described in the transcription
4. **Legal Considerations**: Mention only evidence or witness information explicitly stated
5. **Information Gaps**: Clearly identify any missing or incomplete information

Guidelines:
- Use clear, professional language suitable for legal documentation
- Never fill in gaps with assumptions or common scenarios
- Mark all uncertain or unclear information as such
- Highlight any contradictions or unclear statements
- Use UK legal terminology and spellings
- Include disclaimer if transcription quality affects accuracy
- End with statement about data limitations if applicable

Remember: It is better to return an error message than to generate a summary with insufficient or unreliable data.

Please analyze the following transcription and either provide a factual summary or return the appropriate error message:`;

// Mock functions for missing implementations
async function logGDPRActivity(userId, activity, details, req) {
  const Logger = require('../index').Logger;
  if (global.supabase) {
    try {
      await global.supabase
        .from('gdpr_audit_log')
        .insert({
          create_user_id: userId,
          activity_type: activity,
          details: details
        });
    } catch (error) {
      Logger.warn('GDPR audit log failed:', error.message);
    }
  }
}

async function processTranscriptionQueue() {
  const Logger = require('../index').Logger;
  if (!global.supabaseEnabled) {
    Logger.warn('Cannot process transcription queue - Supabase not configured');
    return;
  }

  Logger.info('Processing transcription queue...');
  
  try {
    // Get pending transcriptions from queue
    const { data: queueItems, error } = await global.supabase
      .from('transcription_queue')
      .select('*')
      .eq('status', CONSTANTS.TRANSCRIPTION_STATUS.PENDING)
      .order('created_at', { ascending: true })
      .limit(5);

    if (error) {
      Logger.error('Error fetching transcription queue:', error);
      return;
    }

    if (!queueItems || queueItems.length === 0) {
      Logger.debug('No pending transcriptions in queue');
      return;
    }

    Logger.info(`Found ${queueItems.length} pending transcriptions`);

    // Process each item in the queue
    for (const item of queueItems) {
      try {
        // Update status to processing
        await global.supabase
          .from('transcription_queue')
          .update({ status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING })
          .eq('id', item.id);

        // TODO: Implement actual transcription processing
        // This should download audio from item.audio_url and process with OpenAI Whisper
        Logger.info(`Processing transcription for queue item ${item.id}`);
        
        // For now, mark as failed with explanation
        await global.supabase
          .from('transcription_queue')
          .update({ 
            status: CONSTANTS.TRANSCRIPTION_STATUS.FAILED,
            error_message: 'Transcription processing not yet implemented'
          })
          .eq('id', item.id);

      } catch (itemError) {
        Logger.error(`Error processing queue item ${item.id}:`, itemError);
        
        // Update retry count and status
        await global.supabase
          .from('transcription_queue')
          .update({ 
            status: CONSTANTS.TRANSCRIPTION_STATUS.FAILED,
            error_message: itemError.message,
            retry_count: (item.retry_count || 0) + 1
          })
          .eq('id', item.id);
      }
    }

  } catch (error) {
    Logger.error('Error in processTranscriptionQueue:', error);
  }
}

async function initializeDashcamUpload() {
  const Logger = require('../index').Logger;
  Logger.info('Initializing dashcam upload...');
  // Placeholder for dashcam initialization
}

async function generateLegalNarrative(transcription, data, userId, options) {
  const Logger = require('../index').Logger;
  
  // STRICT RULE: NO FAKE DATA GENERATION
  // Only use factual data provided by the user
  
  if (!process.env.OPENAI_API_KEY) {
    Logger.warn('Legal narrative service unavailable - OpenAI API key not configured');
    throw new Error('Service is currently unavailable. Please try again later or contact support.');
  }
  
  // Validate we have sufficient factual data
  if (!transcription || transcription.trim().length < 50) {
    Logger.warn('Insufficient transcription data for legal narrative generation');
    throw new Error('There is not currently enough data to provide you with a substantial legal narrative. Please ensure your recording contains sufficient detail about the incident.');
  }
  
  if (!data || Object.keys(data).length === 0) {
    Logger.warn('No incident data provided for legal narrative generation');
    throw new Error('There is not currently enough data to provide you with a substantial legal narrative. Please complete the incident report form first.');
  }
  
  // Count factual data points available
  const factualDataPoints = Object.values(data).filter(value => 
    value !== null && value !== undefined && value !== '' && value !== 'Unknown'
  ).length;
  
  if (factualDataPoints < 5) {
    Logger.warn(`Insufficient factual data points (${factualDataPoints}) for narrative generation`);
    throw new Error('There is not currently enough data to provide you with a substantial legal narrative. Please provide more details about the incident.');
  }
  
  // TODO: Implement actual legal narrative generation logic
  // This should use OpenAI API to generate a comprehensive legal narrative
  // based ONLY on factual transcription and accident data provided
  // NEVER generate or infer data not explicitly provided by the user
  throw new Error('Legal narrative generation service is temporarily unavailable. Please use the aiSummaryGenerator module or try again later.');
}

async function prepareAccidentDataForNarrative(userId, incidentId) {
  const Logger = require('../index').Logger;
  
  // STRICT RULE: NO MOCK DATA IN PRODUCTION
  // This function must only return factual data from the database
  // NEVER generate or modify user IDs
  
  if (!userId) {
    Logger.error('No user ID provided to prepareAccidentDataForNarrative');
    throw new Error('User ID is required for data preparation.');
  }
  
  // CRITICAL: Validate Typeform UUID format only
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    Logger.error(`Invalid Typeform UUID detected: ${userId}`);
    throw new Error('Invalid user ID format. Only Typeform UUIDs are allowed.');
  }
  
  Logger.error('Mock function called in production environment');
  throw new Error('Service is currently unavailable. Data preparation service is not properly configured.');
}

function extractKeyPointsFromNarrative(narrative) {
  const Logger = require('../index').Logger;
  
  // STRICT RULE: NO FAKE DATA GENERATION
  // Only extract points that are factually present in the provided narrative
  
  if (!narrative || typeof narrative !== 'string' || narrative.trim().length === 0) {
    Logger.warn('No narrative provided for key point extraction');
    throw new Error('There is not currently enough data to extract key points. Please provide a complete narrative first.');
  }
  
  if (narrative.trim().length < 100) {
    Logger.warn('Narrative too short for meaningful key point extraction');
    throw new Error('There is not currently enough data to provide you with substantial key points. Please provide a more detailed narrative.');
  }
  
  Logger.error('Mock function called in production environment');
  throw new Error('Service is currently unavailable. Key point extraction service is not properly configured.');
}

async function generateAISummary(transcription, userId, incidentId) {
  const Logger = require('../index').Logger;
  
  // STRICT RULE: NO FAKE DATA GENERATION
  // Only use factual transcription data provided by the user
  // NEVER generate or modify user IDs
  
  if (!userId) {
    Logger.error('No user ID provided to generateAISummary');
    throw new Error('User ID is required for AI summary generation.');
  }
  
  // Validate that we have a proper UUID from Typeform
  if (userId.startsWith('temp_') || userId.startsWith('user_')) {
    Logger.error(`Invalid user ID detected in generateAISummary: ${userId}`);
    throw new Error('Invalid user ID format. Expected UUID from Typeform.');
  }
  
  if (!process.env.OPENAI_API_KEY) {
    Logger.warn('AI summary service unavailable - OpenAI API key not configured');
    throw new Error('Service is currently unavailable. Please try again later or contact support.');
  }
  
  // Validate we have sufficient factual transcription data
  if (!transcription || typeof transcription !== 'string') {
    Logger.warn('No transcription provided for AI summary generation');
    throw new Error('There is not currently enough data to provide you with a summary. Please complete the transcription first.');
  }
  
  const cleanTranscription = transcription.trim();
  if (cleanTranscription.length === 0) {
    Logger.warn('Empty transcription provided for AI summary generation');
    throw new Error('There is not currently enough data to provide you with a summary. Your transcription appears to be empty.');
  }
  
  if (cleanTranscription.length < 50) {
    Logger.warn(`Transcription too short (${cleanTranscription.length} chars) for meaningful summary`);
    throw new Error('There is not currently enough data to provide you with a substantial summary. Please ensure your recording contains sufficient detail about the incident.');
  }
  
  // Check for common empty or placeholder content
  const placeholderPatterns = [
    /^(test|testing|placeholder|sample)$/i,
    /^[.\s]*$/,
    /^(no audio|silence|quiet)$/i
  ];
  
  if (placeholderPatterns.some(pattern => pattern.test(cleanTranscription))) {
    Logger.warn('Placeholder or test content detected in transcription');
    throw new Error('There is not currently enough data to provide you with a summary. Please record actual incident details.');
  }
  
  Logger.error('Mock function called in production environment');
  throw new Error('Service is currently unavailable. AI summary generation service is not properly configured.');
}

async function processTranscriptionFromBuffer(queueId, buffer, userId, incidentId, audioUrl) {
  const Logger = require('../index').Logger;
  Logger.info(`Processing transcription for queue ${queueId}`);
  // Placeholder for transcription processing
}

module.exports = {
  logGDPRActivity,
  processTranscriptionQueue,
  initializeDashcamUpload,
  generateLegalNarrative,
  prepareAccidentDataForNarrative,
  extractKeyPointsFromNarrative,
  generateAISummary,
  processTranscriptionFromBuffer
};
