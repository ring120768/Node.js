const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const FormData = require('form-data');
require('dotenv').config();

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Import PDF generation modules
const { fetchAllData } = require('./lib/dataFetcher');
const { generatePDF } = require('./lib/pdfGenerator');
const { sendEmails } = require('./lib/emailService');

const app = express();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB for audio files
});

// --- MIDDLEWARE SETUP ---
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Cache control headers
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// --- AUTHENTICATION MIDDLEWARE ---
const SHARED_KEY = process.env.ZAPIER_SHARED_KEY || process.env.WEBHOOK_API_KEY || '';

function checkSharedKey(req, res, next) {
  const headerKey = req.get('X-Api-Key');
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const provided = headerKey || bearer || '';

  if (!SHARED_KEY) {
    console.warn('⚠️  No ZAPIER_SHARED_KEY/WEBHOOK_API_KEY set. Auth will fail.');
    return res.status(503).json({ error: 'Server missing shared key (ZAPIER_SHARED_KEY)' });
  }
  if (provided !== SHARED_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

function authenticateRequest(req, res, next) {
  // TODO: Implement proper authentication when needed
  console.warn('⚠️  authenticateRequest called but not fully implemented');
  next();
}

// --- SUPABASE SETUP ---
let supabase = null;
let supabaseEnabled = false;

const initSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_KEY not found');
    return false;
  }

  try {
    supabase = createClient(url, key);
    console.log('✅ Supabase initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Supabase:', error.message);
    return false;
  }
};

supabaseEnabled = initSupabase();

// --- AI SUMMARY GENERATION FUNCTION ---
async function generateAISummary(transcriptionText, createUserId, incidentId) {
  try {
    if (!process.env.OPENAI_API_KEY || !transcriptionText) {
      console.log('Cannot generate AI summary - missing API key or transcription');
      return null;
    }

    console.log('🤖 Generating AI summary for user:', createUserId);

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
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let aiAnalysis;
    try {
      const content = response.data.choices[0].message.content;
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiAnalysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      aiAnalysis = {
        summary_text: response.data.choices[0].message.content,
        key_points: ['See summary for details'],
        fault_analysis: 'Manual review recommended',
        contributing_factors: 'See summary text'
      };
    }

    // Save to ai_summary table
    const { data, error } = await supabase
      .from('ai_summary')
      .insert({
        create_user_id: createUserId,
        incident_id: incidentId || createUserId,
        summary_text: aiAnalysis.summary_text || '',
        key_points: aiAnalysis.key_points || [],
        fault_analysis: aiAnalysis.fault_analysis || '',
        liability_assessment: aiAnalysis.contributing_factors || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving AI summary to database:', error);
      return aiAnalysis; // Return analysis even if save fails
    }

    console.log('✅ AI summary generated and saved successfully');
    return aiAnalysis;

  } catch (error) {
    console.error('AI Summary generation error:', error.response?.data || error.message);
    return null;
  }
}

// --- TRANSCRIPTION QUEUE PROCESSOR ---
async function processTranscriptionQueue() {
  if (!supabaseEnabled) {
    return;
  }

  try {
    console.log('[Transcription Queue] Checking for pending transcriptions...');

    const { data: pending, error } = await supabase
      .from('transcription_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', 5)
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('[Transcription Queue] Error fetching queue:', error);
      return;
    }

    if (!pending || pending.length === 0) {
      return;
    }

    console.log(`[Transcription Queue] Processing ${pending.length} items`);

    for (const item of pending) {
      try {
        // Mark as processing
        await supabase
          .from('transcription_queue')
          .update({ status: 'processing' })
          .eq('id', item.id);

        // Download audio from Supabase URL
        const audioResponse = await axios.get(item.audio_url, {
          responseType: 'arraybuffer',
          timeout: 30000
        });

        const audioBuffer = Buffer.from(audioResponse.data);

        // Prepare for Whisper API
        const formData = new FormData();
        formData.append('file', audioBuffer, {
          filename: 'audio.webm',
          contentType: 'audio/webm'
        });
        formData.append('model', 'whisper-1');

        // Call OpenAI Whisper
        const whisperResponse = await axios.post(
          'https://api.openai.com/v1/audio/transcriptions',
          formData,
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              ...formData.getHeaders()
            },
            timeout: 60000
          }
        );

        if (!whisperResponse.data || !whisperResponse.data.text) {
          throw new Error('Invalid response from Whisper API');
        }

        const transcription = whisperResponse.data.text;

        // Save to ai_transcription table
        await supabase
          .from('ai_transcription')
          .insert({
            create_user_id: item.create_user_id,
            incident_id: item.incident_report_id || item.create_user_id,
            audio_url: item.audio_url,
            transcription: transcription,
            created_at: new Date().toISOString()
          });

        // Generate AI summary
        await generateAISummary(transcription, item.create_user_id, item.incident_report_id);

        // Update incident_reports table
        await supabase
          .from('incident_reports')
          .update({
            ai_summary_of_accident_data_transcription: transcription,
            detailed_account_of_what_happened: transcription,
            transcription_method: 'whisper_ai_queued',
            transcription_timestamp: new Date().toISOString()
          })
          .eq('id', item.incident_report_id);

        // Mark as completed
        await supabase
          .from('transcription_queue')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString(),
            transcription_text: transcription
          })
          .eq('id', item.id);

        console.log(`[Transcription Queue] Successfully processed item ${item.id}`);

      } catch (error) {
        console.error(`[Transcription Queue] Error processing item ${item.id}:`, error.message);

        const newRetryCount = (item.retry_count || 0) + 1;
        await supabase
          .from('transcription_queue')
          .update({ 
            status: newRetryCount >= 5 ? 'failed' : 'pending',
            retry_count: newRetryCount,
            error_message: error.message,
            last_retry_at: new Date().toISOString()
          })
          .eq('id', item.id);
      }
    }
  } catch (error) {
    console.error('[Transcription Queue] Fatal error:', error);
  }
}

