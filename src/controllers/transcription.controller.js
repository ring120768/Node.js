
/**
 * Transcription Controller
 * Handles all transcription-related endpoints
 */

const logger = require('../utils/logger');
const { validateUserId } = require('../utils/validators');
const { sendError, redactUrl } = require('../utils/response');
const config = require('../config');
const CONSTANTS = config.constants;
const { generateAISummary } = require('../services/aiService');
const gdprService = require('../services/gdprService');
const Transcription = require('../models/Transcription');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
let supabase = null;
if (config.supabase.url && config.supabase.serviceKey) {
  supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Import external dependencies for transcription processing
const axios = require('axios');
const FormData = require('form-data');

// Transcription statuses and WebSocket functions (imported from main app)
let transcriptionStatuses = null;
let broadcastTranscriptionUpdate = null;

/**
 * Initialize controller with dependencies from main app
 */
function initializeController(statusMap, broadcastFunction) {
  transcriptionStatuses = statusMap;
  broadcastTranscriptionUpdate = broadcastFunction;
}

/**
 * Process transcription from buffer
 */
async function processTranscriptionFromBuffer(queueId, audioBuffer, create_user_id, incident_report_id, audioUrl) {
  let retryCount = 0;
  const maxRetries = 3;

  try {
    logger.info(`Processing transcription for queue ${queueId}, user ${create_user_id}`);

    if (!create_user_id) {
      throw new Error('User ID is required for transcription processing');
    }

    // Update status with timestamp
    if (transcriptionStatuses) {
      transcriptionStatuses.set(queueId.toString(), {
        status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
        transcription: null,
        summary: null,
        error: null,
        create_user_id: create_user_id,
        updatedAt: Date.now()
      });
    }

    if (broadcastTranscriptionUpdate) {
      broadcastTranscriptionUpdate(queueId.toString(), {
        status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
        message: 'Starting transcription...',
        timestamp: new Date().toISOString()
      });
    }

    let finalAudioBuffer;

    if (audioBuffer) {
      finalAudioBuffer = audioBuffer;
      logger.info(`Using provided buffer, size: ${audioBuffer.length} bytes`);
    } else if (audioUrl) {
      logger.info(`Downloading audio from URL: ${redactUrl(audioUrl)}`);

      try {
        let storagePath = audioUrl;
        if (audioUrl.includes('incident-audio/')) {
          storagePath = audioUrl.split('incident-audio/')[1].split('?')[0];
        } else if (audioUrl.includes('/')) {
          storagePath = audioUrl.split('/').slice(-2).join('/');
        }

        logger.debug(`Attempting to download from path: ${storagePath}`);

        const { data: fileData, error: downloadError } = await supabase.storage
          .from('incident-audio')
          .download(storagePath);

        if (downloadError) {
          logger.error('Supabase download error:', downloadError);
          const audioResponse = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: CONSTANTS.RETRY_LIMITS.API_TIMEOUT,
            maxContentLength: CONSTANTS.FILE_SIZE_LIMITS.AUDIO,
            headers: {
              'User-Agent': 'CarCrashLawyerAI/1.0'
            }
          });
          finalAudioBuffer = Buffer.from(audioResponse.data);
        } else {
          finalAudioBuffer = Buffer.from(await fileData.arrayBuffer());
        }

        logger.info(`Downloaded buffer size: ${finalAudioBuffer.length} bytes`);
      } catch (downloadError) {
        logger.error('Audio download failed:', downloadError);
        throw new Error(`Failed to download audio: ${downloadError.message}`);
      }
    } else {
      throw new Error('No audio source provided (neither buffer nor URL)');
    }

    if (!finalAudioBuffer || finalAudioBuffer.length === 0) {
      throw new Error('No audio data available for transcription');
    }

    if (finalAudioBuffer.length > CONSTANTS.FILE_SIZE_LIMITS.AUDIO) {
      throw new Error('Audio file exceeds size limit');
    }

    if (broadcastTranscriptionUpdate) {
      broadcastTranscriptionUpdate(queueId.toString(), {
        status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
        message: 'Audio loaded, sending to Whisper API...',
        timestamp: new Date().toISOString()
      });
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', finalAudioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm',
      knownLength: finalAudioBuffer.length
    });
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');
    formData.append('language', 'en');

    // Call Whisper API with retry logic
    let whisperResponse;

    while (retryCount < maxRetries) {
      try {
        logger.info(`Whisper API attempt ${retryCount + 1}/${maxRetries}`);

        whisperResponse = await axios.post(
          'https://api.openai.com/v1/audio/transcriptions',
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              'Authorization': `Bearer ${config.openai.apiKey}`
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: CONSTANTS.RETRY_LIMITS.WHISPER_TIMEOUT,
            validateStatus: (status) => status < 500
          }
        );

        if (whisperResponse.status >= 400) {
          throw new Error(`Whisper API returned ${whisperResponse.status}: ${JSON.stringify(whisperResponse.data)}`);
        }

        logger.success('Whisper API call successful');
        break;

      } catch (error) {
        retryCount++;
        logger.error(`Whisper API attempt ${retryCount} failed:`, error.response?.data || error.message);

        if (retryCount >= maxRetries) {
          throw new Error(`Whisper API failed after ${maxRetries} attempts: ${error.message}`);
        }

        const waitTime = Math.pow(2, retryCount) * 1000;
        logger.info(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    const transcription = whisperResponse.data.text;

    if (!transcription || transcription.trim().length === 0) {
      throw new Error('Transcription returned empty text');
    }

    logger.success(`Transcription successful, text length: ${transcription.length} characters`);

    // Update in-memory status
    if (transcriptionStatuses) {
      transcriptionStatuses.set(queueId.toString(), {
        status: CONSTANTS.TRANSCRIPTION_STATUS.TRANSCRIBED,
        transcription: transcription,
        summary: null,
        error: null,
        create_user_id: create_user_id,
        updatedAt: Date.now()
      });
    }

    // Update database
    if (supabase) {
      const { error: queueUpdateError } = await supabase
        .from('transcription_queue')
        .update({
          status: CONSTANTS.TRANSCRIPTION_STATUS.TRANSCRIBED,
          processed_at: new Date().toISOString(),
          transcription_text: transcription,
          error_message: null,
          retry_count: retryCount
        })
        .eq('id', queueId);

      if (queueUpdateError) {
        logger.error('Error updating transcription_queue:', queueUpdateError);
      }

      // Save to ai_transcription table
      const { data: transcriptionRecord, error: saveError } = await supabase
        .from('ai_transcription')
        .insert([{
          create_user_id: create_user_id,
          incident_report_id: incident_report_id || null,
          transcription_text: transcription,
          audio_url: audioUrl,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (saveError) {
        logger.error('Error saving to ai_transcription:', saveError);
      } else {
        logger.success('Transcription saved to ai_transcription table');
      }
    }

    // Send real-time update
    if (broadcastTranscriptionUpdate) {
      broadcastTranscriptionUpdate(queueId.toString(), {
        status: CONSTANTS.TRANSCRIPTION_STATUS.GENERATING_SUMMARY,
        transcription: transcription,
        message: 'Generating AI summary...',
        timestamp: new Date().toISOString()
      });
    }

    // Generate AI summary
    if (config.openai.apiKey && transcription.length > 10) {
      try {
        logger.info('Starting AI summary generation');
        const summary = await generateAISummary(transcription, create_user_id, incident_report_id || queueId, supabase);

        if (summary) {
          if (transcriptionStatuses) {
            transcriptionStatuses.set(queueId.toString(), {
              ...transcriptionStatuses.get(queueId.toString()),
              status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
              summary: summary,
              updatedAt: Date.now()
            });
          }

          if (supabase) {
            await supabase
              .from('transcription_queue')
              .update({
                status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
                processed_at: new Date().toISOString()
              })
              .eq('id', queueId);
          }

          if (broadcastTranscriptionUpdate) {
            broadcastTranscriptionUpdate(queueId.toString(), {
              status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
              transcription: transcription,
              summary: summary,
              message: 'Processing complete!',
              timestamp: new Date().toISOString()
            });
          }

          logger.success('AI summary generated and process completed successfully');
        }
      } catch (summaryError) {
        logger.error('Summary generation failed:', summaryError);

        if (transcriptionStatuses) {
          transcriptionStatuses.set(queueId.toString(), {
            ...transcriptionStatuses.get(queueId.toString()),
            status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
            summary: null,
            updatedAt: Date.now()
          });
        }

        if (broadcastTranscriptionUpdate) {
          broadcastTranscriptionUpdate(queueId.toString(), {
            status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
            transcription: transcription,
            summary: null,
            message: 'Transcription complete (summary unavailable)',
            timestamp: new Date().toISOString()
          });
        }
      }
    } else {
      if (transcriptionStatuses) {
        transcriptionStatuses.set(queueId.toString(), {
          ...transcriptionStatuses.get(queueId.toString()),
          status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
          updatedAt: Date.now()
        });
      }

      if (supabase) {
        await supabase
          .from('transcription_queue')
          .update({
            status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
            processed_at: new Date().toISOString()
          })
          .eq('id', queueId);
      }

      if (broadcastTranscriptionUpdate) {
        broadcastTranscriptionUpdate(queueId.toString(), {
          status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
          transcription: transcription,
          message: 'Transcription complete!',
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    logger.error(`Transcription processing error for queue ${queueId}:`, error);

    if (transcriptionStatuses) {
      transcriptionStatuses.set(queueId.toString(), {
        status: CONSTANTS.TRANSCRIPTION_STATUS.FAILED,
        transcription: null,
        summary: null,
        error: error.message,
        create_user_id: create_user_id,
        updatedAt: Date.now()
      });
    }

    if (supabase) {
      const { error: updateError } = await supabase
        .from('transcription_queue')
        .update({
          status: CONSTANTS.TRANSCRIPTION_STATUS.FAILED,
          error_message: error.message,
          processed_at: new Date().toISOString(),
          retry_count: retryCount + 1
        })
        .eq('id', queueId);

      if (updateError) {
        logger.error('Error updating failed status:', updateError);
      }
    }

    if (broadcastTranscriptionUpdate) {
      broadcastTranscriptionUpdate(queueId.toString(), {
        status: CONSTANTS.TRANSCRIPTION_STATUS.FAILED,
        error: error.message,
        message: `Transcription failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }
}

/**
 * Whisper transcription endpoint
 */
async function transcribe(req, res) {
  try {
    logger.info('🎤 Received transcription request');

    if (!req.file) {
      return sendError(res, 400, 'No audio file provided', 'MISSING_FILE');
    }

    const create_user_id = req.body.create_user_id ||
      req.query.create_user_id ||
      req.headers['x-user-id'];

    if (!create_user_id) {
      logger.info('❌ Missing create_user_id in transcription request');
      return sendError(res, 400, 'create_user_id is required', 'MISSING_USER_ID');
    }

    const validation = validateUserId(create_user_id);
    if (!validation.valid) {
      return sendError(res, 400, validation.error, 'INVALID_USER_ID');
    }

    logger.info(`Processing transcription for user: ${create_user_id}`);

    const transcriptionId = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileName = `${create_user_id}/recording_${Date.now()}.webm`;

    if (!supabase) {
      return sendError(res, 503, 'Service not configured', 'SERVICE_UNAVAILABLE');
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('incident-audio')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      logger.error(`Upload error: ${uploadError.message}`);
      return sendError(res, 500, 'Failed to upload audio', 'UPLOAD_FAILED');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('incident-audio')
      .getPublicUrl(fileName);

    logger.info(`Audio file uploaded to Supabase: ${fileName}`);

    const { data: queueData, error: queueError } = await supabase
      .from('transcription_queue')
      .insert([{
        create_user_id: create_user_id,
        incident_report_id: req.body.incident_report_id || null,
        audio_url: publicUrl,
        status: CONSTANTS.TRANSCRIPTION_STATUS.PENDING,
        retry_count: 0,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (queueError) {
      logger.error('Queue error:', queueError);
    }

    const queueId = queueData?.id || transcriptionId;

    if (transcriptionStatuses) {
      transcriptionStatuses.set(queueId.toString(), {
        status: CONSTANTS.TRANSCRIPTION_STATUS.PROCESSING,
        transcription: null,
        summary: null,
        error: null,
        create_user_id: create_user_id,
        updatedAt: Date.now()
      });
    }

    res.json({
      success: true,
      message: 'Audio uploaded and queued for transcription',
      queueId: queueId.toString(),
      audioUrl: publicUrl,
      create_user_id: create_user_id,
      requestId: req.requestId
    });

    processTranscriptionFromBuffer(
      queueId,
      req.file.buffer,
      create_user_id,
      req.body.incident_report_id,
      publicUrl
    );
  } catch (error) {
    logger.error('Transcription error:', error);
    sendError(res, 500, 'Failed to process audio', 'PROCESSING_FAILED');
  }
}

/**
 * Get transcription status
 */
async function getStatus(req, res) {
  const { queueId } = req.params;

  if (!queueId || queueId === 'undefined') {
    return sendError(res, 400, 'Invalid queue ID', 'INVALID_QUEUE_ID');
  }

  const status = transcriptionStatuses?.get(queueId);

  if (status) {
    res.json({
      ...status,
      requestId: req.requestId
    });
  } else {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('transcription_queue')
          .select('*')
          .eq('id', queueId)
          .single();

        if (data) {
          res.json({
            status: data.status,
            transcription: data.transcription_text,
            error: data.error_message,
            create_user_id: data.create_user_id,
            requestId: req.requestId
          });
        } else {
          res.json({
            status: 'not_found',
            message: 'Transcription not found or expired',
            requestId: req.requestId
          });
        }
      } catch (error) {
        res.json({
          status: 'not_found',
          message: 'Transcription not found or expired',
          requestId: req.requestId
        });
      }
    } else {
      res.json({
        status: 'not_found',
        message: 'Transcription not found or expired',
        requestId: req.requestId
      });
    }
  }
}

/**
 * Update transcription
 */
async function updateTranscription(req, res) {
  try {
    const { queueId, userId, transcription } = req.body;

    if (!userId) {
      return sendError(res, 400, 'User ID required', 'MISSING_USER_ID');
    }

    if (!transcription) {
      return sendError(res, 400, 'Missing transcription text', 'MISSING_TRANSCRIPTION');
    }

    logger.info('Updating transcription', { userId, queueId });

    await gdprService.logActivity(userId, 'DATA_UPDATE', {
      type: 'transcription',
      action: 'manual_edit'
    }, req);

    // Get latest transcription to update
    const latestResult = await Transcription.getLatestTranscription(userId, false);
    
    let updateResult;
    
    if (latestResult.success && latestResult.data) {
      // Update existing transcription
      updateResult = await Transcription.updateTranscription(latestResult.data.id, {
        transcription_text: transcription,
        metadata: {
          ...latestResult.data.metadata,
          last_edited: new Date().toISOString(),
          edit_source: 'manual_update'
        }
      });
    } else {
      // Create new transcription if none exists
      updateResult = await Transcription.saveTranscription({
        create_user_id: userId,
        incident_report_id: null,
        transcription_text: transcription,
        audio_url: '',
        metadata: {
          source: 'manual_creation',
          created_via: 'update_endpoint'
        }
      });
    }

    if (!updateResult.success) {
      return sendError(res, 500, updateResult.error, 'UPDATE_FAILED');
    }

    const summary = await generateAISummary(transcription, userId, queueId || userId, supabase);

    if (queueId && broadcastTranscriptionUpdate) {
      broadcastTranscriptionUpdate(queueId, {
        type: 'updated',
        status: CONSTANTS.TRANSCRIPTION_STATUS.COMPLETED,
        transcription: transcription,
        summary: summary,
        message: 'Transcription updated successfully'
      });
    }

    res.json({
      success: true,
      summary: summary,
      transcription_id: updateResult.data?.id,
      requestId: req.requestId
    });
  } catch (error) {
    logger.error('Update transcription error', error);
    sendError(res, 500, 'Failed to update transcription', 'UPDATE_FAILED');
  }
}

/**
 * Save transcription
 */
async function saveTranscription(req, res) {
  try {
    const { userId, incidentId, transcription, audioUrl, duration } = req.body;

    if (!userId) {
      return sendError(res, 400, 'User ID required', 'MISSING_USER_ID',
        'Personal data cannot be saved without proper user identification');
    }

    if (!transcription) {
      return sendError(res, 400, 'Transcription text is required', 'MISSING_TRANSCRIPTION');
    }

    logger.info('Saving transcription', { userId });

    await gdprService.logActivity(userId, 'DATA_SAVE', {
      type: 'transcription',
      has_audio: !!audioUrl
    }, req);

    if (!supabase) {
      return res.json({
        success: true,
        message: 'Transcription received (Supabase not configured)',
        requestId: req.requestId
      });
    }

    // Use Transcription model
    const result = await Transcription.saveTranscription({
      create_user_id: userId,
      incident_report_id: incidentId,
      transcription_text: transcription,
      audio_url: audioUrl,
      metadata: {
        duration: duration,
        source: 'manual_save',
        timestamp: new Date().toISOString()
      }
    });

    if (!result.success) {
      return sendError(res, 500, result.error, 'SAVE_FAILED');
    }

    res.json({
      success: true,
      message: 'Transcription saved successfully',
      transcription_id: result.data?.id,
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Save transcription error', error);
    sendError(res, 500, 'Failed to save transcription', 'SAVE_FAILED', error.message);
  }
}

/**
 * Get latest transcription
 */
async function getLatestTranscription(req, res) {
  try {
    const { userId } = req.params;
    logger.info('Getting latest transcription', { userId });

    if (!supabase) {
      return res.json({
        exists: false,
        transcription: null,
        requestId: req.requestId
      });
    }

    await gdprService.logActivity(userId, 'DATA_ACCESS', {
      type: 'transcription_retrieval'
    }, req);

    // Use Transcription model
    const result = await Transcription.getLatestTranscription(userId);

    if (!result.success) {
      return sendError(res, 500, result.error, 'RETRIEVAL_FAILED');
    }

    if (result.data) {
      return res.json({
        exists: true,
        transcription: result.data,
        aiSummary: result.data.ai_summary || null,
        status: 'completed',
        requestId: req.requestId
      });
    }

    // Fallback to incident reports for backward compatibility
    const { data: incidentData } = await supabase
      .from('incident_reports')
      .select('witness_statement_text, witness_statement_audio')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({
      exists: !!incidentData?.witness_statement_text,
      transcription: incidentData ? {
        transcription_text: incidentData.witness_statement_text,
        audio_url: incidentData.witness_statement_audio
      } : null,
      status: incidentData?.witness_statement_text ? 'completed' : 'not_found',
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Get transcription status error', error);
    sendError(res, 500, 'Failed to get transcription status', 'RETRIEVAL_FAILED');
  }
}

/**
 * Get all transcriptions for a user
 */
async function getAllTranscriptions(req, res) {
  try {
    const { userId } = req.params;
    const { limit, offset, includeSummary } = req.query;

    const validation = validateUserId(userId);
    if (!validation.valid) {
      return sendError(res, 400, validation.error, 'INVALID_USER_ID');
    }

    await gdprService.logActivity(userId, 'DATA_ACCESS', {
      type: 'transcriptions_list'
    }, req);

    const result = await Transcription.getTranscriptionByUserId(userId, {
      limit: parseInt(limit) || 10,
      offset: parseInt(offset) || 0,
      includeSummary: includeSummary !== 'false'
    });

    if (!result.success) {
      return sendError(res, 500, result.error, 'RETRIEVAL_FAILED');
    }

    res.json({
      success: true,
      transcriptions: result.data,
      pagination: result.pagination,
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Error getting user transcriptions', error);
    sendError(res, 500, 'Failed to get transcriptions', 'RETRIEVAL_FAILED');
  }
}

module.exports = {
  initializeController,
  transcribe,
  getStatus,
  updateTranscription,
  saveTranscription,
  getLatestTranscription,
  getAllTranscriptions
};
