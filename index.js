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
  limits: { fileSize: 50 * 1024 * 1024 } // Increased to 50MB for audio files
});

// --- MIDDLEWARE SETUP ---
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Add cache-control headers to prevent caching of HTML files
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
  console.log(new Date().toISOString() + ' - ' + req.method + ' ' + req.path);
  next();
});

// --- AUTHENTICATION MIDDLEWARE ---
const SHARED_KEY = process.env.ZAPIER_SHARED_KEY || process.env.WEBHOOK_API_KEY || '';

// For webhook endpoints from Zapier
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

// For API endpoints - placeholder for actual auth implementation
function authenticateRequest(req, res, next) {
  // TODO: Implement proper authentication
  // For now, pass through but log warning
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

// --- TRANSCRIPTION QUEUE PROCESSOR ---
/**
 * Process pending transcriptions from queue
 * Runs every 5 minutes by default, configurable via TRANSCRIPTION_QUEUE_INTERVAL
 */
async function processTranscriptionQueue() {
  if (!supabaseEnabled) {
    return;
  }

  try {
    console.log('[Transcription Queue] Checking for pending transcriptions...');

    // Get pending transcriptions from queue
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
      return; // Nothing to process
    }

    console.log('[Transcription Queue] Processing ' + pending.length + ' items');

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
              'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
              ...formData.getHeaders()
            },
            timeout: 60000 // 60 second timeout for Whisper
          }
        );

        if (!whisperResponse.data || !whisperResponse.data.text) {
          throw new Error('Invalid response from Whisper API');
        }

        const transcription = whisperResponse.data.text;

        // Update incident_reports table with transcription
        const { error: updateError } = await supabase
          .from('incident_reports')
          .update({
            ai_summary_of_accident_data_transcription: transcription,
            detailed_account_of_what_happened: transcription,
            transcription_method: 'whisper_ai_queued',
            transcription_timestamp: new Date().toISOString()
          })
          .eq('id', item.incident_report_id);

        if (updateError) throw updateError;

        // Mark as completed in queue
        await supabase
          .from('transcription_queue')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString(),
            transcription_text: transcription
          })
          .eq('id', item.id);

        console.log('[Transcription Queue] Successfully transcribed incident ' + item.incident_report_id);

      } catch (error) {
        console.error('[Transcription Queue] Error processing item ' + item.id + ':' + error.message);

        // Update retry count
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
  // Get interval from env or default to 5 minutes
  const intervalMinutes = parseInt(process.env.TRANSCRIPTION_QUEUE_INTERVAL) || 5;
  transcriptionQueueInterval = setInterval(processTranscriptionQueue, intervalMinutes * 60 * 1000);

  // Also run 30 seconds after server starts
  setTimeout(processTranscriptionQueue, 30000);

  console.log('⏰ Transcription queue processor scheduled to run every ' + intervalMinutes + ' minutes');
}

// --- PDF STORAGE FUNCTION ---
/**
 * Store completed PDF form in database
 */
async function storeCompletedForm(createUserId, pdfBuffer, allData) {
  try {
    // Convert buffer to base64 for storage
    const pdfBase64 = pdfBuffer.toString('base64');

    // Store in Supabase storage
    const fileName = 'completed_forms/' + createUserId + '/report_' + Date.now() + '.pdf';
    const { data: storageData, error: storageError } = await supabase.storage
      .from('incident-images-secure')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    let pdfUrl = null;
    if (storageData && !storageError) {
      // Generate a long-lived signed URL (1 year)
      const { data: urlData } = await supabase.storage
        .from('incident-images-secure')
        .createSignedUrl(fileName, 31536000); // 1 year

      if (urlData) {
        pdfUrl = urlData.signedUrl;
      }
    }

    // Store record in database
    const { data, error } = await supabase
      .from('completed_incident_forms')
      .insert({
        create_user_id: createUserId,
        form_data: allData,
        pdf_base64: pdfBase64.substring(0, 1000000), // Store first 1MB if needed
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
      // Don't throw - continue anyway
    }

    return data || { id: 'temp-' + Date.now() };
  } catch (error) {
    console.error('Error in storeCompletedForm:', error);
    return { id: 'error-' + Date.now() };
  }
}

// --- IMAGE PROCESSOR CLASS ---
class ImageProcessor {
  constructor() {
    this.supabase = supabase;
    this.bucketName = 'incident-images-secure';
  }

  /**
   * Process images from Zapier webhook for signup
   */
  async processSignupImages(webhookData) {
    try {
      console.log('🖼️ Processing signup images for user:', webhookData.create_user_id);

      // Image fields to process for signup
      const imageFields = [
        'driving_license_picture',
        'vehicle_picture_front',
        'vehicle_picture_driver_side',
        'vehicle_picture_passenger_side',
        'vehicle_picture_back'
      ];

      const uploadedImages = {};
      const processedImages = [];

      // Process each image field
      for (const field of imageFields) {
        if (webhookData[field] && webhookData[field].startsWith('http')) {
          console.log('  Processing ' + field + '...');

          try {
            // Download image from Typeform
            const imageBuffer = await this.downloadImage(webhookData[field]);

            // Generate unique filename using create_user_id
            const fileName = webhookData.create_user_id + '/' + field + '_' + Date.now() + '.jpg';

            // Upload to Supabase storage
            const storagePath = await this.uploadToSupabase(imageBuffer, fileName);

            // Store the Supabase storage path
            uploadedImages[field] = storagePath;

            // Create record in incident_images table
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
            console.log('  ✓ ' + field + ' uploaded successfully');

          } catch (imgError) {
            console.error('  ✗ Error processing ' + field + ':' + imgError.message);
            uploadedImages[field] = null; // Set to null if failed
          }
        }
      }

      // Update user_signup record with new Supabase storage paths
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

  /**
   * Process incident report files (images and audio) from Zapier webhook
   */
  async processIncidentReportFiles(webhookData) {
    try {
      console.log('📋 Processing incident report files for:', webhookData.create_user_id || webhookData.id);

      // Get the incident report ID from the webhook data
      const incidentReportId = webhookData.id || webhookData.incident_report_id;
      const createUserId = webhookData.create_user_id;

      if (!incidentReportId) {
        throw new Error('Missing incident report ID');
      }

      // Image and audio fields to process for incident reports
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

      // Process each file field
      for (const fileInfo of fileFields) {
        const { field, type, isImage } = fileInfo;

        if (webhookData[field] && webhookData[field].startsWith('http')) {
          console.log('  Processing ' + field + ' (' + type + ')...');

          try {
            // Download file from Typeform
            const fileBuffer = await this.downloadFile(webhookData[field]);

            // Detect file type from URL
            const url = webhookData[field].toLowerCase();
            let extension = '';
            let contentType = '';

            if (isImage) {
              // Handle various image formats from mobile devices
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
                // Default to JPEG for unknown image types
                extension = '.jpg';
                contentType = 'image/jpeg';
              }
            } else {
              // Handle various audio formats from mobile devices
              if (url.includes('.mp3')) {
                extension = '.mp3';
                contentType = 'audio/mpeg';
              } else if (url.includes('.m4a')) {
                extension = '.m4a';
                contentType = 'audio/mp4';
              } else if (url.includes('.aac')) {
                extension = '.aac';
                contentType = 'audio/aac';
              } else if (url.includes('.wav')) {
                extension = '.wav';
                contentType = 'audio/wav';
              } else if (url.includes('.webm')) {
                extension = '.webm';
                contentType = 'audio/webm';
              } else if (url.includes('.ogg')) {
                extension = '.ogg';
                contentType = 'audio/ogg';
              } else {
                // Default to MP3 for unknown audio types
                extension = '.mp3';
                contentType = 'audio/mpeg';
              }
            }

            // Generate unique filename using user ID and incident report ID
            const fileName = createUserId ? 
              createUserId + '/incident_' + incidentReportId + '/' + type + '_' + Date.now() + extension : 
              'incident_' + incidentReportId + '/' + type + '_' + Date.now() + extension;

            // Upload to Supabase storage with appropriate content type
            const storagePath = await this.uploadToSupabase(fileBuffer, fileName, contentType);

            // Store the Supabase storage path
            uploadedFiles[field] = storagePath;

            // Create record in incident_images table (also used for audio files)
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
            console.log('  ✓ ' + type + ' uploaded successfully (' + extension + ')');

          } catch (fileError) {
            console.error('  ✗ Error processing ' + field + ':' + fileError.message);
            uploadedFiles[field] = null; // Set to null if failed
          }
        }
      }

      // Update incident_reports record with new Supabase storage paths
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

  /**
   * Download file from URL (works for both images and audio)
   */
  async downloadFile(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000, // Increased timeout for larger files
        headers: {
          'User-Agent': 'Car-Crash-Lawyer-AI/1.0'
        }
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error downloading file:', error.message);
      throw new Error('Failed to download file: ' + error.message);
    }
  }

  /**
   * Download image from URL (kept for backward compatibility)
   */
  async downloadImage(url) {
    return this.downloadFile(url);
  }

  /**
   * Upload file to Supabase storage
   */
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
      throw new Error('Failed to upload to storage: ' + error.message);
    }
  }

  /**
   * Create record in incident_images table
   * Updated to handle both signup and incident report files
   */
  async createImageRecord(imageData) {
    const { data, error } = await this.supabase
      .from('incident_images')
      .insert([{
        create_user_id: imageData.create_user_id,
        incident_report_id: imageData.incident_report_id || null,
        image_type: imageData.image_type,
        file_name: imageData.storage_path, // Using file_name column for storage path
        gdpr_consent: { consent_given: true }, // User consented via form
        metadata: imageData.metadata,
        uploaded_at: new Date().toISOString(),
        is_anonymized: false
        // file_id will auto-generate via default
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating image record:', error);
      // Don't throw - we can continue even if this fails
      return null;
    }

    return data;
  }

  /**
   * Generate signed URL for secure image access
   */
  async getSignedUrl(storagePath, expiresIn = 3600) {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      throw error;
    }

    // Log access
    await this.logImageAccess(storagePath);

    return data.signedUrl;
  }

  /**
   * Log image access for GDPR compliance
   */
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

  /**
   * Delete all images for a user (GDPR compliance)
   */
  async deleteAllUserImages(createUserId) {
    try {
      // Get all images for the user
      const { data: images, error: fetchError } = await this.supabase
        .from('incident_images')
        .select('file_name') // Using file_name instead of storage_path
        .eq('create_user_id', createUserId);

      if (fetchError) throw fetchError;

      // Delete from storage
      const deletionResults = [];
      for (const image of images) {
        const { error } = await this.supabase.storage
          .from(this.bucketName)
          .remove([image.file_name]); // Using file_name

        deletionResults.push({
          path: image.file_name,
          deleted: !error
        });
      }

      // Mark as deleted in database
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

// --- UTILITY FUNCTIONS ---
function processTypeformData(formResponse) {
  const processedData = {};

  if (formResponse.form_response && formResponse.form_response.answers) {
    formResponse.form_response.answers.forEach(answer => {
      const fieldId = answer.field.id;
      const fieldRef = answer.field.ref;

      let value = null;
      if (answer.text) value = answer.text;
      else if (answer.email) value = answer.email;
      else if (answer.phone_number) value = answer.phone_number;
      else if (answer.number) value = answer.number;
      else if (answer.boolean !== undefined) value = answer.boolean;
      else if (answer.choice) value = answer.choice.label;
      else if (answer.choices) value = answer.choices.map(c => c.label);
      else if (answer.date) value = answer.date;
      else if (answer.url) value = answer.url;
      else if (answer.file_url) value = answer.file_url;

      if (value !== null) {
        processedData[fieldId] = value;
        if (fieldRef) processedData[fieldRef] = value;
      }
    });
  }

  // --- AI SUMMARY GENERATION FUNCTION ---
  /**
   * Generate AI summary from transcription text
   * This populates pages 13-14 of the PDF report
   */
  async function generateAISummary(transcriptionText, createUserId, incidentId) {
    try {
      if (!process.env.OPENAI_API_KEY || !transcriptionText) {
        console.log('Cannot generate AI summary - missing API key or transcription');
        return null;
      }

      console.log('Generating AI summary for user:', createUserId);

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
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
          max_tokens: 1000
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
        // Clean up response in case it has markdown formatting
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        aiAnalysis = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        // Fallback structure if AI doesn't return valid JSON
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
        // Return the analysis even if save fails
        return aiAnalysis;
      }

      console.log('AI summary generated and saved successfully');
      return aiAnalysis;

    } catch (error) {
      console.error('AI Summary generation error:', error.response?.data || error.message);
      return null;
    }
  }
  processedData.submitted_at = formResponse.form_response?.submitted_at || new Date().toISOString();
  processedData.form_id = formResponse.form_response?.form_id;
  processedData.response_id = formResponse.form_response?.token;

  return processedData;
}

// --- API CONFIGURATION ENDPOINT ---
/**
 * Serve Supabase configuration to frontend
 * This allows the report-complete.html page to get credentials
 */
app.get('/api/config', (req, res) => {
  // Only serve the public anon key (safe for frontend)
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
      transcriptionQueue: transcriptionQueueInterval !== null
    }
  };
  res.json(status);
});

// --- MAIN ROUTES ---
app.get('/', (req, res) => {
  const htmlContent = '<!DOCTYPE html><html><head><title>Car Crash Lawyer AI</title>' +
    '<style>body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }' +
    '.container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }' +
    'h1 { color: #333; }' +
    '.status { padding: 10px; background: #4CAF50; color: white; border-radius: 5px; display: inline-block; }' +
    '.endpoint { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; }' +
    'code { background: #333; color: #4CAF50; padding: 2px 6px; border-radius: 3px; }' +
    '</style></head><body><div class="container">' +
    '<h1>🚗 Car Crash Lawyer AI - GDPR Compliant System</h1>' +
    '<p class="status">✅ Server is running</p>' +
    '<h2>Available Endpoints:</h2>' +
    '<div class="endpoint"><strong>Health Check:</strong><br><code>GET /health</code></div>' +
    '<div class="endpoint"><strong>Configuration:</strong><br><code>GET /api/config</code> - Get Supabase config for frontend</div>' +
    '<div class="endpoint"><strong>Webhooks:</strong><br>' +
    '<code>POST /webhook/signup</code> - Process signup images<br>' +
    '<code>POST /webhook/incident-report</code> - Process incident report files<br>' +
    '<code>POST /webhook/process-images</code> - Alternative image processing endpoint<br>' +
    '<code>POST /zaphook</code> - Generic secure Zapier endpoint<br>' +
    '<code>POST /generate-pdf</code> - Generate and email PDF report<br>' +
    '<code>POST /webhook/generate-pdf</code> - Webhook for PDF generation</div>' +
    '<div class="endpoint"><strong>API Endpoints:</strong><br>' +
    '<code>GET /api/auth/status</code> - Check authentication status<br>' +
    '<code>GET /api/user/:userId/emergency-contacts</code> - Get emergency contacts<br>' +
    '<code>POST /api/log-emergency-call</code> - Log emergency calls<br>' +
    '<code>GET /api/what3words</code> - Get What3Words location<br>' +
    '<code>POST /api/save-transcription</code> - Save audio transcription<br>' +
    '<code>POST /api/transcribe</code> - Transcribe audio with resilient queue<br>' +
    '<code>POST /api/whisper/transcribe</code> - Direct Whisper transcription<br>' +
    '<code>GET /api/transcription-status/:userId</code> - Check transcription status</div>' +
    '<div class="endpoint"><strong>Image Management:</strong><br>' +
    '<code>GET /api/images/:userId</code> - Get user images<br>' +
    '<code>GET /api/image/signed-url/:userId/:imageType</code> - Get signed URL<br>' +
    '<code>POST /api/upload-what3words-image</code> - Upload what3words screenshot<br>' +
    '<code>DELETE /api/gdpr/delete-images</code> - GDPR deletion</div>' +
    '<div class="endpoint"><strong>PDF Generation:</strong><br>' +
    '<code>GET /pdf-status/:userId</code> - Check PDF generation status<br>' +
    '<code>GET /download-pdf/:userId</code> - Download generated PDF</div>' +
    '<p><strong>Supabase Status:</strong> ' + (supabaseEnabled ? '✅ Connected' : '❌ Not configured') + '</p>' +
    '<p><strong>Transcription Queue:</strong> ' + (transcriptionQueueInterval ? '✅ Running' : '❌ Not running') + '</p>' +
    '</div></body></html>';

  res.send(htmlContent);
});

// --- NEW API ENDPOINTS FOR INCIDENT FLOW ---

/**
 * Check authentication status
 */
app.get('/api/auth/status', (req, res) => {
  // TODO: Implement proper session/auth check
  // For now, return mock data for testing
  const mockUser = {
    authenticated: false,
    user: null
  };

  // If you have session management, check it here
  if (req.session && req.session.user) {
    mockUser.authenticated = true;
    mockUser.user = {
      uid: req.session.user.id,
      email: req.session.user.email,
      fullName: req.session.user.full_name
    };
  }

  res.json(mockUser);
});

/**
 * Get user emergency contacts
 */
app.get('/api/user/:userId/emergency-contacts', authenticateRequest, async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({ error: 'Service not configured' });
  }

  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('user_signup')
      .select('emergency_contact, recovery_breakdown_number, emergency_services_number')
      .eq('create_user_id', userId)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      emergency_contact: data.emergency_contact || null,
      recovery_breakdown_number: data.recovery_breakdown_number || null,
      emergency_services_number: data.emergency_services_number || '999'
    });
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

