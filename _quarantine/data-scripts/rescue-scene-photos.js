#!/usr/bin/env node
/**
 * EMERGENCY RESCUE SCRIPT - Scene Photos Expiring Today
 *
 * Manually migrates 3 scene photos from temp_uploads to user_documents
 * before they expire at 12:26-12:27 PM GMT on 2025-12-04.
 *
 * Scene Photo Details:
 * - ID 1: 5862bb78-c313-4514-9ef4-550d5c913dc2 (1.9 MB) - Expires 12:26
 * - ID 2: 59c7e5d7-e9c8-40c5-a5c1-0682e0e6827f (1.4 MB) - Expires 12:27
 * - ID 3: 49f86ff4-0eac-47c7-a4bb-388b54ab4005 (3.5 MB) - Expires 12:27
 *
 * User: 35a7475f-60ca-4c5d-bc48-d13a299f4309
 * Session: 3a25e7a6-9876-4392-ad00-99b267662821
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = '35a7475f-60ca-4c5d-bc48-d13a299f4309';
const SESSION_ID = '3a25e7a6-9876-4392-ad00-99b267662821';

// Find incident report ID for this user
async function findIncidentReportId() {
  const { data, error } = await supabase
    .from('incident_reports')
    .select('id, created_at')
    .eq('create_user_id', USER_ID)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to find incident report: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('No incident report found for this user');
  }

  return data[0].id;
}

async function rescueScenePhotos() {
  console.log('🚨 EMERGENCY RESCUE - Scene Photos Expiring Today\n');
  console.log('User:', USER_ID);
  console.log('Session:', SESSION_ID);
  console.log();

  try {
    // 1. Find the incident report ID
    console.log('Step 1: Finding incident report ID...');
    const incidentReportId = await findIncidentReportId();
    console.log(`✅ Found incident report: ${incidentReportId}\n`);

    // 2. Get all scene photos from temp_uploads
    console.log('Step 2: Fetching scene photos from temp_uploads...');
    const { data: tempPhotos, error: fetchError } = await supabase
      .from('temp_uploads')
      .select('*')
      .eq('session_id', SESSION_ID)
      .eq('field_name', 'scene_photo')
      .eq('claimed', false)
      .order('uploaded_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch temp uploads: ${fetchError.message}`);
    }

    if (!tempPhotos || tempPhotos.length === 0) {
      console.log('⚠️  No unclaimed scene photos found in temp_uploads');
      console.log('   They may have already been rescued or expired.');
      return;
    }

    console.log(`✅ Found ${tempPhotos.length} unclaimed scene photos\n`);

    // 3. Process each photo
    const results = {
      success: [],
      failed: []
    };

    for (let i = 0; i < tempPhotos.length; i++) {
      const photo = tempPhotos[i];
      const photoNumber = i + 1;

      console.log(`\n📸 Processing Scene Photo #${photoNumber}:`);
      console.log(`   Temp Upload ID: ${photo.id}`);
      console.log(`   File Size: ${(photo.file_size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Expires: ${photo.expires_at}`);
      console.log(`   Storage Path: ${photo.storage_path}`);

      try {
        // Move file from temp to permanent storage
        const tempPath = photo.storage_path;
        const permanentPath = `users/${USER_ID}/incident-reports/${incidentReportId}/scene-photos/scene_photo_${photoNumber}.jpg`;

        console.log(`   Moving: ${tempPath}`);
        console.log(`   To: ${permanentPath}`);

        const { data: moveData, error: moveError } = await supabase.storage
          .from('user-documents')
          .move(tempPath, permanentPath);

        if (moveError) {
          throw new Error(`Storage move failed: ${moveError.message}`);
        }

        console.log('   ✅ File moved successfully');

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('user-documents')
          .getPublicUrl(permanentPath);

        const publicUrl = publicUrlData.publicUrl;

        // Create user_documents record
        const { data: docRecord, error: docError } = await supabase
          .from('user_documents')
          .insert({
            create_user_id: USER_ID,
            incident_report_id: incidentReportId,
            document_type: 'scene_photo',
            original_filename: photo.original_filename || `scene_photo_${photoNumber}.jpg`,
            file_size: photo.file_size,
            mime_type: photo.mime_type || 'image/jpeg',
            storage_path: permanentPath,
            public_url: publicUrl,
            status: 'completed',
            storage_bucket: 'user-documents',
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
          throw new Error(`Failed to mark as claimed: ${claimError.message}`);
        }

        console.log('   ✅ Marked temp upload as claimed');
        console.log(`   ✅ Scene Photo #${photoNumber} RESCUED SUCCESSFULLY`);

        results.success.push({
          photoNumber,
          tempUploadId: photo.id,
          documentId: docRecord.id,
          publicUrl
        });

      } catch (photoError) {
        console.error(`   ❌ FAILED: ${photoError.message}`);
        results.failed.push({
          photoNumber,
          tempUploadId: photo.id,
          error: photoError.message
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 RESCUE OPERATION SUMMARY\n');
    console.log(`Total Photos Processed: ${tempPhotos.length}`);
    console.log(`✅ Successfully Rescued: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);

    if (results.success.length > 0) {
      console.log('\n✅ RESCUED SCENE PHOTOS:');
      results.success.forEach(photo => {
        console.log(`   Scene Photo #${photo.photoNumber}`);
        console.log(`     Document ID: ${photo.documentId}`);
        console.log(`     Public URL: ${photo.publicUrl}`);
      });
    }

    if (results.failed.length > 0) {
      console.log('\n❌ FAILED PHOTOS:');
      results.failed.forEach(photo => {
        console.log(`   Scene Photo #${photo.photoNumber}: ${photo.error}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log();

    if (results.success.length === tempPhotos.length) {
      console.log('🎉 ALL SCENE PHOTOS RESCUED SUCCESSFULLY!');
      console.log('✅ Photos are now in permanent storage');
      console.log('✅ URLs will appear in regenerated PDFs');
      console.log();
    } else if (results.success.length > 0) {
      console.log('⚠️  PARTIAL SUCCESS - Some photos were rescued');
      console.log('   Review failed photos above and retry if needed');
      console.log();
    } else {
      console.log('❌ RESCUE FAILED - No photos were migrated');
      console.log('   Check errors above and verify permissions');
      console.log();
    }

  } catch (error) {
    console.error('\n💥 RESCUE OPERATION FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Execute rescue
rescueScenePhotos()
  .then(() => {
    console.log('✅ Rescue script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
