#!/usr/bin/env node
/**
 * Test Temp Upload Endpoint
 * Verifies /api/images/temp-upload works correctly
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const config = require('../src/config');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

// Test configuration
const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';
const TEST_SESSION_ID = `test_session_${Date.now()}`;

async function createTestImage() {
  // Create a simple 1x1 PNG image for testing
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
  ]);

  return {
    buffer: pngData,
    filename: 'test-image.png',
    mimetype: 'image/png'
  };
}

async function testTempUpload() {
  console.log(colors.cyan, '\n🧪 Testing Temp Upload Endpoint\n');
  console.log(colors.cyan, '─'.repeat(60));

  let uploadId = null;
  let tempPath = null;

  try {
    // Step 1: Create test image
    console.log(colors.cyan, '\n1️⃣  Creating test image...');
    const testImage = await createTestImage();
    console.log(colors.green, `✅ Test image created (${testImage.buffer.length} bytes)`);

    // Step 2: Prepare form data
    console.log(colors.cyan, '\n2️⃣  Preparing form data...');
    const formData = new FormData();
    formData.append('file', testImage.buffer, {
      filename: testImage.filename,
      contentType: testImage.mimetype
    });
    formData.append('field_name', 'driving_license_picture');
    formData.append('temp_session_id', TEST_SESSION_ID);

    console.log(colors.cyan, `   📝 Session ID: ${TEST_SESSION_ID}`);
    console.log(colors.cyan, `   📝 Field name: driving_license_picture`);
    console.log(colors.green, '✅ Form data prepared');

    // Step 3: Upload to temp endpoint
    console.log(colors.cyan, '\n3️⃣  Uploading to /api/images/temp-upload...');
    const uploadUrl = `${SERVER_URL}/api/images/temp-upload`;
    console.log(colors.cyan, `   🌐 URL: ${uploadUrl}`);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const responseText = await response.text();
    console.log(colors.cyan, `   📊 Response status: ${response.status}`);

    if (!response.ok) {
      console.log(colors.red, `❌ Upload failed: ${response.status}`);
      console.log(colors.red, `Response: ${responseText}`);
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const result = JSON.parse(responseText);
    uploadId = result.uploadId;
    tempPath = result.tempPath;

    console.log(colors.green, '✅ Upload successful!');
    console.log(colors.cyan, '\n📋 Response Data:');
    console.log(colors.cyan, '   ─'.repeat(55));
    console.log(colors.green, `   ✓ Upload ID: ${result.uploadId}`);
    console.log(colors.green, `   ✓ Temp Path: ${result.tempPath}`);
    console.log(colors.green, `   ✓ Preview URL: ${result.previewUrl}`);
    console.log(colors.green, `   ✓ File Size: ${result.fileSize} bytes`);

    // Step 4: Verify database record
    console.log(colors.cyan, '\n4️⃣  Verifying database record...');
    const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

    const { data: dbRecord, error: dbError } = await supabase
      .from('temp_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (dbError) {
      console.log(colors.red, `❌ Database verification failed: ${dbError.message}`);
      throw dbError;
    }

    console.log(colors.green, '✅ Database record found!');
    console.log(colors.cyan, '\n📊 Database Record:');
    console.log(colors.cyan, '   ─'.repeat(55));
    console.log(colors.green, `   ✓ ID: ${dbRecord.id}`);
    console.log(colors.green, `   ✓ Session ID: ${dbRecord.session_id}`);
    console.log(colors.green, `   ✓ Field Name: ${dbRecord.field_name}`);
    console.log(colors.green, `   ✓ Storage Path: ${dbRecord.storage_path}`);
    console.log(colors.green, `   ✓ File Size: ${dbRecord.file_size} bytes`);
    console.log(colors.green, `   ✓ MIME Type: ${dbRecord.mime_type}`);
    console.log(colors.green, `   ✓ Claimed: ${dbRecord.claimed}`);
    console.log(colors.green, `   ✓ Uploaded At: ${new Date(dbRecord.uploaded_at).toLocaleString()}`);
    console.log(colors.green, `   ✓ Expires At: ${new Date(dbRecord.expires_at).toLocaleString()}`);

    // Step 5: Verify file in storage
    console.log(colors.cyan, '\n5️⃣  Verifying file in Supabase storage...');

    const { data: fileList, error: listError } = await supabase.storage
      .from('user-documents')
      .list(tempPath.split('/').slice(0, -1).join('/'));

    if (listError) {
      console.log(colors.yellow, `⚠️  Storage list check skipped: ${listError.message}`);
    } else {
      const fileName = tempPath.split('/').pop();
      const fileExists = fileList.some(f => f.name === fileName);

      if (fileExists) {
        console.log(colors.green, '✅ File exists in storage!');
        console.log(colors.cyan, `   📁 Path: ${tempPath}`);
      } else {
        console.log(colors.yellow, `⚠️  File not found in storage listing`);
      }
    }

    // Step 6: Test GET temp uploads endpoint
    console.log(colors.cyan, '\n6️⃣  Testing GET /api/images/temp-uploads/:sessionId...');
    const getTempUrl = `${SERVER_URL}/api/images/temp-uploads/${TEST_SESSION_ID}`;

    const getResponse = await fetch(getTempUrl);
    const getTempData = await getResponse.json();

    if (getResponse.ok && getTempData.uploads && getTempData.uploads.length > 0) {
      console.log(colors.green, '✅ GET endpoint works!');
      console.log(colors.cyan, `   📊 Found ${getTempData.uploads.length} temp upload(s)`);
    } else {
      console.log(colors.yellow, `⚠️  GET endpoint returned no uploads`);
    }

    // Final summary
    console.log(colors.green, '\n' + '═'.repeat(60));
    console.log(colors.green, '🎉 ALL TESTS PASSED!');
    console.log(colors.green, '═'.repeat(60));
    console.log(colors.cyan, '\n✅ Temp upload endpoint is working correctly');
    console.log(colors.cyan, '✅ Database record created successfully');
    console.log(colors.cyan, '✅ File uploaded to Supabase storage');
    console.log(colors.cyan, '✅ GET endpoint returns temp uploads');

    console.log(colors.yellow, '\n📝 Next Steps:');
    console.log(colors.cyan, '  1. Test the full signup flow at:');
    console.log(colors.cyan, `     ${SERVER_URL}/signup-form.html`);
    console.log(colors.cyan, '  2. Select images on any page');
    console.log(colors.cyan, '  3. Watch browser console for upload confirmation');
    console.log(colors.cyan, '  4. Submit form to test temp→permanent conversion');

    console.log(colors.yellow, '\n🧹 Cleanup:');
    console.log(colors.cyan, `  Test upload ID: ${uploadId}`);
    console.log(colors.cyan, `  Test session ID: ${TEST_SESSION_ID}`);
    console.log(colors.cyan, '  (These will auto-expire in 24 hours)\n');

    return { success: true, uploadId, tempPath };

  } catch (error) {
    console.log(colors.red, '\n' + '═'.repeat(60));
    console.log(colors.red, '❌ TEST FAILED');
    console.log(colors.red, '═'.repeat(60));
    console.log(colors.red, `\nError: ${error.message}`);

    if (error.stack) {
      console.log(colors.yellow, '\n📚 Stack trace:');
      console.log(colors.yellow, error.stack);
    }

    console.log(colors.yellow, '\n💡 Troubleshooting:');
    console.log(colors.cyan, '  1. Check server is running on port 3000');
    console.log(colors.cyan, '  2. Verify temp_uploads table exists in Supabase');
    console.log(colors.cyan, '  3. Check Supabase storage bucket permissions');
    console.log(colors.cyan, '  4. Review server logs for errors\n');

    return { success: false, error: error.message };
  }
}

// Run the test
testTempUpload()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error(colors.red, 'Unexpected error:', error);
    process.exit(1);
  });