/**
 * Log emergency calls for record keeping
 */
app.post('/api/log-emergency-call', authenticateRequest, async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({ error: 'Service not configured' });
  }

  try {
    const { user_id, service_called, timestamp, incident_id } = req.body;

    // Create emergency_call_logs table if it doesn't exist
    // Note: In production, this should be done via migration
    const { data, error } = await supabase
      .from('emergency_call_logs')
      .insert({
        user_id,
        service_called,
        incident_id: incident_id || null,
        timestamp,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log emergency call:', error);
      // Don't fail the request if logging fails
      return res.json({ success: false, logged: false });
    }

    res.json({ success: true, logged: true });
  } catch (error) {
    console.error('Error logging emergency call:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * What3Words API endpoint
 */
app.get('/api/what3words', async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Missing latitude or longitude' });
    }

    const W3W_API_KEY = process.env.WHAT3WORDS_API_KEY;

    if (!W3W_API_KEY) {
      console.warn('What3Words API key not configured');
      return res.json({ words: 'location.not.configured' });
    }

    // Call What3Words API
    const response = await axios.get(
      'https://api.what3words.com/v3/convert-to-3wa?coordinates=' + lat + ',' + lng + '&key=' + W3W_API_KEY
    );

    if (response.data && response.data.words) {
      res.json({ words: response.data.words });
    } else {
      res.json({ words: 'location.not.found' });
    }
  } catch (error) {
    console.error('What3Words API error:', error);
    res.json({ words: 'api.error.occurred' });
  }
});

/**
 * Upload what3words screenshot
 */
