#!/usr/bin/env node

/**
 * Test Image Upload - Verify temp upload endpoint and storage
 *
 * Tests:
 * 1. Generate test image (using canvas)
 * 2. Upload to /api/images/temp-upload
 * 3. Verify storage in temp_uploads table
 * 4. Verify file exists in Supabase Storage
 * 5. Generate signed URL
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const http = require('http');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Use existing test image from public folder
function getTestImage() {
  const testImagePath = path.join(__dirname, 'public', 'images', 'logo party emoji.png');

  if (!fs.existsSync(testImagePath)) {
    throw new Error(`Test image not found at: ${testImagePath}`);
  }

  return fs.readFileSync(testImagePath);
}

async function uploadImage(imageBuffer, sessionId, fieldName) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('image', imageBuffer, {
      filename: 'test-upload.png',
      contentType: 'image/png'
    });
    form.append('temp_session_id', sessionId);
    form.append('field_name', fieldName);

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/images/temp-upload',
      method: 'POST',
      headers: form.getHeaders()
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data)
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

async function testImageUpload() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║              IMAGE UPLOAD TEST                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const sessionId = `test-${Date.now()}`;

  try {
    // Step 1: Load test image
    console.log('📸 Step 1: Loading test image...');
    const imageBuffer = getTestImage();
    const imageSize = (imageBuffer.length / 1024).toFixed(2);
    console.log(`   ✅ Loaded PNG: ${imageSize} KB\n`);

    // Step 2: Upload image
    console.log('📤 Step 2: Uploading to /api/images/temp-upload...');
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Field Name: scene_photo_1\n`);

    const uploadResponse = await uploadImage(imageBuffer, sessionId, 'scene_photo_1');

    console.log(`   HTTP Status: ${uploadResponse.status}`);

    if (uploadResponse.status === 200 || uploadResponse.status === 201) {
      console.log('   ✅ Upload successful\n');
      console.log('   Response:', JSON.stringify(uploadResponse.body, null, 2));
    } else {
      console.log('   ❌ Upload failed\n');
      console.log('   Response:', uploadResponse.body);
      return;
    }

    // Step 3: Check temp_uploads table
    console.log('\n📋 Step 3: Verifying temp_uploads table...');

    const { data: tempUpload, error: tempError } = await supabase
      .from('temp_uploads')
      .select('*')
      .eq('session_id', sessionId)
      .eq('field_name', 'scene_photo_1')
      .single();

    if (tempError) {
      console.log('   ❌ Error querying temp_uploads:', tempError.message);
      return;
    }

    if (!tempUpload) {
      console.log('   ❌ No record found in temp_uploads table');
      return;
    }

    console.log('   ✅ Record found in temp_uploads');
    console.log(`   ID: ${tempUpload.id}`);
    console.log(`   Storage Path: ${tempUpload.storage_path}`);
    console.log(`   Claimed: ${tempUpload.claimed}`);
    console.log(`   File Size: ${(tempUpload.file_size / 1024).toFixed(2)} KB\n`);

    // Step 4: Check Supabase Storage
    console.log('📦 Step 4: Verifying Supabase Storage...');

    const { data: fileExists, error: storageError } = await supabase.storage
      .from('user-documents')
      .list(path.dirname(tempUpload.storage_path), {
        search: path.basename(tempUpload.storage_path)
      });

    if (storageError) {
      console.log('   ❌ Storage error:', storageError.message);
      return;
    }

    if (fileExists && fileExists.length > 0) {
      console.log('   ✅ File exists in storage');
      console.log(`   Name: ${fileExists[0].name}`);
      console.log(`   Size: ${(fileExists[0].metadata.size / 1024).toFixed(2)} KB\n`);
    } else {
      console.log('   ❌ File not found in storage\n');
      return;
    }

    // Step 5: Generate signed URL
    console.log('🔗 Step 5: Generating signed URL...');

    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('user-documents')
      .createSignedUrl(tempUpload.storage_path, 3600);

    if (urlError) {
      console.log('   ❌ URL error:', urlError.message);
      return;
    }

    console.log('   ✅ Signed URL generated');
    console.log(`   URL: ${signedUrl.signedUrl.substring(0, 80)}...\n`);

    // Summary
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   TEST RESULTS                                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('✅ Image generation: PASSED');
    console.log('✅ HTTP upload: PASSED');
    console.log('✅ Database record: PASSED');
    console.log('✅ Storage file: PASSED');
    console.log('✅ Signed URL: PASSED\n');

    console.log('🎉 ALL TESTS PASSED!\n');

    console.log('📋 Next Steps:\n');
    console.log('1. Clean up test data:');
    console.log(`   DELETE FROM temp_uploads WHERE session_id = '${sessionId}';\n`);
    console.log('2. Test complete form flow with photo finalization');
    console.log('3. Verify photos appear in PDF generation\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Check if server is running
console.log('🔍 Checking if server is running on localhost:5000...');
const testReq = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/health',
  method: 'GET'
}, (res) => {
  if (res.statusCode === 200) {
    console.log('   ✅ Server is running\n');
    testImageUpload();
  } else {
    console.log('   ⚠️  Server responded but health check failed');
    console.log('   Proceeding with test anyway...\n');
    testImageUpload();
  }
});

testReq.on('error', (error) => {
  console.log('   ❌ Server not running on localhost:5000');
  console.log('   Please start server: npm run dev\n');
  process.exit(1);
});

testReq.end();
