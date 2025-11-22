/**
 * Create a sample image upload with visible URLs
 * This stays in the database for you to verify in Supabase dashboard
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_USER_ID = '1af483d1-35c3-4202-a50f-4b5a8aa631f7';

async function createSampleImage() {
  console.log('📸 Creating sample image with URLs for Supabase verification...\n');

  try {
    // Step 1: Create a simple PNG image (1x1 blue pixel)
    // PNG header + IHDR chunk + IDAT chunk + IEND chunk
    const imageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0x99, 0x63, 0x60, 0x64, 0xF8, 0x0F, 0x00, 0x00, 0x7F, 0x00, 0x03,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82  // IEND
    ]);

    const timestamp = Date.now();
    const storagePath = `${TEST_USER_ID}/sample-image-with-urls-${timestamp}.png`;

    console.log('1️⃣ Uploading sample image to Supabase Storage...');

    // Step 2: Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      return;
    }

    console.log('✅ Uploaded to:', storagePath);

    // Step 3: Generate signed URL (1 hour expiry)
    console.log('\n2️⃣ Generating signed URL...');

    const { data: urlData } = await supabase.storage
      .from('user-documents')
      .createSignedUrl(storagePath, 3600);

    const signedUrl = urlData?.signedUrl;
    const signedUrlExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    console.log('✅ Signed URL generated');
    console.log('   Preview (first 100 chars):', signedUrl?.substring(0, 100) + '...');

    // Step 4: Create database record with URLs
    console.log('\n3️⃣ Creating user_documents record with URLs...');

    const { data: docRecord, error: dbError } = await supabase
      .from('user_documents')
      .insert([{
        create_user_id: TEST_USER_ID,
        document_type: 'sample_image',
        document_category: 'user_signup',
        original_filename: `sample-${timestamp}.png`,
        mime_type: 'image/png',
        file_size: imageBuffer.length,
        storage_bucket: 'user-documents',
        storage_path: storagePath,
        status: 'completed',
        retry_count: 0,
        max_retries: 3,
        // ⭐ THE IMPORTANT FIELDS - URLs that show in Supabase
        public_url: signedUrl,
        signed_url: signedUrl,
        signed_url_expires_at: signedUrlExpiresAt,
        metadata: {
          purpose: 'URL verification sample',
          created_by: 'create-sample-image-with-urls script',
          note: 'This record demonstrates how URLs are stored in user_documents'
        }
      }])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database insert failed:', dbError.message);
      return;
    }

    console.log('✅ Record created successfully!');
    console.log('\n' + '='.repeat(70));
    console.log('📋 SAMPLE RECORD DETAILS');
    console.log('='.repeat(70));
    console.log('Document ID:', docRecord.id);
    console.log('Storage Path:', docRecord.storage_path);
    console.log('Status:', docRecord.status);
    console.log('Document Type:', docRecord.document_type);
    console.log('\n🔗 URL FIELDS (visible in Supabase):');
    console.log('   public_url:', docRecord.public_url ? '✅ SET' : '❌ NULL');
    console.log('   signed_url:', docRecord.signed_url ? '✅ SET' : '❌ NULL');
    console.log('   signed_url_expires_at:', docRecord.signed_url_expires_at);
    console.log('\n📍 HOW TO VERIFY IN SUPABASE:');
    console.log('   1. Go to Supabase Dashboard → Table Editor');
    console.log('   2. Open "user_documents" table');
    console.log('   3. Find record with document_type = "sample_image"');
    console.log('   4. Scroll right to see: public_url, signed_url, signed_url_expires_at');
    console.log('   5. Click the URL to test image access');
    console.log('\n⏰ URL EXPIRY:');
    console.log('   Expires at:', docRecord.signed_url_expires_at);
    console.log('   (URLs expire in 1 hour for security)');
    console.log('\n🗑️  TO DELETE THIS SAMPLE:');
    console.log('   DELETE FROM user_documents WHERE document_type = \'sample_image\';');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

createSampleImage()
  .then(() => console.log('\n✅ Sample created successfully!'))
  .catch(error => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
