#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function recoverOrphanedScenePhotos() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          RECOVER ORPHANED SCENE PHOTOS                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const sessionId = 'c8c058bb-88e7-4ee6-aceb-f517164dccd6';
  const userId = '5326c2aa-f1d5-4edc-a972-7fb14995ed0f';

  // Get the incident report ID for this user
  console.log('🔍 Finding incident report...\n');
  const { data: incident, error: incidentError } = await supabase
    .from('incident_reports')
    .select('id')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (incidentError || !incident) {
    console.log('❌ Error finding incident report:', incidentError?.message || 'No incident found');
    return;
  }

  const incidentId = incident.id;
  console.log(`✅ Found incident report: ${incidentId}\n`);

  // Scene photos to recover
  const scenePhotos = [
    { filename: 'scene_photo_1763507167932.jpeg', index: 1 },
    { filename: 'scene_photo_1763507178463.jpeg', index: 2 },
    { filename: 'scene_photo_1763507191198.jpeg', index: 3 }
  ];

  console.log(`📸 Recovering ${scenePhotos.length} scene photos:\n`);

  for (const photo of scenePhotos) {
    console.log(`Processing ${photo.filename}...`);

    const tempPath = `temp/${sessionId}/${photo.filename}`;
    const permanentPath = `users/${userId}/incident-reports/${incidentId}/scene-photos/${photo.filename}`;

    try {
      // 1. Download from temp location
      console.log(`   1️⃣ Downloading from temp...`);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('user-documents')
        .download(tempPath);

      if (downloadError) {
        console.log(`   ❌ Download failed: ${downloadError.message}\n`);
        continue;
      }

      // 2. Upload to permanent location
      console.log(`   2️⃣ Uploading to permanent storage...`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(permanentPath, fileData, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.log(`   ❌ Upload failed: ${uploadError.message}\n`);
        continue;
      }

      // 3. Generate signed URL (12 months)
      console.log(`   3️⃣ Generating signed URL...`);
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(permanentPath, 31536000); // 12 months in seconds

      if (signedUrlError) {
        console.log(`   ❌ Signed URL generation failed: ${signedUrlError.message}\n`);
        continue;
      }

      const signedUrl = signedUrlData.signedUrl;

      // 4. Create user_documents record
      console.log(`   4️⃣ Creating database record...`);
      const { data: docRecord, error: docError } = await supabase
        .from('user_documents')
        .insert({
          create_user_id: userId,
          incident_report_id: incidentId,
          original_filename: photo.filename,
          document_type: 'scene_photo',
          document_category: 'incident_report',
          storage_path: permanentPath,
          signed_url: signedUrl,
          status: 'completed'
        })
        .select()
        .single();

      if (docError) {
        console.log(`   ❌ Database insert failed: ${docError.message}\n`);
        continue;
      }

      console.log(`   ✅ Successfully recovered! Document ID: ${docRecord.id}`);
      console.log(`   📍 Permanent path: ${permanentPath}`);
      console.log(`   🔗 URL generated\n`);

      // 5. Optionally delete temp file (keeping for now for safety)
      // await supabase.storage.from('user-documents').remove([tempPath]);

    } catch (error) {
      console.log(`   ❌ Unexpected error: ${error.message}\n`);
      continue;
    }
  }

  // Verify recovery
  console.log('\n\n📊 Verification - Checking database:\n');
  const { data: sceneRecords, error: verifyError } = await supabase
    .from('user_documents')
    .select('id, original_filename, document_type, storage_path, signed_url')
    .eq('create_user_id', userId)
    .eq('document_type', 'scene_photo')
    .order('created_at', { ascending: true });

  if (verifyError) {
    console.log('❌ Verification failed:', verifyError.message);
  } else if (sceneRecords && sceneRecords.length > 0) {
    console.log(`✅ Found ${sceneRecords.length} scene photo records:\n`);
    sceneRecords.forEach((record, idx) => {
      console.log(`   ${idx + 1}. ${record.original_filename}`);
      console.log(`      Document ID: ${record.id}`);
      console.log(`      Storage: ${record.storage_path}`);
      console.log(`      URL: ${record.signed_url ? 'Generated ✅' : 'Missing ❌'}\n`);
    });

    console.log('\n🎉 Recovery complete! Scene photos are now in permanent storage.\n');
    console.log('Next step: Regenerate PDF to verify all scene photo URLs appear.\n');
  } else {
    console.log('❌ No scene photo records found after recovery');
  }
}

recoverOrphanedScenePhotos().catch(console.error);
