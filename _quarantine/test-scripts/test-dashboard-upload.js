#!/usr/bin/env node

/**
 * Test Dashboard Image Upload
 * Tests the POST /api/images/dashboard-upload endpoint
 */

require('dotenv').config();
const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function testDashboardUpload() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          TEST DASHBOARD IMAGE UPLOAD                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

  // Test user credentials (update these)
  const TEST_EMAIL = 'ringo1967@gmail.com';
  const TEST_PASSWORD = 'Skysports1!';

  try {
    // Step 1: Login to get access token
    console.log('🔐 Step 1: Logging in...\n');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful:', {
      userId: loginData.user?.id,
      email: loginData.user?.email
    });

    // Extract cookies from response
    const cookies = loginResponse.headers.raw()['set-cookie'];
    const cookieHeader = cookies.join('; ');

    // Find a test image to upload
    const testImagePath = path.join(__dirname, 'test-image.jpg');

    // Create a small test image if it doesn't exist
    if (!fs.existsSync(testImagePath)) {
      console.log('\n⚠️  No test image found. Creating a small test file...');
      // Create a minimal valid JPEG header (1x1 pixel black image)
      const minimalJpeg = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC0, 0x00, 0x0B, 0x08,
        0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14,
        0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
        0x00, 0x00, 0x3F, 0x00, 0x7F, 0xFF, 0xD9
      ]);
      fs.writeFileSync(testImagePath, minimalJpeg);
      console.log('✅ Created test-image.jpg\n');
    }

    // Step 2: Test dashboard upload
    console.log('📤 Step 2: Testing dashboard upload...\n');

    const form = new FormData();
    form.append('file', fs.createReadStream(testImagePath));
    form.append('document_type', 'scene_photo');

    const uploadResponse = await fetch(`${BASE_URL}/api/images/dashboard-upload`, {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader
      },
      body: form
    });

    console.log('📊 Upload Response Status:', uploadResponse.status, uploadResponse.statusText);

    const uploadData = await uploadResponse.json();
    console.log('📋 Upload Response:', JSON.stringify(uploadData, null, 2));

    if (uploadResponse.ok) {
      console.log('\n✅ Dashboard upload successful!\n');
      console.log('📍 Document Details:');
      console.log(`   ID: ${uploadData.document?.id}`);
      console.log(`   Type: ${uploadData.document?.document_type}`);
      console.log(`   Filename: ${uploadData.document?.original_filename}`);
      console.log(`   Storage Path: ${uploadData.document?.storage_path}`);
      console.log(`   File Size: ${(uploadData.document?.file_size / 1024).toFixed(2)} KB`);
      console.log(`   URL: ${uploadData.document?.signed_url ? 'Generated ✅' : 'Missing ❌'}\n`);
    } else {
      console.log('\n❌ Dashboard upload failed:\n');
      console.log(`   Error: ${uploadData.error}`);
      console.log(`   Message: ${uploadData.message}\n`);
    }

    // Step 3: Test replace operation (if upload succeeded)
    if (uploadResponse.ok && uploadData.document?.id) {
      console.log('\n📤 Step 3: Testing replace operation...\n');

      const replaceForm = new FormData();
      replaceForm.append('file', fs.createReadStream(testImagePath));
      replaceForm.append('document_type', 'scene_photo');
      replaceForm.append('replacing_id', uploadData.document.id);

      const replaceResponse = await fetch(`${BASE_URL}/api/images/dashboard-upload`, {
        method: 'POST',
        headers: {
          'Cookie': cookieHeader
        },
        body: replaceForm
      });

      const replaceData = await replaceResponse.json();
      console.log('📋 Replace Response:', JSON.stringify(replaceData, null, 2));

      if (replaceResponse.ok) {
        console.log('\n✅ Image replacement successful!\n');
      } else {
        console.log('\n❌ Image replacement failed\n');
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testDashboardUpload().catch(console.error);