// Schedule transcription queue processing
let transcriptionQueueInterval = null;
if (supabaseEnabled) {
  const intervalMinutes = parseInt(process.env.TRANSCRIPTION_QUEUE_INTERVAL) || 5;
  transcriptionQueueInterval = setInterval(processTranscriptionQueue, intervalMinutes * 60 * 1000);
  setTimeout(processTranscriptionQueue, 30000); // Run after 30 seconds
  console.log(`⏰ Transcription queue processor scheduled every ${intervalMinutes} minutes`);
}

// --- PDF STORAGE FUNCTION ---
async function storeCompletedForm(createUserId, pdfBuffer, allData) {
  try {
    const pdfBase64 = pdfBuffer.toString('base64');
    const fileName = `completed_forms/${createUserId}/report_${Date.now()}.pdf`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from('incident-images-secure')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    let pdfUrl = null;
    if (storageData && !storageError) {
      const { data: urlData } = await supabase.storage
        .from('incident-images-secure')
        .createSignedUrl(fileName, 31536000); // 1 year

      if (urlData) {
        pdfUrl = urlData.signedUrl;
      }
    }

    const { data, error } = await supabase
      .from('completed_incident_forms')
      .insert({
        create_user_id: createUserId,
        form_data: allData,
        pdf_base64: pdfBase64.substring(0, 1000000),
        pdf_url: pdfUrl,
        generated_at: new Date().toISOString(),
        sent_to_user: false,
        sent_to_accounts: false,
        email_status: {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing completed form:', error);
    }

    return data || { id: `temp-${Date.now()}` };
  } catch (error) {
    console.error('Error in storeCompletedForm:', error);
    return { id: `error-${Date.now()}` };
  }
}

// --- IMAGE PROCESSOR CLASS ---
class ImageProcessor {
  constructor() {
    this.supabase = supabase;
    this.bucketName = 'incident-images-secure'; // Correct bucket name
  }

  async processSignupImages(webhookData) {
    try {
      console.log('🖼️ Processing signup images for user:', webhookData.create_user_id);

      const imageFields = [
        'driving_license_picture',
        'vehicle_picture_front',
        'vehicle_picture_driver_side',
        'vehicle_picture_passenger_side',
        'vehicle_picture_back'
      ];

      const uploadedImages = {};
      const processedImages = [];

      for (const field of imageFields) {
        if (webhookData[field] && webhookData[field].startsWith('http')) {
          console.log(`  Processing ${field}...`);

          try {
            const imageBuffer = await this.downloadImage(webhookData[field]);
            const fileName = `${webhookData.create_user_id}/${field}_${Date.now()}.jpg`;
            const storagePath = await this.uploadToSupabase(imageBuffer, fileName);

            uploadedImages[field] = storagePath;

            const imageRecord = await this.createImageRecord({
              create_user_id: webhookData.create_user_id,
              image_type: field,
              storage_path: storagePath,
              original_url: webhookData[field],
              metadata: {
                upload_date: new Date().toISOString(),
                source: 'typeform_signup',
                gdpr_consent: true
              }
            });

            processedImages.push(imageRecord);
            console.log(`  ✓ ${field} uploaded successfully`);

          } catch (imgError) {
            console.error(`  ✗ Error processing ${field}:`, imgError.message);
            uploadedImages[field] = null;
          }
        }
      }

      if (Object.keys(uploadedImages).length > 0) {
        const { data: updateData, error: updateError } = await this.supabase
          .from('user_signup')
          .update(uploadedImages)
          .eq('create_user_id', webhookData.create_user_id)
          .select();

        if (updateError) {
          console.error('Error updating user_signup:', updateError);
        } else {
          console.log('✅ Updated user_signup with storage paths');
        }
      }

      return {
        success: true,
        create_user_id: webhookData.create_user_id,
        images_processed: processedImages.length,
        updated_fields: uploadedImages
      };

    } catch (error) {
      console.error('Error in processSignupImages:', error);
      throw error;
    }
  }

  async processIncidentReportFiles(webhookData) {
    try {
      console.log('📋 Processing incident report files for:', webhookData.create_user_id || webhookData.id);

      const incidentReportId = webhookData.id || webhookData.incident_report_id;
      const createUserId = webhookData.create_user_id;

      if (!incidentReportId) {
        throw new Error('Missing incident report ID');
      }

      const fileFields = [
        { field: 'file_url_documents_1', type: 'document', isImage: true },
        { field: 'file_url_documents', type: 'document', isImage: true },
        { field: 'file_url_other_vehicle', type: 'other_vehicle', isImage: true },
        { field: 'file_url_other_vehicle_1', type: 'other_vehicle_2', isImage: true },
        { field: 'file_url_record_detailed_account_of_what_happened', type: 'audio_account', isImage: false },
        { field: 'file_url_scene_overview', type: 'scene_overview', isImage: true },
        { field: 'file_url_scene_overview_1', type: 'scene_overview_2', isImage: true },
        { field: 'file_url_vehicle_damage', type: 'vehicle_damage', isImage: true },
        { field: 'file_url_vehicle_damage_1', type: 'vehicle_damage_2', isImage: true },
        { field: 'file_url_vehicle_damage_2', type: 'vehicle_damage_3', isImage: true },
        { field: 'file_url_what3words', type: 'what3words', isImage: true }
      ];

      const uploadedFiles = {};
      const processedFiles = [];

      for (const fileInfo of fileFields) {
        const { field, type, isImage } = fileInfo;

        if (webhookData[field] && webhookData[field].startsWith('http')) {
          console.log(`  Processing ${field} (${type})...`);

          try {
            const fileBuffer = await this.downloadFile(webhookData[field]);
            const url = webhookData[field].toLowerCase();

            let extension = '';
            let contentType = '';

            if (isImage) {
              if (url.includes('.jpeg') || url.includes('.jpg')) {
                extension = '.jpg';
                contentType = 'image/jpeg';
              } else if (url.includes('.png')) {
                extension = '.png';
                contentType = 'image/png';
              } else if (url.includes('.heic') || url.includes('.heif')) {
                extension = '.heic';
                contentType = 'image/heic';
              } else if (url.includes('.webp')) {
                extension = '.webp';
                contentType = 'image/webp';
              } else {
                extension = '.jpg';
                contentType = 'image/jpeg';
              }
            } else {
              if (url.includes('.mp3')) {
                extension = '.mp3';
                contentType = 'audio/mpeg';
              } else if (url.includes('.m4a')) {
                extension = '.m4a';
                contentType = 'audio/mp4';
              } else if (url.includes('.webm')) {
                extension = '.webm';
                contentType = 'audio/webm';
              } else {
                extension = '.mp3';
                contentType = 'audio/mpeg';
              }
            }

            const fileName = createUserId ? 
              `${createUserId}/incident_${incidentReportId}/${type}_${Date.now()}${extension}` : 
              `incident_${incidentReportId}/${type}_${Date.now()}${extension}`;

            const storagePath = await this.uploadToSupabase(fileBuffer, fileName, contentType);
            uploadedFiles[field] = storagePath;

            const fileRecord = await this.createImageRecord({
              create_user_id: createUserId,
              incident_report_id: incidentReportId,
              image_type: type,
              storage_path: storagePath,
              original_url: webhookData[field],
              metadata: {
                upload_date: new Date().toISOString(),
                source: 'typeform_incident',
                file_type: isImage ? 'image' : 'audio',
                file_extension: extension,
                content_type: contentType,
                gdpr_consent: true
              }
            });

            processedFiles.push(fileRecord);
            console.log(`  ✓ ${type} uploaded successfully (${extension})`);

            // If it's an audio file, queue for transcription
            if (!isImage && type === 'audio_account') {
              await this.queueTranscription(createUserId, incidentReportId, storagePath);
            }

          } catch (fileError) {
            console.error(`  ✗ Error processing ${field}:`, fileError.message);
            uploadedFiles[field] = null;
          }
        }
      }

      if (Object.keys(uploadedFiles).length > 0) {
        const { data: updateData, error: updateError } = await this.supabase
          .from('incident_reports')
          .update(uploadedFiles)
          .eq('id', incidentReportId)
          .select();

        if (updateError) {
          console.error('Error updating incident_reports:', updateError);
        } else {
          console.log('✅ Updated incident_reports with storage paths');
        }
      }

      return {
        success: true,
        incident_report_id: incidentReportId,
        create_user_id: createUserId,
        files_processed: processedFiles.length,
        updated_fields: uploadedFiles
      };

    } catch (error) {
      console.error('Error in processIncidentReportFiles:', error);
      throw error;
    }
  }

  async queueTranscription(createUserId, incidentReportId, audioPath) {
    try {
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(audioPath);

      await this.supabase
        .from('transcription_queue')
        .insert({
          create_user_id: createUserId,
          incident_report_id: incidentReportId,
          audio_url: urlData.publicUrl,
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString()
        });

      console.log('  ✓ Audio queued for transcription');
    } catch (error) {
      console.error('  ✗ Error queuing transcription:', error.message);
    }
  }

  async downloadFile(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'User-Agent': 'Car-Crash-Lawyer-AI/1.0'
        }
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error downloading file:', error.message);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  async downloadImage(url) {
    return this.downloadFile(url);
  }

  async uploadToSupabase(buffer, fileName, contentType = 'image/jpeg') {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(fileName, buffer, {
          contentType: contentType,
          upsert: false
        });

      if (error) {
        throw error;
      }

      return data.path;
    } catch (error) {
      console.error('Error uploading to Supabase:', error);
      throw new Error(`Failed to upload to storage: ${error.message}`);
    }
  }

  async createImageRecord(imageData) {
    const { data, error } = await this.supabase
      .from('incident_images')
      .insert([{
        create_user_id: imageData.create_user_id,
        incident_report_id: imageData.incident_report_id || null,
        image_type: imageData.image_type,
        file_name: imageData.storage_path,
        gdpr_consent: { consent_given: true },
        metadata: imageData.metadata,
        uploaded_at: new Date().toISOString(),
        is_anonymized: false
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating image record:', error);
      return null;
    }

    return data;
  }

  async getSignedUrl(storagePath, expiresIn = 3600) {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      throw error;
    }

    await this.logImageAccess(storagePath);
    return data.signedUrl;
  }

  async logImageAccess(storagePath, accessedBy = 'system') {
    const { error } = await this.supabase
      .from('image_access_log')
      .insert([{
        storage_path: storagePath,
        accessed_at: new Date().toISOString(),
        accessed_by: accessedBy,
        purpose: 'signed_url_generation'
      }]);

    if (error) {
      console.error('Error logging access:', error);
    }
  }

  async deleteAllUserImages(createUserId) {
    try {
      const { data: images, error: fetchError } = await this.supabase
        .from('incident_images')
        .select('file_name')
        .eq('create_user_id', createUserId);

      if (fetchError) throw fetchError;

      const deletionResults = [];
      for (const image of images) {
        const { error } = await this.supabase.storage
          .from(this.bucketName)
          .remove([image.file_name]);

        deletionResults.push({
          path: image.file_name,
          deleted: !error
        });
      }

      const { error: updateError } = await this.supabase
        .from('incident_images')
        .update({ 
          deletion_requested: new Date().toISOString(),
          deletion_completed: new Date().toISOString()
        })
        .eq('create_user_id', createUserId);

      if (updateError) throw updateError;

      return {
        images_deleted: deletionResults.filter(r => r.deleted).length,
        total_images: images.length,
        details: deletionResults
      };

    } catch (error) {
      console.error('Error deleting user images:', error);
      throw error;
    }
  }
}

// Initialize image processor
const imageProcessor = supabaseEnabled ? new ImageProcessor() : null;

// --- API CONFIGURATION ENDPOINT ---
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.ANON_PUBLIC
  });
});

