#!/usr/bin/env node

/**
 * Test Supabase Storage .move() Operation
 *
 * Tests if the Supabase Storage move API is working correctly
 * by creating a test file and attempting to move it
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testStorageMove() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          TEST SUPABASE STORAGE .move() OPERATION             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const testSessionId = `test-move-${Date.now()}`;
  const testImagePath = path.join(__dirname, 'public', 'images', 'logo party emoji.png');

  try {
    // Step 1: Upload a test file to temp/ location
    console.log('📤 Step 1: Uploading test file to temp/ location...');

    const imageBuffer = fs.readFileSync(testImagePath);
    const tempPath = `temp/${testSessionId}/test-photo.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(tempPath, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.log('   ❌ Upload failed:', uploadError.message);
      return;
    }

    console.log('   ✅ File uploaded to:', tempPath);
    console.log('   Upload result:', JSON.stringify(uploadData, null, 2));
    console.log('');

    // Step 2: Verify file exists in temp/
    console.log('🔍 Step 2: Verifying file exists in temp/...');

    const { data: tempFiles, error: listError } = await supabase.storage
      .from('user-documents')
      .list(`temp/${testSessionId}`);

    if (listError) {
      console.log('   ❌ List failed:', listError.message);
      return;
    }

    if (!tempFiles || tempFiles.length === 0) {
      console.log('   ❌ File not found in temp/ location after upload');
      return;
    }

    console.log('   ✅ File exists in temp/');
    console.log(`   File: ${tempFiles[0].name} (${(tempFiles[0].metadata.size / 1024).toFixed(2)} KB)`);
    console.log('');

    // Step 3: Attempt to move file (THIS IS THE CRITICAL TEST)
    console.log('🚚 Step 3: Attempting to move file...');

    const permanentPath = `users/test-user-${Date.now()}/incident-reports/test-report/location-photos/test_photo_1.png`;

    console.log(`   From: ${tempPath}`);
    console.log(`   To: ${permanentPath}`);
    console.log('');

    const { data: moveData, error: moveError } = await supabase.storage
      .from('user-documents')
      .move(tempPath, permanentPath);

    if (moveError) {
      console.log('   ❌ Move FAILED');
      console.log('   Error:', JSON.stringify(moveError, null, 2));
      console.log('');

      // Check if file still exists in temp/
      const { data: stillInTemp } = await supabase.storage
        .from('user-documents')
        .list(`temp/${testSessionId}`);

      console.log(`   File still in temp/: ${stillInTemp && stillInTemp.length > 0 ? '✅ Yes' : '❌ No (DELETED!)'}`);

      return;
    }

    console.log('   ✅ Move reported success');
    console.log('   Move result:', JSON.stringify(moveData, null, 2));
    console.log('');

    // Step 4: Verify file NO LONGER in temp/
    console.log('🔍 Step 4: Verifying file moved FROM temp/...');

    const { data: tempCheck, error: tempCheckError } = await supabase.storage
      .from('user-documents')
      .list(`temp/${testSessionId}`);

    if (tempCheckError) {
      console.log('   ⚠️  Error checking temp:', tempCheckError.message);
    } else if (!tempCheck || tempCheck.length === 0) {
      console.log('   ✅ File correctly removed from temp/');
    } else {
      console.log('   ❌ File STILL in temp/ after move!');
      console.log('   Files:', tempCheck.map(f => f.name));
    }
    console.log('');

    // Step 5: Verify file EXISTS in permanent location
    console.log('🔍 Step 5: Verifying file EXISTS in permanent location...');

    // Extract the directory path from permanent path
    const permDir = path.dirname(permanentPath).replace(/\\/g, '/');
    const permFile = path.basename(permanentPath);

    const { data: permFiles, error: permError } = await supabase.storage
      .from('user-documents')
      .list(permDir);

    if (permError) {
      console.log('   ❌ Error listing permanent location:', permError.message);
    } else if (!permFiles || permFiles.length === 0) {
      console.log('   ❌ NO FILES in permanent location!');
      console.log(`   Directory checked: ${permDir}`);
    } else {
      const movedFile = permFiles.find(f => f.name === permFile);
      if (movedFile) {
        console.log('   ✅ File found in permanent location!');
        console.log(`   File: ${movedFile.name} (${(movedFile.metadata.size / 1024).toFixed(2)} KB)`);
      } else {
        console.log('   ❌ File NOT found in permanent location');
        console.log('   Files in directory:', permFiles.map(f => f.name));
      }
    }
    console.log('');

    // Summary
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   TEST SUMMARY                                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (!moveError && permFiles && permFiles.some(f => f.name === permFile)) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('   - Upload to temp/ worked');
      console.log('   - Move operation succeeded');
      console.log('   - File removed from temp/');
      console.log('   - File exists in permanent location');
    } else {
      console.log('❌ MOVE OPERATION FAILED!');
      console.log(`   - Move API returned: ${moveError ? 'ERROR' : 'SUCCESS'}`);
      console.log(`   - File removed from temp/: ${!tempCheck || tempCheck.length === 0 ? 'YES' : 'NO'}`);
      console.log(`   - File in permanent location: ${permFiles && permFiles.some(f => f.name === permFile) ? 'YES' : 'NO'}`);

      if (!moveError && (!permFiles || !permFiles.some(f => f.name === permFile))) {
        console.log('\n⚠️  CRITICAL: Move API reported success but file is MISSING!');
        console.log('   This explains why files are disappearing during finalization.');
      }
    }
    console.log('');

    // Cleanup
    console.log('🧹 Cleaning up...');
    if (permFiles && permFiles.some(f => f.name === permFile)) {
      const { error: deleteError } = await supabase.storage
        .from('user-documents')
        .remove([permanentPath]);

      if (deleteError) {
        console.log('   ⚠️  Could not delete test file:', deleteError.message);
      } else {
        console.log('   ✅ Test file deleted');
      }
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

testStorageMove().catch(console.error);