app.post('/api/upload-what3words-image', upload.single('image'), async (req, res) => {
  if (!supabaseEnabled || !imageProcessor) {
    return res.status(503).json({ error: 'Service not configured' });
  }

  try {
    // Handle both multipart form data and base64 JSON
    let buffer;
    let what3words, latitude, longitude, userId;

    if (req.file) {
      // Multipart form data
      buffer = req.file.buffer;
      ({ what3words, latitude, longitude, userId } = req.body);
    } else {
      // Base64 JSON data
      const { imageData } = req.body;
      if (!imageData) {
        return res.status(400).json({ error: 'No image data provided' });
      }

      // Convert base64 to buffer
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
      ({ what3words, latitude, longitude, userId } = req.body);
    }

    // Create filename with what3words location
    const safeWhat3Words = what3words ? what3words.replace(/[\/\\.]/g, '-') : 'unknown';
    const timestamp = Date.now();
    const fileName = (userId || 'anonymous') + '/what3words/' + timestamp + '_' + safeWhat3Words + '.png';

    // Upload to Supabase storage
    const storagePath = await imageProcessor.uploadToSupabase(
      buffer, 
      fileName, 
      'image/png'
    );

    // Create record in incident_images table
    const imageRecord = await imageProcessor.createImageRecord({
      create_user_id: userId || null,
      incident_report_id: null, // Will be updated later when incident is created
      image_type: 'what3words_screenshot',
      storage_path: storagePath,
      original_url: null,
      metadata: {
        upload_date: new Date().toISOString(),
        source: 'web_capture',
        what3words: what3words,
        latitude: parseFloat(latitude) || null,
        longitude: parseFloat(longitude) || null,
        captured_at: new Date().toISOString(),
        gdpr_consent: true
      }
    });

    // Generate a signed URL for immediate access
    const signedUrl = await imageProcessor.getSignedUrl(storagePath, 3600);

    res.json({
      success: true,
      imageUrl: signedUrl,
      storagePath: storagePath,
      imageRecord: imageRecord
    });

  } catch (error) {
    console.error('Error uploading what3words image:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Transcribe audio with queue fallback for weak signal
 * This is the new resilient endpoint that merges with existing functionality
 */
app.post('/api/transcribe', checkSharedKey, upload.single('audio'), async (req, res) => {
  try {
    const { create_user_id, incident_report_id } = req.body;

    if (!create_user_id || !incident_report_id) {
      return res.status(400).json({ 
        error: 'Missing create_user_id or incident_report_id' 
      });
    }

    // First, save the audio file to Supabase if provided
    let audioUrl = req.body.audio_url; // Use provided URL if available

    if (req.file && !audioUrl) {
      // Upload audio to Supabase storage
      const timestamp = Date.now();
      const fileName = create_user_id + '/incident_' + incident_report_id + '/audio_' + timestamp + '.webm';

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('incident-images-secure')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype || 'audio/webm',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Failed to upload audio:', uploadError);
        return res.status(500).json({ error: 'Failed to save audio' });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('incident-images-secure')
        .getPublicUrl(fileName);

      audioUrl = urlData.publicUrl;

      // Update incident report with audio URL
      await supabase
        .from('incident_reports')
        .update({
          file_url_record_detailed_account_of_what_happened: audioUrl,
          audio_statement_recorded: true,
          audio_statement_timestamp: new Date().toISOString()
        })
        .eq('create_user_id', create_user_id)
        .eq('id', incident_report_id);
    }

    // Try to transcribe immediately if we have OpenAI API key
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (OPENAI_API_KEY && req.file) {
      try {
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
          filename: 'audio.webm',
          contentType: req.file.mimetype || 'audio/webm'
        });
        formData.append('model', 'whisper-1');

        // Try to transcribe with a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await axios.post(
          'https://api.openai.com/v1/audio/transcriptions',
          formData,
          {
            headers: {
              'Authorization': 'Bearer ' + OPENAI_API_KEY,
              ...formData.getHeaders()
            },
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);

        if (response.data && response.data.text) {
          // Update database with transcription
          await supabase
            .from('incident_reports')
            .update({
              ai_summary_of_accident_data_transcription: response.data.text,
              detailed_account_of_what_happened: response.data.text,
              transcription_method: 'whisper_ai_immediate'
            })
            .eq('create_user_id', create_user_id)
            .eq('id', incident_report_id);

          return res.json({ 
            transcription: response.data.text,
            status: 'success',
            audio_url: audioUrl
          });
        }
      } catch (transcribeError) {
        console.log('Immediate transcription failed, queuing for retry:', transcribeError.message);
        // Fall through to queue logic
      }
    }

    // Queue for background processing if immediate transcription failed or unavailable
    if (audioUrl) {
      const { error: queueError } = await supabase
        .from('transcription_queue')
        .insert({
          create_user_id: create_user_id,
          incident_report_id: parseInt(incident_report_id),
          audio_url: audioUrl,
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString()
        });

      if (queueError) {
        console.error('Failed to queue transcription:', queueError);
      }
    }

    // Return success even if transcription is pending
    res.json({ 
      transcription: '[Audio saved - transcription pending]',
      status: 'queued',
      audio_url: audioUrl,
      message: 'Audio saved successfully. Transcription will be processed shortly.'
    });

  } catch (error) {
    console.error('Transcribe endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to process audio',
      message: error.message 
    });
  }
});

/**
 * ENHANCED OpenAI Whisper transcription endpoint for transcribe.html page
 * This replaces the basic version with full functionality
 */
app.post('/api/whisper/transcribe', upload.single('audio'), async (req, res) => {
  try {
    console.log('Received transcription request from transcribe.html');

    // Get user and incident IDs
    const userId = req.body.userId || req.body.create_user_id;
    const incidentId = req.body.incidentId || userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Step 1: Upload audio to Supabase storage
    const timestamp = Date.now();
    const fileExt = req.file.originalname ? req.file.originalname.split('.').pop() : 'webm';
    const fileName = `audio_statement_${timestamp}.${fileExt}`;
    const storagePath = `${userId}/audio/${fileName}`;

    console.log('Uploading audio to Supabase:', storagePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('incident-images-secure')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype || 'audio/webm',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload audio file' });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('incident-images-secure')
      .getPublicUrl(storagePath);

    const audioUrl = urlData.publicUrl;
    console.log('Audio uploaded to:', audioUrl);

    // Step 2: Transcribe using OpenAI Whisper API
    let transcription = '';

    if (process.env.OPENAI_API_KEY) {
      try {
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
          filename: req.file.originalname || 'audio.webm',
          contentType: req.file.mimetype || 'audio/webm'
        });
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');
        formData.append('response_format', 'json');

        const whisperResponse = await axios.post(
          'https://api.openai.com/v1/audio/transcriptions',
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          }
        );

        transcription = whisperResponse.data.text;
        console.log('Transcription successful:', transcription.substring(0, 100) + '...');

      } catch (whisperError) {
        console.error('Whisper API error:', whisperError.response?.data || whisperError.message);
        // Continue without transcription rather than failing completely
        transcription = 'Transcription pending - audio file saved successfully';
      }
    } else {
      console.log('OpenAI API key not configured - saving audio only');
      transcription = 'Transcription service not configured - audio file saved';
    }

    // Step 3: Save transcription to database (create table first if needed)
    try {
      const { data: transcriptionData, error: dbError } = await supabase
        .from('ai_transcription')
        .insert({
          create_user_id: userId,
          incident_id: incidentId,
          audio_url: audioUrl,
          transcription: transcription,
          duration: req.body.duration || 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error (table may not exist yet):', dbError);
        // Don't fail if database insert fails - we still have the audio
      }
    } catch (dbErr) {
      console.error('Error saving to ai_transcription table:', dbErr);
    }

    // Step 4: Update incident_reports table with audio reference
    await supabase
      .from('incident_reports')
      .update({
        witness_statement_audio: audioUrl,
        witness_statement_text: transcription,
        updated_at: new Date().toISOString()
      })
      .eq('create_user_id', userId);

    // Return success response
    res.json({
      success: true,
      transcription: transcription,
      audioUrl: audioUrl,
      duration: req.body.duration || 0
    });

  } catch (error) {
    console.error('Transcription endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to process audio',
      message: error.message 
    });
  }
});

/**
 * ENHANCED Save transcription endpoint for transcribe.html
 */
app.post('/api/save-transcription', async (req, res) => {
  try {
    const { userId, incidentId, transcription, audioUrl, duration } = req.body;

    if (!userId || !transcription) {
      return res.status(400).json({ error: 'User ID and transcription are required' });
    }

    if (!supabaseEnabled) {
      // If Supabase isn't configured, just acknowledge receipt
      return res.json({ 
        success: true, 
        message: 'Transcription received (Supabase not configured)' 
      });
    }

    // Try to save to ai_transcription table
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('ai_transcription')
        .select('id')
        .eq('create_user_id', userId)
        .eq('incident_id', incidentId || userId)
        .single();

      let result;

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('ai_transcription')
          .update({
            transcription: transcription,
            audio_url: audioUrl || existing.audio_url,
            duration: duration || existing.duration,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        result = data;
        if (error) throw error;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('ai_transcription')
          .insert({
            create_user_id: userId,
            incident_id: incidentId || userId,
            transcription: transcription,
            audio_url: audioUrl || '',
            duration: duration || 0,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        result = data;
        if (error) throw error;
      }
    } catch (tableError) {
      console.log('ai_transcription table may not exist yet:', tableError.message);
    }

    // Also update incident_reports
    await supabase
      .from('incident_reports')
      .update({
        witness_statement_text: transcription,
        witness_statement_audio: audioUrl || undefined,
        updated_at: new Date().toISOString()
      })
      .eq('create_user_id', userId);

    res.json({ success: true, message: 'Transcription saved successfully' });

  } catch (error) {
    console.error('Save transcription error:', error);
    res.status(500).json({ 
      error: 'Failed to save transcription',
      message: error.message 
    });
  }
});

/**
 * NEW: Get transcription status for a user
 */
app.get('/api/transcription-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!supabaseEnabled) {
      return res.json({ exists: false, transcription: null });
    }

    // First try ai_transcription table
    const { data, error } = await supabase
      .from('ai_transcription')
      .select('*')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      return res.json({
        exists: true,
        transcription: data
      });
    }

    // Fall back to checking incident_reports
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
        transcription: incidentData.witness_statement_text,
        audio_url: incidentData.witness_statement_audio
      } : null
    });

  } catch (error) {
    console.error('Get transcription status error:', error);
    res.status(500).json({ error: 'Failed to get transcription status' });
  }
});

// --- WEBHOOK ENDPOINTS ---

/**
 * Main webhook endpoint for processing signup images from Zapier
 * This should be called AFTER Zapier has created the user_signup record
 */
