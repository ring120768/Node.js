/**
 * Transcription Controller - Car Crash Lawyer AI
 * Handles audio transcription with OpenAI Whisper
 * ✅ NO DIRECT TABLE WRITES - Uses storage and Auth metadata only
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

// Initialize Supabase client with SERVICE ROLE key (bypasses RLS for storage uploads)
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

/**
 * Transcribe audio file
 * POST /api/transcription/transcribe
 */
async function transcribeAudio(req, res) {
  try {
    if (!req.file) {
      return sendError(res, 400, 'No audio file provided', 'MISSING_FILE');
    }

    // Get userId from auth middleware (set by requireAuth middleware)
    const userId = req.userId;
    if (!userId) {
      return sendError(res, 401, 'User not authenticated. Please log in.', 'UNAUTHORIZED');
    }

    logger.info('Transcription request', {
      userId,
      fileName: req.file.originalname
    });

    logger.info('Starting audio transcription', {
      userId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    // Validate audio file type
    const allowedTypes = config.upload.allowedAudioTypes;
    if (!allowedTypes.includes(req.file.mimetype)) {
      return sendError(
        res,
        400,
        `Invalid audio type. Allowed: ${allowedTypes.join(', ')}`,
        'INVALID_FILE_TYPE'
      );
    }

    // Upload audio to Supabase Storage
    const fileName = `${userId}/${Date.now()}_${req.file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('audio-transcriptions')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      logger.error('Audio upload to storage failed', {
        userId,
        error: uploadError.message
      });
      return sendError(res, 500, 'Failed to upload audio file', 'UPLOAD_FAILED');
    }

    logger.success('Audio uploaded to storage', {
      userId,
      path: uploadData.path
    });

    // Transcribe with OpenAI Whisper
    logger.info('Sending to OpenAI Whisper...', {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    // Convert buffer to stream (required by OpenAI SDK)
    const { Readable } = require('stream');
    const audioStream = Readable.from(req.file.buffer);
    audioStream.path = req.file.originalname; // OpenAI SDK needs filename

    logger.info('Stream created, calling OpenAI API...');

    let transcription;
    try {
      transcription = await openai.audio.transcriptions.create({
        file: audioStream,
        model: config.openai.whisperModel,
        language: 'en',
        response_format: 'verbose_json'
      });

      logger.success('OpenAI API call succeeded!');
    } catch (openaiError) {
      logger.error('OpenAI API error:', {
        message: openaiError.message,
        status: openaiError.status,
        type: openaiError.type,
        code: openaiError.code,
        param: openaiError.param,
        headers: openaiError.headers,
        // Log full error for debugging
        fullError: JSON.stringify(openaiError, null, 2)
      });
      throw openaiError; // Re-throw to be caught by outer catch
    }

    logger.success('Transcription complete', {
      userId,
      duration: transcription.duration,
      textLength: transcription.text.length
    });

    // ✅ Store transcription result in Auth metadata (not in table)
    // Note: For large transcriptions, consider storing in storage as JSON file
    const transcriptionMetadata = {
      last_transcription_date: new Date().toISOString(),
      last_transcription_duration: transcription.duration,
      total_transcriptions: (req.user.user_metadata?.total_transcriptions || 0) + 1
    };

    // Update user metadata
    try {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: transcriptionMetadata
      });

      if (metadataError) {
        logger.warn('Failed to update transcription metadata', {
          userId,
          error: metadataError.message
        });
      }
    } catch (metadataErr) {
      logger.warn('Metadata update error (non-critical)', { userId });
    }

    // Store full transcription in storage as JSON
    const transcriptionData = {
      userId: userId,
      fileName: req.file.originalname,
      transcriptionText: transcription.text,
      duration: transcription.duration,
      language: transcription.language,
      segments: transcription.segments,
      audioPath: uploadData.path,
      createdAt: new Date().toISOString()
    };

    const transcriptionFileName = `${userId}/transcriptions/${Date.now()}_transcription.json`;
    await supabase
      .storage
      .from('transcription-data')
      .upload(transcriptionFileName, JSON.stringify(transcriptionData, null, 2), {
        contentType: 'application/json'
      });

    logger.success('Transcription data stored in storage', {
      userId,
      path: transcriptionFileName
    });

    // Return transcription result
    res.json({
      success: true,
      transcription: {
        text: transcription.text,
        duration: transcription.duration,
        language: transcription.language,
        segments: transcription.segments
      },
      storage: {
        audioPath: uploadData.path,
        transcriptionPath: transcriptionFileName
      }
    });

  } catch (error) {
    logger.error('Transcription error', {
      error: error.message,
      stack: error.stack
    });

    // Handle specific OpenAI errors
    if (error.status === 429) {
      // IMPORTANT: Assume all 429s are RATE LIMITS unless explicitly quota-related
      // This is safer because rate limits are temporary, quota issues need billing fixes
      const isQuotaError = error.code === 'insufficient_quota' ||
                          error.code === 'quota_exceeded' ||
                          (error.message && (
                            error.message.toLowerCase().includes('insufficient_quota') ||
                            error.message.toLowerCase().includes('exceeded your current quota')
                          ));

      if (isQuotaError) {
        logger.error('🚨 ACTUAL QUOTA ERROR - Billing issue detected', {
          code: error.code,
          message: error.message
        });
        return sendError(
          res,
          503,
          'OpenAI API quota exceeded. Please check your billing details at https://platform.openai.com/account/billing',
          'OPENAI_QUOTA_EXCEEDED'
        );
      } else {
        // Rate limit error (too many requests per minute) - DEFAULT for all 429s
        logger.warn('⏱️ Rate limit hit (not a billing issue)', {
          status: error.status,
          code: error.code,
          message: error.message
        });
        return sendError(
          res,
          429,
          'Too many requests. Please wait 10-15 seconds and try again. This is NOT a billing issue - your quota is fine.',
          'OPENAI_RATE_LIMIT'
        );
      }
    }

    if (error.code === 'insufficient_quota' || error.code === 'quota_exceeded') {
      logger.error('🚨 QUOTA ERROR - Billing issue', { code: error.code });
      return sendError(
        res,
        503,
        'OpenAI API quota exceeded. Please check your billing details at https://platform.openai.com/account/billing',
        'OPENAI_QUOTA_EXCEEDED'
      );
    }

    if (error.status === 401 || error.code === 'invalid_api_key') {
      return sendError(
        res,
        500,
        'OpenAI API key is invalid. Please check your environment configuration.',
        'OPENAI_AUTH_ERROR'
      );
    }

    // Generic transcription error
    sendError(res, 500, 'Transcription failed: ' + (error.message || 'Unknown error'), 'TRANSCRIPTION_ERROR');
  }
}

/**
 * Get transcription history for user
 * Uses storage bucket listing instead of database
 * GET /api/transcription/history
 */
async function getTranscriptionHistory(req, res) {
  try {
    const userId = req.userId;

    if (!userId) {
      return sendError(res, 401, 'User not authenticated', 'UNAUTHORIZED');
    }

    // List transcription files from storage
    const { data: files, error } = await supabase
      .storage
      .from('transcription-data')
      .list(`${userId}/transcriptions`, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      logger.error('Failed to list transcriptions', { userId, error: error.message });
      return sendError(res, 500, 'Failed to retrieve history', 'HISTORY_ERROR');
    }

    // Get download URLs for each transcription
    const transcriptions = await Promise.all(
      files.map(async (file) => {
        const { data: urlData } = await supabase
          .storage
          .from('transcription-data')
          .createSignedUrl(`${userId}/transcriptions/${file.name}`, 3600); // 1 hour expiry

        return {
          id: file.id,
          name: file.name,
          createdAt: file.created_at,
          size: file.metadata?.size,
          downloadUrl: urlData?.signedUrl
        };
      })
    );

    res.json({
      success: true,
      transcriptions,
      total: transcriptions.length
    });

  } catch (error) {
    logger.error('History retrieval error', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 500, 'Failed to get history', 'HISTORY_ERROR');
  }
}

/**
 * Get specific transcription by ID
 * GET /api/transcription/:transcriptionId
 */
async function getTranscription(req, res) {
  try {
    const userId = req.userId;
    const { transcriptionId } = req.params;

    if (!userId) {
      return sendError(res, 401, 'User not authenticated', 'UNAUTHORIZED');
    }

    // Download transcription JSON from storage
    const { data, error } = await supabase
      .storage
      .from('transcription-data')
      .download(`${userId}/transcriptions/${transcriptionId}`);

    if (error) {
      logger.error('Failed to download transcription', {
        userId,
        transcriptionId,
        error: error.message
      });
      return sendError(res, 404, 'Transcription not found', 'NOT_FOUND');
    }

    // Parse JSON data
    const transcriptionText = await data.text();
    const transcriptionData = JSON.parse(transcriptionText);

    res.json({
      success: true,
      transcription: transcriptionData
    });

  } catch (error) {
    logger.error('Get transcription error', {
      error: error.message,
      stack: error.stack
    });
    sendError(res, 500, 'Failed to get transcription', 'GET_ERROR');
  }
}

module.exports = {
  transcribeAudio,
  getTranscriptionHistory,
  getTranscription
};