// --- HEALTH CHECK ENDPOINT ---
app.get('/health', (req, res) => {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      supabase: supabaseEnabled,
      server: true,
      transcriptionQueue: transcriptionQueueInterval !== null,
      openai: !!process.env.OPENAI_API_KEY
    }
  };
  res.json(status);
});

// --- MAIN ROUTES ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- WHISPER TRANSCRIPTION ENDPOINT ---
app.post('/api/whisper/transcribe', upload.single('audio'), async (req, res) => {
  try {
    console.log('🎤 Received transcription request');

    let audioData, userId, incidentId;

    // Handle both base64 and file upload
    if (req.body.audio && req.body.audio.startsWith('data:')) {
      // Base64 audio from request body
      const base64Audio = req.body.audio.split(',')[1];
      audioData = Buffer.from(base64Audio, 'base64');
      userId = req.body.userId || req.body.create_user_id;
      incidentId = req.body.incidentId || userId;
    } else if (req.file) {
      // File upload
      audioData = req.file.buffer;
      userId = req.body.userId || req.body.create_user_id;
      incidentId = req.body.incidentId || userId;
    } else {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Save audio to Supabase storage
    const timestamp = Date.now();
    const fileName = `${userId}/audio/recording_${timestamp}.webm`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('incident-images-secure')
      .upload(fileName, audioData, {
        contentType: 'audio/webm',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload audio' });
    }

    const { data: urlData } = supabase.storage
      .from('incident-images-secure')
      .getPublicUrl(fileName);

    const audioUrl = urlData.publicUrl;

    // Queue for transcription instead of processing immediately
    const { data: queueData, error: queueError } = await supabase
      .from('transcription_queue')
      .insert({
        create_user_id: userId,
        incident_report_id: incidentId,
        audio_url: audioUrl,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (queueError) {
      console.error('Queue error:', queueError);
    }

    // Try immediate transcription if API key is available
    if (process.env.OPENAI_API_KEY) {
      try {
        const formData = new FormData();
        formData.append('file', audioData, {
          filename: 'audio.webm',
          contentType: 'audio/webm'
        });
        formData.append('model', 'whisper-1');

        const whisperResponse = await axios.post(
          'https://api.openai.com/v1/audio/transcriptions',
          formData,
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              ...formData.getHeaders()
            },
            timeout: 30000
          }
        );

        const transcription = whisperResponse.data.text;

        // Save to ai_transcription table
        await supabase
          .from('ai_transcription')
          .insert({
            create_user_id: userId,
            incident_id: incidentId,
            audio_url: audioUrl,
            transcription: transcription,
            created_at: new Date().toISOString()
          });

        // Generate AI summary
        const aiSummary = await generateAISummary(transcription, userId, incidentId);

        // Update queue status
        if (queueData) {
          await supabase
            .from('transcription_queue')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
              transcription_text: transcription
            })
            .eq('id', queueData.id);
        }

        return res.json({
          success: true,
          transcription: transcription,
          audioUrl: audioUrl,
          queueId: queueData?.id,
          aiSummary: aiSummary,
          status: 'completed'
        });

      } catch (transcribeError) {
        console.log('Immediate transcription failed, will process in queue:', transcribeError.message);
      }
    }

    // Return queued response
    res.json({
      success: true,
      transcription: null,
      audioUrl: audioUrl,
      queueId: queueData?.id,
      status: 'queued',
      message: 'Audio uploaded successfully. Transcription will be processed shortly.'
    });

  } catch (error) {
    console.error('Transcription endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to process audio',
      message: error.message 
    });
  }
});

