#!/usr/bin/env node

/**
 * Test Direct Storage Upload
 *
 * Isolates the Supabase Storage upload to identify failure point.
 * Tests:
 * 1. Bucket accessibility
 * 2. Direct file upload to temp/ folder
 * 3. File existence verification
 * 4. Signed URL generation
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDirectStorageUpload() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          DIRECT STORAGE UPLOAD TEST                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Check if bucket exists and is accessible
    console.log('📦 Step 1: Checking bucket accessibility...');

    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.log('   ❌ Error listing buckets:', bucketError.message);
      return;
    }

    const userDocsBucket = buckets.find(b => b.name === 'user-documents');
    if (!userDocsBucket) {
      console.log('   ❌ Bucket "user-documents" not found');
      console.log('   Available buckets:', buckets.map(b => b.name).join(', '));
      return;
    }

    console.log('   ✅ Bucket "user-documents" exists');
    console.log(`   Public: ${userDocsBucket.public}`);
    console.log('');

    // Step 2: Load test file
    console.log('📸 Step 2: Loading test image...');
    const testImagePath = path.join(__dirname, 'public', 'images', 'logo party emoji.png');

    if (!fs.existsSync(testImagePath)) {
      console.log('   ❌ Test image not found');
      return;
    }

    const imageBuffer = fs.readFileSync(testImagePath);
    console.log(`   ✅ Loaded test image: ${(imageBuffer.length / 1024).toFixed(2)} KB\n`);

    // Step 3: Upload to temp/ folder
    console.log('📤 Step 3: Uploading to temp/ folder...');
    const testSessionId = `test-${Date.now()}`;
    const fileName = `temp/${testSessionId}/direct-test-${Date.now()}.png`;

    console.log(`   Path: ${fileName}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.log('   ❌ Upload error:', uploadError.message);
      console.log('   Full error:', JSON.stringify(uploadError, null, 2));
      return;
    }

    console.log('   ✅ Upload reported success');
    console.log('   Upload data:', JSON.stringify(uploadData, null, 2));
    console.log('');

    // Step 4: Immediately verify file exists
    console.log('🔍 Step 4: Verifying file exists in storage...');

    // Method 1: List files in the temp folder
    const folderPath = `temp/${testSessionId}`;
    const { data: fileList, error: listError } = await supabase.storage
      .from('user-documents')
      .list(folderPath);

    if (listError) {
      console.log('   ❌ List error:', listError.message);
    } else {
      console.log(`   Files in ${folderPath}:`, fileList.length);
      if (fileList.length > 0) {
        console.log('   ✅ File found via list()');
        fileList.forEach(file => {
          console.log(`      - ${file.name} (${(file.metadata.size / 1024).toFixed(2)} KB)`);
        });
      } else {
        console.log('   ❌ No files found via list()');
      }
    }
    console.log('');

    // Method 2: Try to download the file
    console.log('📥 Step 5: Attempting to download file...');
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('user-documents')
      .download(fileName);

    if (downloadError) {
      console.log('   ❌ Download error:', downloadError.message);
    } else {
      console.log('   ✅ File downloaded successfully');
      console.log(`   Size: ${(downloadData.size / 1024).toFixed(2)} KB`);
    }
    console.log('');

    // Step 6: Try to generate signed URL
    console.log('🔗 Step 6: Generating signed URL...');
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('user-documents')
      .createSignedUrl(fileName, 3600);

    if (urlError) {
      console.log('   ❌ Signed URL error:', urlError.message);
    } else {
      console.log('   ✅ Signed URL generated');
      console.log(`   URL: ${signedUrl.signedUrl.substring(0, 80)}...`);
    }
    console.log('');

    // Step 7: Check storage policies
    console.log('🔒 Step 7: Checking storage policies...');
    const { data: policies, error: policyError } = await supabase.rpc('get_storage_policies');

    if (policyError) {
      console.log('   ⚠️  Could not fetch policies (expected - RPC may not exist)');
    } else {
      console.log('   Storage policies:', JSON.stringify(policies, null, 2));
    }
    console.log('');

    // Summary
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   TEST SUMMARY                                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const results = [
      { test: 'Bucket exists', status: userDocsBucket ? '✅' : '❌' },
      { test: 'Upload succeeded', status: uploadError ? '❌' : '✅' },
      { test: 'File in list()', status: (fileList && fileList.length > 0) ? '✅' : '❌' },
      { test: 'File downloadable', status: downloadError ? '❌' : '✅' },
      { test: 'Signed URL works', status: urlError ? '❌' : '✅' }
    ];

    results.forEach(r => console.log(`   ${r.status} ${r.test}`));
    console.log('');

    // Cleanup
    if (!uploadError && !downloadError) {
      console.log('🧹 Cleaning up test file...');
      const { error: deleteError } = await supabase.storage
        .from('user-documents')
        .remove([fileName]);

      if (deleteError) {
        console.log('   ⚠️  Could not delete:', deleteError.message);
      } else {
        console.log('   ✅ Test file deleted\n');
      }
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

testDirectStorageUpload().catch(console.error);
