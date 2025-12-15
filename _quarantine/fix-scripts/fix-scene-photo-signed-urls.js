#!/usr/bin/env node
/**
 * FIX RESCUED SCENE PHOTOS - Add Missing signed_url Fields
 *
 * The emergency rescue successfully moved files and created document records,
 * but only set public_url. This script adds the missing signed_url fields
 * so dataFetcher.js can process them for PDF generation.
 *
 * Root cause: create-scene-photo-records.js only generated public_url
 * Required: signed_url and signed_url_expires_at for dataFetcher.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SCENE_PHOTO_IDS = [
  '73e3fb9d-c16f-4b82-8d37-c66ab7aefd39',
  'eaad4d67-3103-4fbb-8798-6288b28bae96',
  'd996c387-250b-4d33-8d44-fdb2f818c98d'
];

async function fixScenePhotoRecords() {
  console.log('🔧 Fixing Rescued Scene Photo Records\n');
  console.log('Adding missing signed_url fields to enable PDF generation...\n');

  const results = { success: [], failed: [] };

  for (let i = 0; i < SCENE_PHOTO_IDS.length; i++) {
    const id = SCENE_PHOTO_IDS[i];
    const photoNumber = i + 1;

    console.log(`\n📸 Scene Photo #${photoNumber}:`);
    console.log(`   Document ID: ${id}`);

    try {
      // Get the document to read storage_path
      const { data: doc, error: fetchError } = await supabase
        .from('user_documents')
        .select('storage_path')
        .eq('id', id)
        .single();

      if (fetchError) throw new Error(`Fetch failed: ${fetchError.message}`);

      console.log(`   Storage path: ${doc.storage_path}`);

      // Generate signed URL (365 days validity)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(doc.storage_path, 31536000); // 365 days

      if (signedError) throw new Error(`Signed URL generation failed: ${signedError.message}`);

      console.log(`   ✅ Generated signed URL`);
      console.log(`   URL preview: ${signedData.signedUrl.substring(0, 80)}...`);

      // Calculate expiry date (365 days from now)
      const expiresAt = new Date(Date.now() + 31536000000).toISOString();

      // Update record with signed_url
      const { error: updateError } = await supabase
        .from('user_documents')
        .update({
          signed_url: signedData.signedUrl,
          signed_url_expires_at: expiresAt
        })
        .eq('id', id);

      if (updateError) throw new Error(`Update failed: ${updateError.message}`);

      console.log(`   ✅ Updated record with signed_url`);
      console.log(`   ✅ Expiry set to: ${expiresAt}`);
      console.log(`   ✅ Scene Photo #${photoNumber} FIXED`);

      results.success.push({
        photoNumber,
        documentId: id,
        signedUrl: signedData.signedUrl,
        expiresAt
      });

    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      results.failed.push({
        photoNumber,
        documentId: id,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 FIX OPERATION SUMMARY\n');
  console.log(`Total Records Processed: ${SCENE_PHOTO_IDS.length}`);
  console.log(`✅ Successfully Fixed: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);

  if (results.success.length > 0) {
    console.log('\n✅ FIXED SCENE PHOTO RECORDS:');
    results.success.forEach(photo => {
      console.log(`   Scene Photo #${photo.photoNumber}`);
      console.log(`     Document ID: ${photo.documentId}`);
      console.log(`     Signed URL: ${photo.signedUrl.substring(0, 80)}...`);
      console.log(`     Expires: ${photo.expiresAt}`);
    });
  }

  if (results.failed.length > 0) {
    console.log('\n❌ FAILED RECORDS:');
    results.failed.forEach(photo => {
      console.log(`   Scene Photo #${photo.photoNumber}: ${photo.error}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log();

  if (results.success.length === SCENE_PHOTO_IDS.length) {
    console.log('🎉 ALL SCENE PHOTO RECORDS FIXED!');
    console.log('✅ signed_url fields added to all 3 photos');
    console.log('✅ signed_url_expires_at set to 365 days from now');
    console.log('✅ Scene photos will now appear in regenerated PDFs');
    console.log();
    console.log('📋 NEXT STEP:');
    console.log('   Run: node test-form-filling.js 35a7475f-60ca-4c5d-bc48-d13a299f4309');
    console.log('   Verify: Section XXVIII contains 3 scene photo URLs');
    console.log();
  } else if (results.success.length > 0) {
    console.log('⚠️  PARTIAL SUCCESS - Some records were fixed');
    console.log('   Review failed records above and retry if needed');
    console.log();
  } else {
    console.log('❌ FIX FAILED - No records were updated');
    console.log('   Check errors above and verify permissions');
    console.log();
  }
}

// Execute
fixScenePhotoRecords()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