// --- CHECK TRANSCRIPTION STATUS ---
app.get('/api/transcription-status/:queueId', async (req, res) => {
  try {
    const { queueId } = req.params;

    // First check the queue
    const { data: queueData, error: queueError } = await supabase
      .from('transcription_queue')
      .select('*')
      .eq('id', queueId)
      .single();

    if (queueData) {
      if (queueData.status === 'completed') {
        // Get the full transcription and summary
        const { data: transcriptionData } = await supabase
          .from('ai_transcription')
          .select('*')
          .eq('create_user_id', queueData.create_user_id)
          .eq('incident_id', queueData.incident_report_id || queueData.create_user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { data: summaryData } = await supabase
          .from('ai_summary')
          .select('*')
          .eq('create_user_id', queueData.create_user_id)
          .eq('incident_id', queueData.incident_report_id || queueData.create_user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return res.json({
          status: 'completed',
          transcription: transcriptionData?.transcription || queueData.transcription_text,
          aiSummary: summaryData,
          audioUrl: queueData.audio_url
        });
      }

      return res.json({
        status: queueData.status,
        error: queueData.error_message,
        retryCount: queueData.retry_count
      });
    }

    res.json({ status: 'not_found' });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// --- UPDATE TRANSCRIPTION ---
app.post('/api/update-transcription', async (req, res) => {
  try {
    const { queueId, userId, transcription } = req.body;

    if (!userId || !transcription) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update or create ai_transcription record
    const { data: existing } = await supabase
      .from('ai_transcription')
      .select('id')
      .eq('create_user_id', userId)
      .single();

    if (existing) {
      await supabase
        .from('ai_transcription')
        .update({
          transcription: transcription,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('ai_transcription')
        .insert({
          create_user_id: userId,
          incident_id: userId,
          transcription: transcription,
          created_at: new Date().toISOString()
        });
    }

    // Generate AI summary
    await generateAISummary(transcription, userId, userId);

    res.json({ success: true });

  } catch (error) {
    console.error('Update transcription error:', error);
    res.status(500).json({ error: 'Failed to update transcription' });
  }
});

// --- WEBHOOK ENDPOINTS ---
app.post('/webhook/signup', checkSharedKey, async (req, res) => {
  try {
    console.log('📝 Signup webhook received');

    if (!supabaseEnabled || !imageProcessor) {
      return res.status(503).json({ error: 'Service not configured' });
    }

    const webhookData = req.body;

    if (!webhookData.create_user_id) {
      return res.status(400).json({ error: 'Missing create_user_id' });
    }

    // Process asynchronously
    imageProcessor.processSignupImages(webhookData)
      .then(result => {
        console.log('✅ Signup processing complete:', result);
      })
      .catch(error => {
        console.error('❌ Signup processing failed:', error);
      });

    res.status(200).json({ 
      success: true, 
      message: 'Signup processing started',
      create_user_id: webhookData.create_user_id 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/webhook/incident-report', checkSharedKey, async (req, res) => {
  try {
    console.log('🚨 Incident report webhook received');

    if (!supabaseEnabled || !imageProcessor) {
      return res.status(503).json({ error: 'Service not configured' });
    }

    const webhookData = req.body;

    if (!webhookData.id && !webhookData.incident_report_id) {
      return res.status(400).json({ error: 'Missing incident report ID' });
    }

    // Process asynchronously
    imageProcessor.processIncidentReportFiles(webhookData)
      .then(result => {
        console.log('✅ Incident processing complete:', result);
      })
      .catch(error => {
        console.error('❌ Incident processing failed:', error);
      });

    res.status(200).json({ 
      success: true, 
      message: 'Incident processing started',
      incident_report_id: webhookData.id || webhookData.incident_report_id 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// --- PDF GENERATION ENDPOINTS ---
app.post('/generate-pdf', checkSharedKey, async (req, res) => {
  const { create_user_id } = req.body;

  if (!create_user_id) {
    return res.status(400).json({ 
      error: 'Missing create_user_id'
    });
  }

  if (!supabaseEnabled) {
    return res.status(503).json({ 
      error: 'Service not configured'
    });
  }

  try {
    console.log(`📄 Starting PDF generation for: ${create_user_id}`);

    // Fetch all data including AI summaries
    const allData = await fetchAllData(create_user_id);

    // Include AI data
    const { data: aiTranscription } = await supabase
      .from('ai_transcription')
      .select('*')
      .eq('create_user_id', create_user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const { data: aiSummary } = await supabase
      .from('ai_summary')
      .select('*')
      .eq('create_user_id', create_user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (aiTranscription) {
      allData.aiTranscription = aiTranscription;
    }
    if (aiSummary) {
      allData.aiSummary = aiSummary;
    }

    // Generate PDF
    const pdfBuffer = await generatePDF(allData);

    // Store PDF
    const storedForm = await storeCompletedForm(create_user_id, pdfBuffer, allData);

    // Send emails
    const emailResult = await sendEmails(
      allData.user.driver_email, 
      pdfBuffer, 
      create_user_id
    );

    // Update status
    if (storedForm.id && !storedForm.id.startsWith('temp-')) {
      await supabase
        .from('completed_incident_forms')
        .update({
          sent_to_user: emailResult.success,
          sent_to_accounts: emailResult.success,
          email_status: emailResult
        })
        .eq('id', storedForm.id);
    }

    console.log('✅ PDF generation complete');

    res.json({
      success: true,
      message: 'PDF generated and sent successfully',
      form_id: storedForm.id,
      create_user_id,
      email_sent: emailResult.success,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      error: error.message
    });
  }
});

// --- ERROR HANDLING ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path 
  });
});

// --- GRACEFUL SHUTDOWN ---
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  if (transcriptionQueueInterval) {
    clearInterval(transcriptionQueueInterval);
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  if (transcriptionQueueInterval) {
    clearInterval(transcriptionQueueInterval);
  }
  process.exit(0);
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('🚗 Car Crash Lawyer AI - Production Ready');
  console.log(`🚀 Server running on port ${PORT}`);

  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    console.log(`🌐 Public: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
  }

  console.log('\n📊 Service Status:');
  console.log(`   Supabase: ${supabaseEnabled ? '✅ Connected' : '❌ Not configured'}`);
  console.log(`   OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Transcription Queue: ${transcriptionQueueInterval ? '✅ Running' : '❌ Not running'}`);
  console.log(`   Auth Key: ${SHARED_KEY ? '✅ Set' : '❌ Missing'}`);

  console.log('\n✅ Server ready for production!');
});

module.exports = app;