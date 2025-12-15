#!/usr/bin/env node
/**
 * CREATE DOCUMENT RECORDS - Scene Photos Already Moved
 *
 * Files were successfully moved to permanent storage but document records failed.
 * This script creates the missing user_documents records for the 3 scene photos.
 *
 * Files already in permanent storage:
 * - users/35a7475f-60ca-4c5d-bc48-d13a299f4309/incident-reports/3aead998-97f7-4626-9b59-47f58e1fe601/scene-photos/scene_photo_1.jpg
 * - users/35a7475f-60ca-4c5d-bc48-d13a299f4309/incident-reports/3aead998-97f7-4626-9b59-47f58e1fe601/scene-photos/scene_photo_2.jpg
 * - users/35a7475f-60ca-4c5d-bc48-d13a299f4309/incident-reports/3aead998-97f7-4626-9b59-47f58e1fe601/scene-photos/scene_photo_3.jpg
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = '35a7475f-60ca-4c5d-bc48-d13a299f4309';
const SESSION_ID = '3a25e7a6-9876-4392-ad00-99b267662821';
const INCIDENT_ID = '3aead998-97f7-4626-9b59-47f58e1fe601';

// Scene photo details from temp_uploads
const scenePhotos = [
  {
    id: '5862bb78-c313-4514-9ef4-550d5c913dc2',
    filename: 'scene_photo_1764764784705.jpeg',
    size: 1898168,
    permanentPath: `users/${USER_ID}/incident-reports/${INCIDENT_ID}/scene-photos/scene_photo_1.jpg`
  },
  {
    id: '59c7e5d7-e9c8-40c5-a5c1-0682e0e6827f',
    filename: 'scene_photo_1764764824462.jpeg',
    size: 1375100,
    permanentPath: `users/${USER_ID}/incident-reports/${INCIDENT_ID}/scene-photos/scene_photo_2.jpg`
  },
  {
    id: '49f86ff4-0eac-47c7-a4bb-388b54ab4005',
    filename: 'scene_photo_1764764859051.jpeg',
    size: 3502293,
    permanentPath: `users/${USER_ID}/incident-reports/${INCIDENT_ID}/scene-photos/scene_photo_3.jpg`
  }
];

async function createDocumentRecords() {
  console.log('📝 Creating Document Records for Scene Photos\n');
  console.log('User:', USER_ID);
  console.log('Incident:', INCIDENT_ID);
  console.log();

  const results = {
    success: [],
    failed: []
  };

  for (let i = 0; i < scenePhotos.length; i++) {
    const photo = scenePhotos[i];
    const photoNumber = i + 1;

    console.log(`\n📸 Scene Photo #${photoNumber}:`);
    console.log(`   Temp Upload ID: ${photo.id}`);
    console.log(`   File Size: ${(photo.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Storage Path: ${photo.permanentPath}`);

    try {
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('user-documents')
        .getPublicUrl(photo.permanentPath);

      const publicUrl = publicUrlData.publicUrl;
      console.log(`   Public URL: ${publicUrl.substring(0, 80)}...`);

      // Create user_documents record
      const { data: docRecord, error: docError } = await supabase
        .from('user_documents')
        .insert({
          create_user_id: USER_ID,
          incident_report_id: INCIDENT_ID,
          document_type: 'scene_photo',
          original_filename: photo.filename,
          file_size: photo.size,
          mime_type: 'image/jpeg',
          storage_path: photo.permanentPath,
          storage_bucket: 'user-documents',
          public_url: publicUrl,
          status: 'completed',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (docError) {
        throw new Error(`Failed to create document record: ${docError.message}`);
      }

      console.log(`   ✅ Created user_documents record: ${docRecord.id}`);

      // Mark temp upload as claimed
      const { error: claimError } = await supabase
        .from('temp_uploads')
        .update({
          claimed: true,
          claimed_by_user_id: USER_ID,
          claimed_at: new Date().toISOString()
        })
        .eq('id', photo.id);

      if (claimError) {
        console.log(`   ⚠️  Warning: Could not mark temp upload as claimed: ${claimError.message}`);
      } else {
        console.log('   ✅ Marked temp upload as claimed');
      }

      console.log(`   ✅ Scene Photo #${photoNumber} RECORD CREATED`);

      results.success.push({
        photoNumber,
        tempUploadId: photo.id,
        documentId: docRecord.id,
        publicUrl
      });

    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      results.failed.push({
        photoNumber,
        tempUploadId: photo.id,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 OPERATION SUMMARY\n');
  console.log(`Total Records Processed: ${scenePhotos.length}`);
  console.log(`✅ Successfully Created: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);

  if (results.success.length > 0) {
    console.log('\n✅ CREATED DOCUMENT RECORDS:');
    results.success.forEach(photo => {
      console.log(`   Scene Photo #${photo.photoNumber}`);
      console.log(`     Document ID: ${photo.documentId}`);
      console.log(`     Public URL: ${photo.publicUrl}`);
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

  if (results.success.length === scenePhotos.length) {
    console.log('🎉 ALL DOCUMENT RECORDS CREATED SUCCESSFULLY!');
    console.log('✅ Photos are now properly recorded in user_documents');
    console.log('✅ Temp uploads marked as claimed');
    console.log('✅ URLs will appear in regenerated PDFs');
    console.log();
  } else if (results.success.length > 0) {
    console.log('⚠️  PARTIAL SUCCESS - Some records were created');
    console.log('   Review failed records above and retry if needed');
    console.log();
  } else {
    console.log('❌ OPERATION FAILED - No records were created');
    console.log('   Check errors above and verify permissions');
    console.log();
  }
}

// Execute
createDocumentRecords()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