app.post('/webhook/signup', checkSharedKey, async (req, res) => {
  try {
    console.log('📝 Signup image processing webhook received from Zapier');

    if (!supabaseEnabled || !imageProcessor) {
      return res.status(503).json({ error: 'Service not configured' });
    }

    const webhookData = req.body;

    // Validate required fields - now checking for create_user_id
    if (!webhookData.create_user_id) {
      return res.status(400).json({ error: 'Missing create_user_id' });
    }

    console.log('Processing signup images for user ID:', webhookData.create_user_id);

    // Process images asynchronously
    imageProcessor.processSignupImages(webhookData)
      .then(result => {
        console.log('✅ Signup image processing complete:', result);
      })
      .catch(error => {
        console.error('❌ Signup image processing failed:', error);
      });

    // Return immediate response to Zapier
    res.status(200).json({ 
      success: true, 
      message: 'Signup image processing started',
      create_user_id: webhookData.create_user_id 
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * New webhook endpoint for processing incident report files from Zapier
 * This handles both images and audio files from incident reports
 */
app.post('/webhook/incident-report', checkSharedKey, async (req, res) => {
  try {
    console.log('🚨 Incident report file processing webhook received from Zapier');

    if (!supabaseEnabled || !imageProcessor) {
      return res.status(503).json({ error: 'Service not configured' });
    }

    const webhookData = req.body;

    // Validate required fields
    if (!webhookData.id && !webhookData.incident_report_id) {
      return res.status(400).json({ error: 'Missing incident report ID' });
    }

    const incidentId = webhookData.id || webhookData.incident_report_id;
    console.log('Processing incident report files for ID:', incidentId);
    console.log('Files found:', Object.keys(webhookData).filter(key => key.startsWith('file_url_')));

    // Process files asynchronously
    imageProcessor.processIncidentReportFiles(webhookData)
      .then(result => {
        console.log('✅ Incident report file processing complete:', result);
      })
      .catch(error => {
        console.error('❌ Incident report file processing failed:', error);
      });

    // Check if redirect is requested (for direct form submissions)
    if (req.query.redirect === 'true') {
      const userId = webhookData.create_user_id || '';
      res.redirect('/report-complete.html?incident_id=' + incidentId + '&user_id=' + userId);
    } else {
      // Return immediate response to Zapier
      res.status(200).json({ 
        success: true, 
        message: 'Incident report file processing started',
        incident_report_id: incidentId 
      });
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Alternative endpoint for processing images
 */
app.post('/webhook/process-images', checkSharedKey, async (req, res) => {
  try {
    console.log('🖼️ Alternative image processing endpoint called');

    if (!supabaseEnabled || !imageProcessor) {
      return res.status(503).json({ error: 'Service not configured' });
    }

    // Validate required fields - now checking for create_user_id
    if (!req.body.create_user_id) {
      return res.status(400).json({ error: 'Missing create_user_id' });
    }

    const result = await imageProcessor.processSignupImages(req.body);

    res.status(200).json({
      success: true,
      ...result
    });


  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

/**
 * Generic secure endpoint for Zapier → Replit calls
 * Use this if you just need a simple, authenticated entry point.
 */
app.post('/zaphook', checkSharedKey, async (req, res) => {
  try {
    // Do whatever you need here. Example: just echo back for testing.
    return res.json({
      ok: true,
      received: req.body,
      ts: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /zaphook:', error);
    return res.status(500).json({ error: error.message });
  }
});

// --- PDF GENERATION ENDPOINTS ---

/**
 * PDF Generation endpoint - protected with checkSharedKey
 * This is the main endpoint Zapier will call
 */
app.post('/generate-pdf', checkSharedKey, async (req, res) => {
  const { create_user_id } = req.body;

  if (!create_user_id) {
    return res.status(400).json({ 
      error: 'Missing create_user_id',
      message: 'Please provide a valid user ID'
    });
  }

  if (!supabaseEnabled) {
    return res.status(503).json({ 
      error: 'Service not configured',
      message: 'Supabase is not properly configured'
    });
  }

  try {
    console.log('📄 Starting PDF generation for: ' + create_user_id);

    // Step 1: Fetch all data
    console.log('🔍 Fetching data from Supabase...');
    const allData = await fetchAllData(create_user_id);

    if (!allData.user || !allData.user.driver_email) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user data found for the provided ID'
      });
    }

    // Step 2: Generate PDF
    console.log('📝 Generating PDF...');
    const pdfBuffer = await generatePDF(allData);

    // Step 3: Store in database
    console.log('💾 Storing completed form...');
    const storedForm = await storeCompletedForm(create_user_id, pdfBuffer, allData);

    // Step 4: Send emails
    console.log('📧 Sending emails...');
    const emailResult = await sendEmails(
      allData.user.driver_email, 
      pdfBuffer, 
      create_user_id
    );

    // Update the stored form with email status
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

    console.log('✅ PDF generation process completed successfully');

    res.json({
      success: true,
      message: 'PDF generated and sent successfully',
      form_id: storedForm.id,
      create_user_id,
      email_sent: emailResult.success,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in PDF generation:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to generate PDF. Please check logs.'
    });
  }
});

/**
 * Alternative webhook endpoint for PDF generation
 * Returns immediate response and processes in background
 */
app.post('/webhook/generate-pdf', checkSharedKey, async (req, res) => {
  const { create_user_id } = req.body;

  if (!create_user_id) {
    return res.status(400).json({ 
      error: 'Missing create_user
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
          limits: { fileSize: 50 * 1024 * 1024 } // Increased to 50MB for audio files
        });

        // --- MIDDLEWARE SETUP ---
        app.use(cors());
        app.use(bodyParser.json({ limit: '10mb' }));
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(cookieParser());
        app.use(express.static(path.join(__dirname, 'public')));

        // Add cache-control headers to prevent caching of HTML files
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
          console.log(new Date().toISOString() + ' - ' + req.method + ' ' + req.path);
          next();
        });

        // --- AUTHENTICATION MIDDLEWARE ---
        const SHARED_KEY = process.env.ZAPIER_SHARED_KEY || process.env.WEBHOOK_API_KEY || '';

        // For webhook endpoints from Zapier
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

        // For API endpoints - placeholder for actual auth implementation
        function authenticateRequest(req, res, next) {
          // TODO: Implement proper authentication
          // For now, pass through but log warning
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

        // --- TRANSCRIPTION QUEUE PROCESSOR ---
        /**
         * Process pending transcriptions from queue
         * Runs every 5 minutes by default, configurable via TRANSCRIPTION_QUEUE_INTERVAL
         */
        async function processTranscriptionQueue() {
          if (!supabaseEnabled) {
            return;
          }

          try {
            console.log('[Transcription Queue] Checking for pending transcriptions...');

            // Get pending transcriptions from queue
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
              return; // Nothing to process
            }

            console.log('[Transcription Queue] Processing ' + pending.length + ' items');

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
                      'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
                      ...formData.getHeaders()
                    },
                    timeout: 60000 // 60 second timeout for Whisper
                  }
                );

                if (!whisperResponse.data || !whisperResponse.data.text) {
                  throw new Error('Invalid response from Whisper API');
                }

                const transcription = whisperResponse.data.text;

                // Update incident_reports table with transcription
                const { error: updateError } = await supabase
                  .from('incident_reports')
                  .update({
                    ai_summary_of_accident_data_transcription: transcription,
                    detailed_account_of_what_happened: transcription,
                    transcription_method: 'whisper_ai_queued',
                    transcription_timestamp: new Date().toISOString()
                  })
                  .eq('id', item.incident_report_id);

                if (updateError) throw updateError;

                // Mark as completed in queue
                await supabase
                  .from('transcription_queue')
                  .update({ 
                    status: 'completed',
                    processed_at: new Date().toISOString(),
                    transcription_text: transcription
                  })
                  .eq('id', item.id);

                console.log('[Transcription Queue] Successfully transcribed incident ' + item.incident_report_id);

              } catch (error) {
                console.error('[Transcription Queue] Error processing item ' + item.id + ':' + error.message);

                // Update retry count
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
          // Get interval from env or default to 5 minutes
          const intervalMinutes = parseInt(process.env.TRANSCRIPTION_QUEUE_INTERVAL) || 5;
          transcriptionQueueInterval = setInterval(processTranscriptionQueue, intervalMinutes * 60 * 1000);

          // Also run 30 seconds after server starts
          setTimeout(processTranscriptionQueue, 30000);

          console.log('⏰ Transcription queue processor scheduled to run every ' + intervalMinutes + ' minutes');
        }

        // --- PDF STORAGE FUNCTION ---
        /**
         * Store completed PDF form in database
         */
        async function storeCompletedForm(createUserId, pdfBuffer, allData) {
          try {
            // Convert buffer to base64 for storage
            const pdfBase64 = pdfBuffer.toString('base64');

            // Store in Supabase storage
            const fileName = 'completed_forms/' + createUserId + '/report_' + Date.now() + '.pdf';
            const { data: storageData, error: storageError } = await supabase.storage
              .from('incident-images-secure')
              .upload(fileName, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: false
              });

            let pdfUrl = null;
            if (storageData && !storageError) {
              // Generate a long-lived signed URL (1 year)
              const { data: urlData } = await supabase.storage
                .from('incident-images-secure')
                .createSignedUrl(fileName, 31536000); // 1 year

              if (urlData) {
                pdfUrl = urlData.signedUrl;
              }
            }

            // Store record in database
            const { data, error } = await supabase
              .from('completed_incident_forms')
              .insert({
                create_user_id: createUserId,
                form_data: allData,
                pdf_base64: pdfBase64.substring(0, 1000000), // Store first 1MB if needed
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
              // Don't throw - continue anyway
            }

            return data || { id: 'temp-' + Date.now() };
          } catch (error) {
            console.error('Error in storeCompletedForm:', error);
            return { id: 'error-' + Date.now() };
          }
        }

        // --- IMAGE PROCESSOR CLASS ---
        class ImageProcessor {
          constructor() {
            this.supabase = supabase;
            this.bucketName = 'incident-images-secure';
          }

          /**
           * Process images from Zapier webhook for signup
           */
          async processSignupImages(webhookData) {
            try {
              console.log('🖼️ Processing signup images for user:', webhookData.create_user_id);

              // Image fields to process for signup
              const imageFields = [
                'driving_license_picture',
                'vehicle_picture_front',
                'vehicle_picture_driver_side',
                'vehicle_picture_passenger_side',
                'vehicle_picture_back'
              ];

              const uploadedImages = {};
              const processedImages = [];

              // Process each image field
              for (const field of imageFields) {
                if (webhookData[field] && webhookData[field].startsWith('http')) {
                  console.log('  Processing ' + field + '...');

                  try {
                    // Download image from Typeform
                    const imageBuffer = await this.downloadImage(webhookData[field]);

                    // Generate unique filename using create_user_id
                    const fileName = webhookData.create_user_id + '/' + field + '_' + Date.now() + '.jpg';

                    // Upload to Supabase storage
                    const storagePath = await this.uploadToSupabase(imageBuffer, fileName);

                    // Store the Supabase storage path
                    uploadedImages[field] = storagePath;

                    // Create record in incident_images table
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
                    console.log('  ✓ ' + field + ' uploaded successfully');

                  } catch (imgError) {
                    console.error('  ✗ Error processing ' + field + ':' + imgError.message);
                    uploadedImages[field] = null; // Set to null if failed
                  }
                }
              }

              // Update user_signup record with new Supabase storage paths
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

          /**
           * Process incident report files (images and audio) from Zapier webhook
           */
          async processIncidentReportFiles(webhookData) {
            try {
              console.log('📋 Processing incident report files for:', webhookData.create_user_id || webhookData.id);

              // Get the incident report ID from the webhook data
              const incidentReportId = webhookData.id || webhookData.incident_report_id;
              const createUserId = webhookData.create_user_id;

              if (!incidentReportId) {
                throw new Error('Missing incident report ID');
              }

              // Image and audio fields to process for incident reports
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

              // Process each file field
              for (const fileInfo of fileFields) {
                const { field, type, isImage } = fileInfo;

                if (webhookData[field] && webhookData[field].startsWith('http')) {
                  console.log('  Processing ' + field + ' (' + type + ')...');

                  try {
                    // Download file from Typeform
                    const fileBuffer = await this.downloadFile(webhookData[field]);

                    // Detect file type from URL
                    const url = webhookData[field].toLowerCase();
                    let extension = '';
                    let contentType = '';

                    if (isImage) {
                      // Handle various image formats from mobile devices
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
                        // Default to JPEG for unknown image types
                        extension = '.jpg';
                        contentType = 'image/jpeg';
                      }
                    } else {
                      // Handle various audio formats from mobile devices
                      if (url.includes('.mp3')) {
                        extension = '.mp3';
                        contentType = 'audio/mpeg';
                      } else if (url.includes('.m4a')) {
                        extension = '.m4a';
                        contentType = 'audio/mp4';
                      } else if (url.includes('.aac')) {
                        extension = '.aac';
                        contentType = 'audio/aac';
                      } else if (url.includes('.wav')) {
                        extension = '.wav';
                        contentType = 'audio/wav';
                      } else if (url.includes('.webm')) {
                        extension = '.webm';
                        contentType = 'audio/webm';
                      } else if (url.includes('.ogg')) {
                        extension = '.ogg';
                        contentType = 'audio/ogg';
                      } else {
                        // Default to MP3 for unknown audio types
                        extension = '.mp3';
                        contentType = 'audio/mpeg';
                      }
                    }

                    // Generate unique filename using user ID and incident report ID
                    const fileName = createUserId ? 
                      createUserId + '/incident_' + incidentReportId + '/' + type + '_' + Date.now() + extension : 
                      'incident_' + incidentReportId + '/' + type + '_' + Date.now() + extension;

                    // Upload to Supabase storage with appropriate content type
                    const storagePath = await this.uploadToSupabase(fileBuffer, fileName, contentType);

                    // Store the Supabase storage path
                    uploadedFiles[field] = storagePath;

                    // Create record in incident_images table (also used for audio files)
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
                    console.log('  ✓ ' + type + ' uploaded successfully (' + extension + ')');

                  } catch (fileError) {
                    console.error('  ✗ Error processing ' + field + ':' + fileError.message);
                    uploadedFiles[field] = null; // Set to null if failed
                  }
                }
              }

              // Update incident_reports record with new Supabase storage paths
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

          /**
           * Download file from URL (works for both images and audio)
           */
          async downloadFile(url) {
            try {
              const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 60000, // Increased timeout for larger files
                headers: {
                  'User-Agent': 'Car-Crash-Lawyer-AI/1.0'
                }
              });

              return Buffer.from(response.data);
            } catch (error) {
              console.error('Error downloading file:', error.message);
              throw new Error('Failed to download file: ' + error.message);
            }
          }

          /**
           * Download image from URL (kept for backward compatibility)
           */
          async downloadImage(url) {
            return this.downloadFile(url);
          }

          /**
           * Upload file to Supabase storage
           */
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
              throw new Error('Failed to upload to storage: ' + error.message);
            }
          }

          /**
           * Create record in incident_images table
           * Updated to handle both signup and incident report files
           */
          async createImageRecord(imageData) {
            const { data, error } = await this.supabase
              .from('incident_images')
              .insert([{
                create_user_id: imageData.create_user_id,
                incident_report_id: imageData.incident_report_id || null,
                image_type: imageData.image_type,
                file_name: imageData.storage_path, // Using file_name column for storage path
                gdpr_consent: { consent_given: true }, // User consented via form
                metadata: imageData.metadata,
                uploaded_at: new Date().toISOString(),
                is_anonymized: false
                // file_id will auto-generate via default
              }])
              .select()
              .single();

            if (error) {
              console.error('Error creating image record:', error);
              // Don't throw - we can continue even if this fails
              return null;
            }

            return data;
          }

          /**
           * Generate signed URL for secure image access
           */
          async getSignedUrl(storagePath, expiresIn = 3600) {
            const { data, error } = await this.supabase.storage
              .from(this.bucketName)
              .createSignedUrl(storagePath, expiresIn);

            if (error) {
              throw error;
            }

            // Log access
            await this.logImageAccess(storagePath);

            return data.signedUrl;
          }

          /**
           * Log image access for GDPR compliance
           */
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

          /**
           * Delete all images for a user (GDPR compliance)
           */
          async deleteAllUserImages(createUserId) {
            try {
              // Get all images for the user
              const { data: images, error: fetchError } = await this.supabase
                .from('incident_images')
                .select('file_name') // Using file_name instead of storage_path
                .eq('create_user_id', createUserId);

              if (fetchError) throw fetchError;

              // Delete from storage
              const deletionResults = [];
              for (const image of images) {
                const { error } = await this.supabase.storage
                  .from(this.bucketName)
                  .remove([image.file_name]); // Using file_name

                deletionResults.push({
                  path: image.file_name,
                  deleted: !error
                });
              }

              // Mark as deleted in database
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

        // --- UTILITY FUNCTIONS ---
        function processTypeformData(formResponse) {
          const processedData = {};

          if (formResponse.form_response && formResponse.form_response.answers) {
            formResponse.form_response.answers.forEach(answer => {
              const fieldId = answer.field.id;
              const fieldRef = answer.field.ref;

              let value = null;
              if (answer.text) value = answer.text;
              else if (answer.email) value = answer.email;
              else if (answer.phone_number) value = answer.phone_number;
              else if (answer.number) value = answer.number;
              else if (answer.boolean !== undefined) value = answer.boolean;
              else if (answer.choice) value = answer.choice.label;
              else if (answer.choices) value = answer.choices.map(c => c.label);
              else if (answer.date) value = answer.date;
              else if (answer.url) value = answer.url;
              else if (answer.file_url) value = answer.file_url;

              if (value !== null) {
                processedData[fieldId] = value;
                if (fieldRef) processedData[fieldRef] = value;
              }
            });
          }

          processedData.submitted_at = formResponse.form_response?.submitted_at || new Date().toISOString();
          processedData.form_id = formResponse.form_response?.form_id;
          processedData.response_id = formResponse.form_response?.token;

          return processedData;
        }

        // --- API CONFIGURATION ENDPOINT ---
        /**
         * Serve Supabase configuration to frontend
         * This allows the report-complete.html page to get credentials
         */
        app.get('/api/config', (req, res) => {
          // Only serve the public anon key (safe for frontend)
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
              transcriptionQueue: transcriptionQueueInterval !== null
            }
          };
          res.json(status);
        });

        // --- MAIN ROUTES ---
        app.get('/', (req, res) => {
          const htmlContent = '<!DOCTYPE html><html><head><title>Car Crash Lawyer AI</title>' +
            '<style>body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }' +
            '.container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }' +
            'h1 { color: #333; }' +
            '.status { padding: 10px; background: #4CAF50; color: white; border-radius: 5px; display: inline-block; }' +
            '.endpoint { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; }' +
            'code { background: #333; color: #4CAF50; padding: 2px 6px; border-radius: 3px; }' +
            '</style></head><body><div class="container">' +
            '<h1>🚗 Car Crash Lawyer AI - GDPR Compliant System</h1>' +
            '<p class="status">✅ Server is running</p>' +
            '<h2>Available Endpoints:</h2>' +
            '<div class="endpoint"><strong>Health Check:</strong><br><code>GET /health</code></div>' +
            '<div class="endpoint"><strong>Configuration:</strong><br><code>GET /api/config</code> - Get Supabase config for frontend</div>' +
            '<div class="endpoint"><strong>Webhooks:</strong><br>' +
            '<code>POST /webhook/signup</code> - Process signup images<br>' +
            '<code>POST /webhook/incident-report</code> - Process incident report files<br>' +
            '<code>POST /webhook/process-images</code> - Alternative image processing endpoint<br>' +
            '<code>POST /zaphook</code> - Generic secure Zapier endpoint<br>' +
            '<code>POST /generate-pdf</code> - Generate and email PDF report<br>' +
            '<code>POST /webhook/generate-pdf</code> - Webhook for PDF generation</div>' +
            '<div class="endpoint"><strong>API Endpoints:</strong><br>' +
            '<code>GET /api/auth/status</code> - Check authentication status<br>' +
            '<code>GET /api/user/:userId/emergency-contacts</code> - Get emergency contacts<br>' +
            '<code>POST /api/log-emergency-call</code> - Log emergency calls<br>' +
            '<code>GET /api/what3words</code> - Get What3Words location<br>' +
            '<code>POST /api/save-transcription</code> - Save audio transcription<br>' +
            '<code>POST /api/transcribe</code> - Transcribe audio with resilient queue<br>' +
            '<code>POST /api/whisper/transcribe</code> - Direct Whisper transcription<br>' +
            '<code>GET /api/transcription-status/:userId</code> - Check transcription status</div>' +
            '<div class="endpoint"><strong>Image Management:</strong><br>' +
            '<code>GET /api/images/:userId</code> - Get user images<br>' +
            '<code>GET /api/image/signed-url/:userId/:imageType</code> - Get signed URL<br>' +
            '<code>POST /api/upload-what3words-image</code> - Upload what3words screenshot<br>' +
            '<code>DELETE /api/gdpr/delete-images</code> - GDPR deletion</div>' +
            '<div class="endpoint"><strong>PDF Generation:</strong><br>' +
            '<code>GET /pdf-status/:userId</code> - Check PDF generation status<br>' +
            '<code>GET /download-pdf/:userId</code> - Download generated PDF</div>' +
            '<p><strong>Supabase Status:</strong> ' + (supabaseEnabled ? '✅ Connected' : '❌ Not configured') + '</p>' +
            '<p><strong>Transcription Queue:</strong> ' + (transcriptionQueueInterval ? '✅ Running' : '❌ Not running') + '</p>' +
            '</div></body></html>';

          res.send(htmlContent);
        });

        // --- NEW API ENDPOINTS FOR INCIDENT FLOW ---

        /**
         * Check authentication status
         */
        app.get('/api/auth/status', (req, res) => {
          // TODO: Implement proper session/auth check
          // For now, return mock data for testing
          const mockUser = {
            authenticated: false,
            user: null
          };

          // If you have session management, check it here
          if (req.session && req.session.user) {
            mockUser.authenticated = true;
            mockUser.user = {
              uid: req.session.user.id,
              email: req.session.user.email,
              fullName: req.session.user.full_name
            };
          }

          res.json(mockUser);
        });

        /**
         * Get user emergency contacts
         */
        app.get('/api/user/:userId/emergency-contacts', authenticateRequest, async (req, res) => {
          if (!supabaseEnabled) {
            return res.status(503).json({ error: 'Service not configured' });
          }

          try {
            const { userId } = req.params;

            const { data, error } = await supabase
              .from('user_signup')
              .select('emergency_contact, recovery_breakdown_number, emergency_services_number')
              .eq('create_user_id', userId)
              .single();

            if (error) {
              console.error('Supabase error:', error);
              return res.status(404).json({ error: 'User not found' });
            }

            res.json({
              emergency_contact: data.emergency_contact || null,
              recovery_breakdown_number: data.recovery_breakdown_number || null,
              emergency_services_number: data.emergency_services_number || '999'
            });
          } catch (error) {
            console.error('Error fetching emergency contacts:', error);
            res.status(500).json({ error: 'Failed to fetch contacts' });
          }
        });

        /**
         * Log emergency calls for record keeping
         */
        app.post('/api/log-emergency-call', authenticateRequest, async (req, res) => {
          if (!supabaseEnabled) {
            return res.status(503).json({ error: 'Service not configured' });
          }

          try {
            const { user_id, service_called, timestamp, incident_id } = req.body;

            // Create emergency_call_logs table if it doesn't exist
            // Note: In production, this should be done via migration
            const { data, error } = await supabase
              .from('emergency_call_logs')
              .insert({
                user_id,
                service_called,
                incident_id: incident_id || null,
                timestamp,
                created_at: new Date().toISOString()
              });

            if (error) {
              console.error('Failed to log emergency call:', error);
              // Don't fail the request if logging fails
              return res.json({ success: false, logged: false });
            }

            res.json({ success: true, logged: true });
          } catch (error) {
            console.error('Error logging emergency call:', error);
            res.status(500).json({ error: 'Internal server error' });
          }
        });

        /**
         * What3Words API endpoint
         */
        app.get('/api/what3words', async (req, res) => {
          try {
            const { lat, lng } = req.query;

            if (!lat || !lng) {
              return res.status(400).json({ error: 'Missing latitude or longitude' });
            }

            const W3W_API_KEY = process.env.WHAT3WORDS_API_KEY;

            if (!W3W_API_KEY) {
              console.warn('What3Words API key not configured');
              return res.json({ words: 'location.not.configured' });
            }

            // Call What3Words API
            const response = await axios.get(
              'https://api.what3words.com/v3/convert-to-3wa?coordinates=' + lat + ',' + lng + '&key=' + W3W_API_KEY
            );

            if (response.data && response.data.words) {
              res.json({ words: response.data.words });
            } else {
              res.json({ words: 'location.not.found' });
            }
          } catch (error) {
            console.error('What3Words API error:', error);
            res.json({ words: 'api.error.occurred' });
          }
        });

        /**
         * Upload what3words screenshot
         */
        app.post('/api/upload-what3words-image', upload.single('image'), async (req, res) => {
          if (!supabaseEnabled || !imageProcessor) {
            return res.status(503).json({ error: 'Service not configured' });
          }

          try {
            // Handle both multipart form data and base64 JSON
            let buffer;
            let what3words, latitude, longitude, userId;

            if (req.file) {
              // Multipart form data
              buffer = req.file.buffer;
              ({ what3words, latitude, longitude, userId } = req.body);
            } else {
              // Base64 JSON data
              const { imageData } = req.body;
              if (!imageData) {
                return res.status(400).json({ error: 'No image data provided' });
              }

              // Convert base64 to buffer
              const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
              buffer = Buffer.from(base64Data, 'base64');
              ({ what3words, latitude, longitude, userId } = req.body);
            }

            // Create filename with what3words location
            const safeWhat3Words = what3words ? what3words.replace(/[\/\\.]/g, '-') : 'unknown';
            const timestamp = Date.now();
            const fileName = (userId || 'anonymous') + '/what3words/' + timestamp + '_' + safeWhat3Words + '.png';

            // Upload to Supabase storage
            const storagePath = await imageProcessor.uploadToSupabase(
              buffer, 
              fileName, 
              'image/png'
            );

            // Create record in incident_images table
            const imageRecord = await imageProcessor.createImageRecord({
              create_user_id: userId || null,
              incident_report_id: null, // Will be updated later when incident is created
              image_type: 'what3words_screenshot',
              storage_path: storagePath,
              original_url: null,
              metadata: {
                upload_date: new Date().toISOString(),
                source: 'web_capture',
                what3words: what3words,
                latitude: parseFloat(latitude) || null,
                longitude: parseFloat(longitude) || null,
                captured_at: new Date().toISOString(),
                gdpr_consent: true
              }
            });

            // Generate a signed URL for immediate access
            const signedUrl = await imageProcessor.getSignedUrl(storagePath, 3600);

            res.json({
              success: true,
              imageUrl: signedUrl,
              storagePath: storagePath,
              imageRecord: imageRecord
            });

          } catch (error) {
            console.error('Error uploading what3words image:', error);
            res.status(500).json({ error: error.message });
          }
        });

        /**
         * Transcribe audio with queue fallback for weak signal
         * This is the new resilient endpoint that merges with existing functionality
         */
        app.post('/api/transcribe', checkSharedKey, upload.single('audio'), async (req, res) => {
          try {
            const { create_user_id, incident_report_id } = req.body;

            if (!create_user_id || !incident_report_id) {
              return res.status(400).json({ 
                error: 'Missing create_user_id or incident_report_id' 
              });
            }

            // First, save the audio file to Supabase if provided
            let audioUrl = req.body.audio_url; // Use provided URL if available

            if (req.file && !audioUrl) {
              // Upload audio to Supabase storage
              const timestamp = Date.now();
              const fileName = create_user_id + '/incident_' + incident_report_id + '/audio_' + timestamp + '.webm';

              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('incident-images-secure')
                .upload(fileName, req.file.buffer, {
                  contentType: req.file.mimetype || 'audio/webm',
                  cacheControl: '3600',
                  upsert: false
                });

              if (uploadError) {
                console.error('Failed to upload audio:', uploadError);
                return res.status(500).json({ error: 'Failed to save audio' });
              }

              // Get public URL
              const { data: urlData } = supabase.storage
                .from('incident-images-secure')
                .getPublicUrl(fileName);

              audioUrl = urlData.publicUrl;

              // Update incident report with audio URL
              await supabase
                .from('incident_reports')
                .update({
                  file_url_record_detailed_account_of_what_happened: audioUrl,
                  audio_statement_recorded: true,
                  audio_statement_timestamp: new Date().toISOString()
                })
                .eq('create_user_id', create_user_id)
                .eq('id', incident_report_id);
            }

            // Try to transcribe immediately if we have OpenAI API key
            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

            if (OPENAI_API_KEY && req.file) {
              try {
                const formData = new FormData();
                formData.append('file', req.file.buffer, {
                  filename: 'audio.webm',
                  contentType: req.file.mimetype || 'audio/webm'
                });
                formData.append('model', 'whisper-1');

                // Try to transcribe with a timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

                const response = await axios.post(
                  'https://api.openai.com/v1/audio/transcriptions',
                  formData,
                  {
                    headers: {
                      'Authorization': 'Bearer ' + OPENAI_API_KEY,
                      ...formData.getHeaders()
                    },
                    signal: controller.signal
                  }
                );

                clearTimeout(timeoutId);

                if (response.data && response.data.text) {
                  // Update database with transcription
                  await supabase
                    .from('incident_reports')
                    .update({
                      ai_summary_of_accident_data_transcription: response.data.text,
                      detailed_account_of_what_happened: response.data.text,
                      transcription_method: 'whisper_ai_immediate'
                    })
                    .eq('create_user_id', create_user_id)
                    .eq('id', incident_report_id);

                  return res.json({ 
                    transcription: response.data.text,
                    status: 'success',
                    audio_url: audioUrl
                  });
                }
              } catch (transcribeError) {
                console.log('Immediate transcription failed, queuing for retry:', transcribeError.message);
                // Fall through to queue logic
              }
            }

            // Queue for background processing if immediate transcription failed or unavailable
            if (audioUrl) {
              const { error: queueError } = await supabase
                .from('transcription_queue')
                .insert({
                  create_user_id: create_user_id,
                  incident_report_id: parseInt(incident_report_id),
                  audio_url: audioUrl,
                  status: 'pending',
                  retry_count: 0,
                  created_at: new Date().toISOString()
                });

              if (queueError) {
                console.error('Failed to queue transcription:', queueError);
              }
            }

            // Return success even if transcription is pending
            res.json({ 
              transcription: '[Audio saved - transcription pending]',
              status: 'queued',
              audio_url: audioUrl,
              message: 'Audio saved successfully. Transcription will be processed shortly.'
            });

          } catch (error) {
            console.error('Transcribe endpoint error:', error);
            res.status(500).json({ 
              error: 'Failed to process audio',
              message: error.message 
            });
          }
        });

        /**
         * ENHANCED OpenAI Whisper transcription endpoint for transcribe.html page
         * This replaces the basic version with full functionality
         */
        app.post('/api/whisper/transcribe', upload.single('audio'), async (req, res) => {
          try {
            console.log('Received transcription request from transcribe.html');

            // Get user and incident IDs
            const userId = req.body.userId || req.body.create_user_id;
            const incidentId = req.body.incidentId || userId;

            if (!userId) {
              return res.status(400).json({ error: 'User ID is required' });
            }

            if (!req.file) {
              return res.status(400).json({ error: 'No audio file provided' });
            }

            // Step 1: Upload audio to Supabase storage
            const timestamp = Date.now();
            const fileExt = req.file.originalname ? req.file.originalname.split('.').pop() : 'webm';
            const fileName = `audio_statement_${timestamp}.${fileExt}`;
            const storagePath = `${userId}/audio/${fileName}`;

            console.log('Uploading audio to Supabase:', storagePath);

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('incident-images-secure')
              .upload(storagePath, req.file.buffer, {
                contentType: req.file.mimetype || 'audio/webm',
                upsert: false
              });

            if (uploadError) {
              console.error('Supabase upload error:', uploadError);
              return res.status(500).json({ error: 'Failed to upload audio file' });
            }

            // Get public URL
            const { data: urlData } = supabase.storage
              .from('incident-images-secure')
              .getPublicUrl(storagePath);

            const audioUrl = urlData.publicUrl;
            console.log('Audio uploaded to:', audioUrl);

            // Step 2: Transcribe using OpenAI Whisper API
            let transcription = '';

            if (process.env.OPENAI_API_KEY) {
              try {
                const formData = new FormData();
                formData.append('file', req.file.buffer, {
                  filename: req.file.originalname || 'audio.webm',
                  contentType: req.file.mimetype || 'audio/webm'
                });
                formData.append('model', 'whisper-1');
                formData.append('language', 'en');
                formData.append('response_format', 'json');

                const whisperResponse = await axios.post(
                  'https://api.openai.com/v1/audio/transcriptions',
                  formData,
                  {
                    headers: {
                      ...formData.getHeaders(),
                      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                  }
                );

                transcription = whisperResponse.data.text;
                console.log('Transcription successful:', transcription.substring(0, 100) + '...');

              } catch (whisperError) {
                console.error('Whisper API error:', whisperError.response?.data || whisperError.message);
                // Continue without transcription rather than failing completely
                transcription = 'Transcription pending - audio file saved successfully';
              }
            } else {
              console.log('OpenAI API key not configured - saving audio only');
              transcription = 'Transcription service not configured - audio file saved';
            }

            // Step 3: Save transcription to database (create table first if needed)
            try {
              const { data: transcriptionData, error: dbError } = await supabase
                .from('ai_transcription')
                .insert({
                  create_user_id: userId,
                  incident_id: incidentId,
                  audio_url: audioUrl,
                  transcription: transcription,
                  duration: req.body.duration || 0,
                  created_at: new Date().toISOString()
                })
                .select()
                .single();

              if (dbError) {
                console.error('Database error (table may not exist yet):', dbError);
                // Don't fail if database insert fails - we still have the audio
              }
            } catch (dbErr) {
              console.error('Error saving to ai_transcription table:', dbErr);
            }

            // Step 4: Update incident_reports table with audio reference
            await supabase
              .from('incident_reports')
              .update({
                witness_statement_audio: audioUrl,
                witness_statement_text: transcription,
                updated_at: new Date().toISOString()
              })
              .eq('create_user_id', userId);

            // Return success response
            res.json({
              success: true,
              transcription: transcription,
              audioUrl: audioUrl,
              duration: req.body.duration || 0
            });

          } catch (error) {
            console.error('Transcription endpoint error:', error);
            res.status(500).json({ 
              error: 'Failed to process audio',
              message: error.message 
            });
          }
        });

        /**
         * ENHANCED Save transcription endpoint for transcribe.html
         */
        app.post('/api/save-transcription', async (req, res) => {
          try {
            const { userId, incidentId, transcription, audioUrl, duration } = req.body;

            if (!userId || !transcription) {
              return res.status(400).json({ error: 'User ID and transcription are required' });
            }

            if (!supabaseEnabled) {
              // If Supabase isn't configured, just acknowledge receipt
              return res.json({ 
                success: true, 
                message: 'Transcription received (Supabase not configured)' 
              });
            }

            // Try to save to ai_transcription table
            try {
              // Check if record exists
              const { data: existing } = await supabase
                .from('ai_transcription')
                .select('id')
                .eq('create_user_id', userId)
                .eq('incident_id', incidentId || userId)
                .single();

              let result;

              if (existing) {
                // Update existing record
                const { data, error } = await supabase
                  .from('ai_transcription')
                  .update({
                    transcription: transcription,
                    audio_url: audioUrl || existing.audio_url,
                    duration: duration || existing.duration,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existing.id)
                  .select()
                  .single();

                result = data;
                if (error) throw error;
              } else {
                // Insert new record
                const { data, error } = await supabase
                  .from('ai_transcription')
                  .insert({
                    create_user_id: userId,
                    incident_id: incidentId || userId,
                    transcription: transcription,
                    audio_url: audioUrl || '',
                    duration: duration || 0,
                    created_at: new Date().toISOString()
                  })
                  .select()
                  .single();

                result = data;
                if (error) throw error;
              }
            } catch (tableError) {
              console.log('ai_transcription table may not exist yet:', tableError.message);
            }

            // Also update incident_reports
            await supabase
              .from('incident_reports')
              .update({
                witness_statement_text: transcription,
                witness_statement_audio: audioUrl || undefined,
                updated_at: new Date().toISOString()
              })
              .eq('create_user_id', userId);

            res.json({ success: true, message: 'Transcription saved successfully' });

          } catch (error) {
            console.error('Save transcription error:', error);
            res.status(500).json({ 
              error: 'Failed to save transcription',
              message: error.message 
            });
          }
        });

        /**
         * NEW: Get transcription status for a user
         */
        app.get('/api/transcription-status/:userId', async (req, res) => {
          try {
            const { userId } = req.params;

            if (!supabaseEnabled) {
              return res.json({ exists: false, transcription: null });
            }

            // First try ai_transcription table
            const { data, error } = await supabase
              .from('ai_transcription')
              .select('*')
              .eq('create_user_id', userId)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (data) {
              return res.json({
                exists: true,
                transcription: data
              });
            }

            // Fall back to checking incident_reports
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
                transcription: incidentData.witness_statement_text,
                audio_url: incidentData.witness_statement_audio
              } : null
            });

          } catch (error) {
            console.error('Get transcription status error:', error);
            res.status(500).json({ error: 'Failed to get transcription status' });
          }
        });

        // --- WEBHOOK ENDPOINTS ---

        /**
         * Main webhook endpoint for processing signup images from Zapier
         * This should be called AFTER Zapier has created the user_signup record
         */
        app.post('/webhook/signup', checkSharedKey, async (req, res) => {
          try {
            console.log('📝 Signup image processing webhook received from Zapier');

            if (!supabaseEnabled || !imageProcessor) {
              return res.status(503).json({ error: 'Service not configured' });
            }

            const webhookData = req.body;

            // Validate required fields - now checking for create_user_id
            if (!webhookData.create_user_id) {
              return res.status(400).json({ error: 'Missing create_user_id' });
            }

            console.log('Processing signup images for user ID:', webhookData.create_user_id);

            // Process images asynchronously
            imageProcessor.processSignupImages(webhookData)
              .then(result => {
                console.log('✅ Signup image processing complete:', result);
              })
              .catch(error => {
                console.error('❌ Signup image processing failed:', error);
              });

            // Return immediate response to Zapier
            res.status(200).json({ 
              success: true, 
              message: 'Signup image processing started',
              create_user_id: webhookData.create_user_id 
            });

          } catch (error) {
            console.error('❌ Webhook error:', error);
            res.status(500).json({ 
              success: false, 
              error: error.message 
            });
          }
        });

        /**
         * New webhook endpoint for processing incident report files from Zapier
         * This handles both images and audio files from incident reports
         */
        app.post('/webhook/incident-report', checkSharedKey, async (req, res) => {
          try {
            console.log('🚨 Incident report file processing webhook received from Zapier');

            if (!supabaseEnabled || !imageProcessor) {
              return res.status(503).json({ error: 'Service not configured' });
            }

            const webhookData = req.body;

            // Validate required fields
            if (!webhookData.id && !webhookData.incident_report_id) {
              return res.status(400).json({ error: 'Missing incident report ID' });
            }

            const incidentId = webhookData.id || webhookData.incident_report_id;
            console.log('Processing incident report files for ID:', incidentId);
            console.log('Files found:', Object.keys(webhookData).filter(key => key.startsWith('file_url_')));

            // Process files asynchronously
            imageProcessor.processIncidentReportFiles(webhookData)
              .then(result => {
                console.log('✅ Incident report file processing complete:', result);
              })
              .catch(error => {
                console.error('❌ Incident report file processing failed:', error);
              });

            // Check if redirect is requested (for direct form submissions)
            if (req.query.redirect === 'true') {
              const userId = webhookData.create_user_id || '';
              res.redirect('/report-complete.html?incident_id=' + incidentId + '&user_id=' + userId);
            } else {
              // Return immediate response to Zapier
              res.status(200).json({ 
                success: true, 
                message: 'Incident report file processing started',
                incident_report_id: incidentId 
              });
            }

          } catch (error) {
            console.error('❌ Webhook error:', error);
            res.status(500).json({ 
              success: false, 
              error: error.message 
            });
          }
        });

        /**
         * Alternative endpoint for processing images
         */
        app.post('/webhook/process-images', checkSharedKey, async (req, res) => {
          try {
            console.log('🖼️ Alternative image processing endpoint called');

            if (!supabaseEnabled || !imageProcessor) {
              return res.status(503).json({ error: 'Service not configured' });
            }

            // Validate required fields - now checking for create_user_id
            if (!req.body.create_user_id) {
              return res.status(400).json({ error: 'Missing create_user_id' });
            }

            const result = await imageProcessor.processSignupImages(req.body);

            res.status(200).json({
              success: true,
              ...result
            });

          } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ 
              error: error.message 
            });
          }
        });

        /**
         * Generic secure endpoint for Zapier → Replit calls
         * Use this if you just need a simple, authenticated entry point.
         */
        app.post('/zaphook', checkSharedKey, async (req, res) => {
          try {
            // Do whatever you need here. Example: just echo back for testing.
            return res.json({
              ok: true,
              received: req.body,
              ts: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error in /zaphook:', error);
            return res.status(500).json({ error: error.message });
          }
        });

        // --- PDF GENERATION ENDPOINTS ---

        /**
         * PDF Generation endpoint - protected with checkSharedKey
         * This is the main endpoint Zapier will call
         */
        app.post('/generate-pdf', checkSharedKey, async (req, res) => {
          const { create_user_id } = req.body;

          if (!create_user_id) {
            return res.status(400).json({ 
              error: 'Missing create_user_id',
              message: 'Please provide a valid user ID'
            });
          }

          if (!supabaseEnabled) {
            return res.status(503).json({ 
              error: 'Service not configured',
              message: 'Supabase is not properly configured'
            });
          }

          try {
            console.log('📄 Starting PDF generation for: ' + create_user_id);

            // Step 1: Fetch all data
            console.log('🔍 Fetching data from Supabase...');
            const allData = await fetchAllData(create_user_id);

            if (!allData.user || !allData.user.driver_email) {
              return res.status(404).json({
                error: 'User not found',
                message: 'No user data found for the provided ID'
              });
            }

            // Step 2: Generate PDF
            console.log('📝 Generating PDF...');
            const pdfBuffer = await generatePDF(allData);

            // Step 3: Store in database
            console.log('💾 Storing completed form...');
            const storedForm = await storeCompletedForm(create_user_id, pdfBuffer, allData);

            // Step 4: Send emails
            console.log('📧 Sending emails...');
            const emailResult = await sendEmails(
              allData.user.driver_email, 
              pdfBuffer, 
              create_user_id
            );

            // Update the stored form with email status
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

            console.log('✅ PDF generation process completed successfully');

            res.json({
              success: true,
              message: 'PDF generated and sent successfully',
              form_id: storedForm.id,
              create_user_id,
              email_sent: emailResult.success,
              timestamp: new Date().toISOString()
            });

          } catch (error) {
            console.error('❌ Error in PDF generation:', error);
            res.status(500).json({ 
              error: error.message,
              details: 'Failed to generate PDF. Please check logs.'
            });
          }
        });

        /**
         * Alternative webhook endpoint for PDF generation
         * Returns immediate response and processes in background
         */
        app.post('/webhook/generate-pdf', checkSharedKey, async (req, res) => {
          const { create_user_id } = req.body;

          if (!create_user_id) {
            return res.status(400).json({ 
              error: 'Missing create_user_id'
            });
          }

          // Immediate response for webhook
          res.status(200).json({ 
            received: true, 
            processing: true,
            message: 'PDF generation started',
            create_user_id
          });

          // Process in background
          try {
            const allData = await fetchAllData(create_user_id);
            const pdfBuffer = await generatePDF(allData);
            await storeCompletedForm(create_user_id, pdfBuffer, allData);
            await sendEmails(allData.user.driver_email, pdfBuffer, create_user_id);
            console.log('✅ Background PDF processing complete for ' + create_user_id);
          } catch (error) {
            console.error('❌ Background PDF processing failed for ' + create_user_id + ':' + error);
          }
        });

        /**
         * Check PDF generation status
         */
        app.get('/pdf-status/:userId', checkSharedKey, async (req, res) => {
          if (!supabaseEnabled) {
            return res.status(503).json({ error: 'Service not configured' });
          }

          try {
            const { userId } = req.params;

            const { data, error } = await supabase
              .from('completed_incident_forms')
              .select('*')
              .eq('create_user_id', userId)
              .order('generated_at', { ascending: false })
              .limit(1)
              .single();

            if (error || !data) {
              return res.status(404).json({ 
                error: 'No PDF found',
                message: 'No generated PDF found for this user'
              });
            }

            res.json({
              success: true,
              form_id: data.id,
              generated_at: data.generated_at,
              sent_to_user: data.sent_to_user,
              sent_to_accounts: data.sent_to_accounts,
              pdf_url: data.pdf_url
            });

          } catch (error) {
            console.error('Error checking PDF status:', error);
            res.status(500).json({ error: error.message });
          }
        });

        /**
         * Download generated PDF
         */
        app.get('/download-pdf/:userId', checkSharedKey, async (req, res) => {
          if (!supabaseEnabled) {
            return res.status(503).json({ error: 'Service not configured' });
          }

          try {
            const { userId } = req.params;

            const { data, error } = await supabase
              .from('completed_incident_forms')
              .select('pdf_base64, pdf_url')
              .eq('create_user_id', userId)
              .order('generated_at', { ascending: false })
              .limit(1)
              .single();

            if (error || !data) {
              return res.status(404).json({ 
                error: 'No PDF found'
              });
            }

            if (data.pdf_url) {
              // Redirect to signed URL
              res.redirect(data.pdf_url);
            } else if (data.pdf_base64) {
              // Send base64 as PDF
              const buffer = Buffer.from(data.pdf_base64, 'base64');
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'attachment; filename="incident_report_' + userId + '.pdf"');
              res.send(buffer);
            } else {
              res.status(404).json({ error: 'PDF data not available' });
            }

          } catch (error) {
            console.error('Error downloading PDF:', error);
            res.status(500).json({ error: error.message });
          }
        });

        // --- IMAGE ACCESS ENDPOINTS ---

        /**
         * Get all images for a user
         * Note: URL still uses :userId for backwards compatibility, but queries by create_user_id
         */
        app.get('/api/images/:userId', async (req, res) => {
          if (!supabaseEnabled) {
            return res.status(503).json({ error: 'Service not configured' });
          }

          try {
            const { userId } = req.params;

            // Get all images for this user using create_user_id
            const { data, error } = await supabase
              .from('incident_images')
              .select('*')
              .eq('create_user_id', userId)
              .is('deletion_completed', null); // Not deleted

            if (error) throw error;

            res.json({
              success: true,
              count: data.length,
              images: data
            });
          } catch (error) {
            console.error('Error fetching images:', error);
            res.status(500).json({ error: error.message });
          }
        });

        /**
         * Get all files for a specific incident report
         */
        app.get('/api/incident/:incidentId/files', async (req, res) => {
          if (!supabaseEnabled) {
            return res.status(503).json({ error: 'Service not configured' });
          }

          try {
            const { incidentId } = req.params;

            // Get all files for this incident report
            const { data, error } = await supabase
              .from('incident_images')
              .select('*')
              .eq('incident_report_id', incidentId)
              .is('deletion_completed', null); // Not deleted

            if (error) throw error;

            res.json({
              success: true,
              count: data.length,
              files: data
            });
          } catch (error) {
            console.error('Error fetching incident files:', error);
            res.status(500).json({ error: error.message });
          }
        });

        /**
         * Get signed URL for a specific image
         * Note: URL still uses :userId for backwards compatibility, but queries by create_user_id
         */
        app.get('/api/image/signed-url/:userId/:imageType', async (req, res) => {
          if (!supabaseEnabled || !imageProcessor) {
            return res.status(503).json({ error: 'Service not configured' });
          }

          try {
            const { userId, imageType } = req.params;

            // Get image record using create_user_id
            const { data: image, error } = await supabase
              .from('incident_images')
              .select('file_name')
              .eq('create_user_id', userId)
              .eq('image_type', imageType)
              .is('deletion_completed', null)
              .single();

            if (error || !image) {
              return res.status(404).json({ error: 'Image not found' });
            }

            // Generate signed URL (expires in 1 hour)
            const signedUrl = await imageProcessor.getSignedUrl(image.file_name);

            res.json({
              signed_url: signedUrl,
              expires_in: '1 hour'
            });
          } catch (error) {
            console.error('Error generating signed URL:', error);
            res.status(500).json({ error: error.message });
          }
        });

        /**
         * Delete all images for a user (GDPR compliance)
         */
        app.delete('/api/gdpr/delete-images', async (req, res) => {
          if (!supabaseEnabled || !imageProcessor) {
            return res.status(503).json({ error: 'Service not configured' });
          }

          try {
            const createUserId = req.headers['x-user-id'] || req.body.create_user_id || req.body.userId;

            if (!createUserId) {
              return res.status(400).json({ error: 'create_user_id required' });
            }

            const result = await imageProcessor.deleteAllUserImages(createUserId);

            res.json({
              success: true,
              ...result
            });
          } catch (error) {
            console.error('Error deleting images:', error);
            res.status(500).json({ error: error.message });
          }
        });

        // --- TEST ENDPOINTS ---

        /**
         * Test endpoint to check image processing status
         * Note: URL still uses :userId for backwards compatibility, but queries by create_user_id
         */
        app.get('/test/image-status/:userId', async (req, res) => {
          if (!supabaseEnabled) {
            return res.status(503).json({ error: 'Service not configured' });
          }

          try {
            const { userId } = req.params;

            // Check user_signup record using create_user_id
            const { data: userRecord, error: userError } = await supabase
              .from('user_signup')
              .select('create_user_id, driving_license_picture, vehicle_picture_front, vehicle_picture_back')
              .eq('create_user_id', userId)
              .single();

            // Check incident_images records using create_user_id
            const { data: images, error: imageError } = await supabase
              .from('incident_images')
              .select('*')
              .eq('create_user_id', userId);

            res.json({
              user_record: userRecord,
              images_in_db: images?.length || 0,
              images: images
            });
          } catch (error) {
            res.status(500).json({ error: error.message });
          }
        });

        /**
         * Test endpoint to check incident report file processing status
         */
        app.get('/test/incident-status/:incidentId', async (req, res) => {
          if (!supabaseEnabled) {
            return res.status(503).json({ error: 'Service not configured' });
          }

          try {
            const { incidentId } = req.params;

            // Check incident_reports record
            const { data: incidentRecord, error: incidentError } = await supabase
              .from('incident_reports')
              .select('id, create_user_id, file_url_documents, file_url_vehicle_damage, file_url_scene_overview, file_url_what3words')
              .eq('id', incidentId)
              .single();

            // Check incident_images records for this incident
            const { data: files, error: filesError } = await supabase
              .from('incident_images')
              .select('*')
              .eq('incident_report_id', incidentId);

            res.json({
              incident_record: incidentRecord,
              files_in_db: files?.length || 0,
              files: files
            });
          } catch (error) {
            res.status(500).json({ error: error.message });
          }
        });

        /**
         * Test endpoint to check transcription queue status
         */
        app.get('/test/transcription-queue', async (req, res) => {
          if (!supabaseEnabled) {
            return res.status(503).json({ error: 'Service not configured' });
          }

          try {
            // Get pending transcriptions
            const { data: pending, error: pendingError } = await supabase
              .from('transcription_queue')
              .select('*')
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(10);

            // Get completed transcriptions
            const { data: completed, error: completedError } = await supabase
              .from('transcription_queue')
              .select('*')
              .eq('status', 'completed')
              .order('processed_at', { ascending: false })
              .limit(5);

            // Get failed transcriptions
            const { data: failed, error: failedError } = await supabase
              .from('transcription_queue')
              .select('*')
              .eq('status', 'failed')
              .order('created_at', { ascending: false })
              .limit(5);

            res.json({
              queue_status: {
                pending: pending?.length || 0,
                completed: completed?.length || 0,
                failed: failed?.length || 0
              },
              pending_items: pending,
              completed_items: completed,
              failed_items: failed,
              processor_running: transcriptionQueueInterval !== null
            });
          } catch (error) {
            console.error('Error checking transcription queue:', error);
            res.status(500).json({ error: error.message });
          }
        });

        /**
         * Manual trigger for transcription queue processing (for testing)
         */
        app.post('/test/process-transcription-queue', checkSharedKey, async (req, res) => {
          if (!supabaseEnabled) {
            return res.status(503).json({ error: 'Service not configured' });
          }

          // Trigger queue processing
          processTranscriptionQueue()
            .then(() => {
              console.log('Manual transcription queue processing complete');
            })
            .catch(error => {
              console.error('Manual transcription queue processing failed:', error);
            });

          res.json({
            success: true,
            message: 'Transcription queue processing triggered'
          });
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
            console.log('Transcription queue processor stopped');
          }
          process.exit(0);
        });

        process.on('SIGINT', () => {
          console.log('SIGINT received, closing server...');
          if (transcriptionQueueInterval) {
            clearInterval(transcriptionQueueInterval);
            console.log('Transcription queue processor stopped');
          }
          process.exit(0);
        });

        // --- START SERVER ---
        const PORT = process.env.PORT || 3000;
        const HOST = '0.0.0.0';

        app.listen(PORT, HOST, () => {
          console.log('🚗 Car Crash Lawyer AI - GDPR Compliant Edition with Enhanced Audio Transcription');
          console.log('🚀 Server running on port ' + PORT);
          console.log('📍 Local: http://localhost:' + PORT);

          if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
            console.log('🌐 Public: https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co');
          }

          console.log('\n📊 Status: ' + (supabaseEnabled ? '✅ Supabase connected' : '❌ Supabase not configured'));

          console.log('\n🔐 Auth key present: ' + (SHARED_KEY ? '✅ yes' : '❌ no (set ZAPIER_SHARED_KEY)'));

          console.log('\n🔗 Key Endpoints:');
          console.log('   GET  /api/config - Serve Supabase config to frontend');
          console.log('   POST /api/save-transcription - Save audio transcription');
          console.log('   POST /api/transcribe - Transcribe audio with resilient queue');
          console.log('   POST /api/whisper/transcribe - Enhanced Whisper transcription');
          console.log('   GET  /api/transcription-status/:userId - Check transcription status');
          console.log('   POST /zaphook - Generic secure Zapier endpoint');
          console.log('   POST /webhook/signup - Process signup images');
          console.log('   POST /webhook/incident-report - Process incident report files');
          console.log('   POST /generate-pdf - Generate and email PDF report');
          console.log('   POST /webhook/generate-pdf - Webhook for PDF generation');
          console.log('   GET  /pdf-status/:userId - Check PDF generation status');
          console.log('   GET  /download-pdf/:userId - Download generated PDF');
          console.log('   POST /api/upload-what3words-image - Upload what3words screenshot');
          console.log('   GET  /api/user/:userId/emergency-contacts - Get emergency contacts');
          console.log('   POST /api/log-emergency-call - Log emergency calls');
          console.log('   GET  /api/what3words - Get What3Words location');
          console.log('   GET  /test/image-status/:userId - Check signup image status');
          console.log('   GET  /test/incident-status/:incidentId - Check incident file status');
          console.log('   GET  /test/transcription-queue - Check transcription queue status');
          console.log('   POST /test/process-transcription-queue - Manually trigger queue processing');

          console.log('\n⏰ Background Jobs:');
          if (transcriptionQueueInterval) {
            const intervalMinutes = parseInt(process.env.TRANSCRIPTION_QUEUE_INTERVAL) || 5;
            console.log('   Transcription Queue: ✅ Running every ' + intervalMinutes + ' minutes');
            console.log('   First run scheduled in 30 seconds');
          } else {
            console.log('   Transcription Queue: ❌ Not running (Supabase not configured)');
          }

          console.log('\n✅ Server is ready to receive webhooks and process audio transcriptions!');
        });