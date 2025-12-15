#!/usr/bin/env node

/**
 * Test Scene Photo Fix - Validation Script
 *
 * Validates that Page 4a scene photos (general scene views) are correctly:
 * 1. Finalized from temp_uploads to user_documents
 * 2. Saved with correct document_type values for PDF generation
 * 3. Retrieved by dataFetcher for PDF pages 11-12
 *
 * NOTE: This script validates ONLY Page 4a scene photos.
 * The Page 4 location map screenshot (document_type='location_map_screenshot')
 * is handled separately and already working via incidentForm.controller.js.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = '1048b3ac-11ec-4e98-968d-9de28183a84d';
const sessionId = 'c8c058bb-88e7-4ee6-aceb-f517164dccd6'; // From recent test upload

async function testScenePhotoFix() {
  console.log('🧪 Testing Scene Photo Fix');
  console.log('='.repeat(80));
  console.log(`User ID: ${userId}`);
  console.log(`Session ID: ${sessionId}`);
  console.log('');

  // 1. Check temp_uploads table for scene photos
  console.log('📋 Step 1: Checking temp_uploads for scene photos...\n');

  const { data: tempUploads, error: tempError } = await supabase
    .from('temp_uploads')
    .select('*')
    .eq('session_id', sessionId)
    .eq('field_name', 'scene_photo')
    .order('uploaded_at', { ascending: true });

  if (tempError) {
    console.log('❌ Error querying temp_uploads:', tempError.message);
    return;
  }

  console.log(`Found ${tempUploads.length} scene photos in temp_uploads:`);
  tempUploads.forEach((upload, index) => {
    const status = upload.claimed ? '✅ CLAIMED' : '⚠️  UNCLAIMED';
    console.log(`  ${index + 1}. ${status} ${upload.storage_path}`);
    console.log(`     - Upload ID: ${upload.id}`);
    console.log(`     - File size: ${(upload.file_size / 1024).toFixed(2)} KB`);
    console.log(`     - Claimed: ${upload.claimed}`);
    console.log(`     - Created: ${upload.uploaded_at}`);
    console.log('');
  });

  // 2. Check user_documents table for finalized scene photos
  console.log('='.repeat(80));
  console.log('📋 Step 2: Checking user_documents for finalized scene photos...\n');

  const { data: userDocs, error: docsError } = await supabase
    .from('user_documents')
    .select('*')
    .eq('create_user_id', userId)
    .eq('status', 'completed')
    .is('deleted_at', null)
    .in('document_type', ['scene_overview', 'scene_overview_2'])
    .order('created_at', { ascending: true });

  if (docsError) {
    console.log('❌ Error querying user_documents:', docsError.message);
    return;
  }

  if (!userDocs || userDocs.length === 0) {
    console.log('⚠️  No scene photos found in user_documents');
    console.log('💡 Scene photos may not have been finalized yet.');
    console.log('   Try submitting the incident form to trigger finalization.\n');
  } else {
    console.log(`✅ Found ${userDocs.length} finalized scene photos:\n`);

    userDocs.forEach((doc, index) => {
      const hasUrl = doc.signed_url ? '✅ HAS URL' : '❌ NO URL';
      console.log(`  Photo ${index + 1}: ${doc.document_type}`);
      console.log(`    ${hasUrl}`);
      console.log(`    Storage path: ${doc.storage_path}`);
      console.log(`    Document ID: ${doc.id}`);
      console.log(`    Created: ${doc.created_at}`);
      if (doc.signed_url) {
        console.log(`    Signed URL: ${doc.signed_url.substring(0, 100)}...`);
        console.log(`    Expires: ${doc.signed_url_expires_at}`);
      }
      console.log('');
    });

    // 3. Verify document_type mapping
    console.log('='.repeat(80));
    console.log('📋 Step 3: Verifying document_type mapping...\n');

    const expectedMapping = {
      1: 'scene_overview',
      2: 'scene_overview_2'
    };

    let mappingCorrect = true;
    userDocs.forEach((doc, index) => {
      const photoNumber = index + 1;
      const expectedType = expectedMapping[photoNumber];
      const actualType = doc.document_type;

      if (actualType === expectedType) {
        console.log(`  ✅ Photo ${photoNumber}: ${actualType} (CORRECT)`);
      } else {
        console.log(`  ❌ Photo ${photoNumber}: ${actualType} (EXPECTED: ${expectedType})`);
        mappingCorrect = false;
      }
    });

    console.log('');

    if (mappingCorrect) {
      console.log('✅ Document type mapping is CORRECT');
    } else {
      console.log('❌ Document type mapping is INCORRECT');
    }
  }

  // 4. Check PDF field mapping (simulate dataFetcher)
  console.log('\n' + '='.repeat(80));
  console.log('📋 Step 4: Testing PDF field mapping (simulating dataFetcher)...\n');

  const pdfFieldMapping = {
    'scene_overview': 'scene_images_path_2',
    'scene_overview_2': 'scene_images_path_3'
  };

  console.log('Expected PDF field mapping:');
  Object.entries(pdfFieldMapping).forEach(([docType, pdfField]) => {
    const matchingDoc = userDocs?.find(d => d.document_type === docType);
    if (matchingDoc && matchingDoc.signed_url) {
      console.log(`  ✅ ${docType} → ${pdfField}`);
      console.log(`     URL available: ${matchingDoc.signed_url.substring(0, 80)}...`);
    } else {
      console.log(`  ❌ ${docType} → ${pdfField}`);
      console.log(`     URL missing or document not found`);
    }
    console.log('');
  });

  // 5. Summary
  console.log('='.repeat(80));
  console.log('📊 Test Summary\n');

  const tempCount = tempUploads.length;
  const finalizedCount = userDocs?.length || 0;
  const claimedCount = tempUploads.filter(u => u.claimed).length;
  const unclaimedCount = tempUploads.filter(u => !u.claimed).length;

  console.log(`Temp uploads found:     ${tempCount}`);
  console.log(`  - Claimed:            ${claimedCount}`);
  console.log(`  - Unclaimed:          ${unclaimedCount}`);
  console.log(`Finalized documents:    ${finalizedCount}`);
  console.log('');

  if (finalizedCount === 0) {
    console.log('⚠️  STATUS: Scene photos have NOT been finalized yet');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Complete and submit the incident form');
    console.log('   2. Re-run this test script to verify finalization');
    console.log('   3. If finalization fails, check incidentForm.controller.js logs');
  } else if (finalizedCount < tempCount) {
    console.log('⚠️  STATUS: Partial finalization - some photos missing');
    console.log(`   ${tempCount - finalizedCount} photo(s) not finalized`);
  } else {
    console.log('✅ STATUS: All scene photos successfully finalized!');
    console.log('');
    console.log('✅ READY FOR PDF GENERATION');
    console.log('   Run: node test-form-filling.js ' + userId);
  }

  console.log('');
  console.log('='.repeat(80));
}

testScenePhotoFix().catch(console.error);
