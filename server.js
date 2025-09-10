const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

const app = express();

// --- MIDDLEWARE SETUP ---
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// --- SHARED KEY AUTH (for Zapier/Replit integration) ---
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

// --- IMAGE PROCESSOR CLASS ---
class ImageProcessor {
  constructor() {
    this.supabase = supabase;
    this.bucketName = 'incident-images-secure';
  }

  /**
   * Process images from Zapier webhook
   */
  async processSignupImages(webhookData) {
    try {
      console.log('🖼️ Processing images for user:', webhookData.id);

      // Image fields to process
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
          console.log(`  Processing ${field}...`);

          try {
            // Download image from Typeform
            const imageBuffer = await this.downloadImage(webhookData[field]);

            // Generate unique filename
            const fileName = `${webhookData.id}/${field}_${Date.now()}.jpg`;

            // Upload to Supabase storage
            const storagePath = await this.uploadToSupabase(imageBuffer, fileName);

            // Store the Supabase storage path
            uploadedImages[field] = storagePath;

            // Create record in incident_images table
            const imageRecord = await this.createImageRecord({
              user_id: webhookData.id,
              image_type: field,
              storage_path: storagePath,
              original_url: webhookData[field],
              metadata: {
                upload_date: new Date().toISOString(),
                source: 'typeform',
                gdpr_consent: true
              }
            });

            processedImages.push(imageRecord);
            console.log(`  ✓ ${field} uploaded successfully`);

          } catch (imgError) {
            console.error(`  ✗ Error processing ${field}:`, imgError.message);
            uploadedImages[field] = null; // Set to null if failed
          }
        }
      }

      // Update user_signup record with new Supabase storage paths
      if (Object.keys(uploadedImages).length > 0) {
        const { data: updateData, error: updateError } = await this.supabase
          .from('user_signup')
          .update(uploadedImages)
          .eq('id', webhookData.id)
          .select();

        if (updateError) {
          console.error('Error updating user_signup:', updateError);
        } else {
          console.log('✅ Updated user_signup with storage paths');
        }
      }

