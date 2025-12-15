#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyFinalizedPhotos() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          VERIFY FINALIZED PHOTOS IN STORAGE                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get the 11 incident report photos from user_documents
    const userId = '5326c2aa-f1d5-4edc-a972-7fb14995ed0f';
    const reportId = '5cfdc645-8d5e-4beb-904f-89c34e61d3e4';

    const { data: docs, error: docError } = await supabase
      .from('user_documents')
      .select('id, storage_path, status, created_at')
      .eq('create_user_id', userId)
      .eq('incident_report_id', reportId)
      .order('created_at', { ascending: true });

    if (docError) {
      console.log('❌ Error:', docError.message);
      return;
    }

    console.log(`Found ${docs.length} user_documents records\n`);

    let existCount = 0;
    let missingCount = 0;

    for (const doc of docs) {
      const filename = doc.storage_path.split('/').pop();
      console.log(`📸 ${filename}`);
      console.log(`   DB record: ${doc.id}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Path: ${doc.storage_path}`);

      // Try to download the file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('user-documents')
        .download(doc.storage_path);

      if (downloadError) {
        console.log(`   🔴 MISSING from storage!`);
        console.log(`   Error: ${downloadError.message}`);
        missingCount++;
      } else {
        console.log(`   ✅ EXISTS in storage (${(fileData.size / 1024).toFixed(2)} KB)`);
        existCount++;
      }
      console.log('');
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   VERIFICATION SUMMARY                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Total user_documents records: ${docs.length}`);
    console.log(`✅ Files exist in storage: ${existCount}`);
    console.log(`🔴 Files missing from storage: ${missingCount}\n`);

    if (missingCount > 0) {
      console.log('⚠️  CRITICAL: Database records exist but files are missing!');
      console.log('   Finalization created user_documents records but files were deleted.\n');
    } else if (existCount === docs.length) {
      console.log('✅ ALL FILES VERIFIED!');
      console.log('   Finalization worked correctly for these photos.\n');
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

verifyFinalizedPhotos().catch(console.error);