      return {
        success: true,
        user_id: webhookData.id,
        images_processed: processedImages.length,
        updated_fields: uploadedImages
      };

    } catch (error) {
      console.error('Error in processSignupImages:', error);
      throw error;
    }
  }

  /**
   * Download image from URL
   */
  async downloadImage(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Car-Crash-Lawyer-AI/1.0'
        }
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error downloading image:', error.message);
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  /**
   * Upload image to Supabase storage
   */
  async uploadToSupabase(buffer, fileName) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(fileName, buffer, {
          contentType: 'image/jpeg',
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

  /**
   * Create record in incident_images table
   */
  async createImageRecord(imageData) {
    const { data, error } = await this.supabase
      .from('incident_images')
      .insert([{
        user_id: imageData.user_id,
        image_type: imageData.image_type,
        storage_path: imageData.storage_path,
        original_url: imageData.original_url,
        upload_date: new Date().toISOString(),
        metadata: imageData.metadata,
        access_count: 0,
        is_active: true
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
  async deleteAllUserImages(userId) {
    try {
      // Get all images for the user
      const { data: images, error: fetchError } = await this.supabase
        .from('incident_images')
        .select('storage_path')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      // Delete from storage
      const deletionResults = [];
      for (const image of images) {
        const { error } = await this.supabase.storage
          .from(this.bucketName)
          .remove([image.storage_path]);

        deletionResults.push({
          path: image.storage_path,
          deleted: !error
        });
      }

      // Mark as deleted in database
      const { error: updateError } = await this.supabase
        .from('incident_images')
        .update({ 
          is_active: false,
          deleted_at: new Date().toISOString()
        })
        .eq('user_id', userId);

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

// --- HEALTH CHECK ENDPOINT ---
app.get('/health', (req, res) => {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      supabase: supabaseEnabled,
      server: true
    }
  };
  res.json(status);
});

// --- MAIN ROUTES ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Car Crash Lawyer AI</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
        h1 { color: #333; }
        .status { padding: 10px; background: #4CAF50; color: white; border-radius: 5px; display: inline-block; }
        .endpoint { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; }
        code { background: #333; color: #4CAF50; padding: 2px 6px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚗 Car Crash Lawyer AI - GDPR Compliant System</h1>
        <p class="status">✅ Server is running</p>

        <h2>Available Endpoints:</h2>

        <div class="endpoint">
          <strong>Health Check:</strong><br>
          <code>GET /health</code>
        </div>

        <div class="endpoint">
          <strong>Webhooks:</strong><br>
          <code>POST /webhook/signup</code> - Process images from Zapier<br>
          <code>POST /webhook/process-images</code> - Alternative image processing endpoint<br>
          <code>POST /zaphook</code> - Generic secure Zapier endpoint
        </div>

        <div class="endpoint">
          <strong>Image Management:</strong><br>
          <code>GET /api/images/:userId</code> - Get user images<br>
          <code>GET /api/image/signed-url/:userId/:imageType</code> - Get signed URL<br>
          <code>DELETE /api/gdpr/delete-images</code> - GDPR deletion
        </div>

        <p><strong>Supabase Status:</strong> ${supabaseEnabled ? '✅ Connected' : '❌ Not configured'}</p>
      </div>
    </body>
    </html>
  `);
});

// --- WEBHOOK ENDPOINTS ---

/**
 * Main webhook endpoint for processing images from Zapier
 * This should be called AFTER Zapier has created the user_signup record
 */
app.post('/webhook/signup', checkSharedKey, async (req, res) => {
  try {
    console.log('📝 Image processing webhook received from Zapier');

    if (!supabaseEnabled || !imageProcessor) {
      return res.status(503).json({ error: 'Service not configured' });
    }

    const webhookData = req.body;

    // Validate required fields
    if (!webhookData.id) {
      return res.status(400).json({ error: 'Missing record ID' });
    }

    console.log('Processing images for user ID:', webhookData.id);

    // Process images asynchronously
    imageProcessor.processSignupImages(webhookData)
      .then(result => {
        console.log('✅ Image processing complete:', result);
      })
      .catch(error => {
        console.error('❌ Image processing failed:', error);
      });

    // Return immediate response to Zapier
    res.status(200).json({ 
      success: true, 
      message: 'Image processing started',
      userId: webhookData.id 
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
 * Alternative endpoint for processing images
 */
app.post('/webhook/process-images', checkSharedKey, async (req, res) => {
  try {
    console.log('🖼️ Alternative image processing endpoint called');

    if (!supabaseEnabled || !imageProcessor) {
      return res.status(503).json({ error: 'Service not configured' });
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

// --- IMAGE ACCESS ENDPOINTS ---

/**
 * Get all images for a user
 */
app.get('/api/images/:userId', async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({ error: 'Service not configured' });
  }

  try {
    const { userId } = req.params;

    // Get all images for this user
    const { data, error } = await supabase
      .from('incident_images')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

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
 * Get signed URL for a specific image
 */
app.get('/api/image/signed-url/:userId/:imageType', async (req, res) => {
  if (!supabaseEnabled || !imageProcessor) {
    return res.status(503).json({ error: 'Service not configured' });
  }

  try {
    const { userId, imageType } = req.params;

    // Get image record
    const { data: image, error } = await supabase
      .from('incident_images')
      .select('storage_path')
      .eq('user_id', userId)
      .eq('image_type', imageType)
      .eq('is_active', true)
      .single();

    if (error || !image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Generate signed URL (expires in 1 hour)
    const signedUrl = await imageProcessor.getSignedUrl(image.storage_path);

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
    const userId = req.headers['x-user-id'] || req.body.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const result = await imageProcessor.deleteAllUserImages(userId);

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
 */
app.get('/test/image-status/:userId', async (req, res) => {
  if (!supabaseEnabled) {
    return res.status(503).json({ error: 'Service not configured' });
  }

  try {
    const { userId } = req.params;

    // Check user_signup record
    const { data: userRecord, error: userError } = await supabase
      .from('user_signup')
      .select('id, driving_license_picture, vehicle_picture_front, vehicle_picture_back')
      .eq('id', userId)
      .single();

    // Check incident_images records
    const { data: images, error: imageError } = await supabase
      .from('incident_images')
      .select('*')
      .eq('user_id', userId);

    res.json({
      user_record: userRecord,
      images_in_db: images?.length || 0,
      images: images
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚗 Car Crash Lawyer AI - GDPR Compliant Edition`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);

  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    console.log(`🌐 Public: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
  }

  console.log(`\n📊 Status: ${supabaseEnabled ? '✅ Supabase connected' : '❌ Supabase not configured'}`);

  console.log(`\n🔐 Auth key present: ${SHARED_KEY ? '✅ yes' : '❌ no (set ZAPIER_SHARED_KEY)'}`);

  console.log(`\n🔗 Key Endpoints:`);
  console.log(`   POST /zaphook - Generic secure Zapier endpoint`);
  console.log(`   POST /webhook/signup - Process images from Zapier`);
  console.log(`   GET  /test/image-status/:userId - Check processing status`);

  console.log(`\n✅ Server is ready to receive webhooks!`);
});