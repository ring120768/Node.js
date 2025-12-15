#!/usr/bin/env node

/**
 * Check user_documents Records for Missing Photos
 * 
 * See if database records were created even though files are missing
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserDocumentsRecords() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          CHECK user_documents FOR MISSING PHOTOS              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // First, get the claimed temp_uploads from our test session
    const testSessionId = 'c8c058bb-88e7-4ee6-aceb-f517164dccd6';
    
    console.log(`📋 Checking temp_uploads for session: ${testSessionId}\n`);

    const { data: tempUploads, error: tempError } = await supabase
      .from('temp_uploads')
      .select('*')
      .eq('session_id', testSessionId)
      .eq('claimed', true)
      .order('uploaded_at', { ascending: true });

    if (tempError) {
      console.log('❌ Error querying temp_uploads:', tempError.message);
      return;
    }

    console.log(`Found ${tempUploads ? tempUploads.length : 0} claimed uploads\n`);

    if (!tempUploads || tempUploads.length === 0) {
      console.log('⚠️  No claimed uploads found for this session\n');
      return;
    }

    // Now check if user_documents records exist for each
    let recordsFound = 0;
    let recordsMissing = 0;
    let filesExist = 0;
    let filesMissing = 0;

    for (const upload of tempUploads) {
      console.log(`\n📸 ${upload.field_name}`);
      console.log(`   Upload ID: ${upload.id}`);
      console.log(`   Original path: ${upload.storage_path}`);
      console.log(`   Uploaded: ${upload.uploaded_at}`);

      // Search for user_documents records related to this upload
      // We need to search by temp_upload_id or by examining recent records
      const { data: docRecords, error: docError } = await supabase
        .from('user_documents')
        .select('*')
        .or(`temp_upload_id.eq.${upload.id},original_filename.eq.${upload.file_name}`)
        .order('created_at', { ascending: false });

      if (docError) {
        console.log(`   ❌ Error checking user_documents:`, docError.message);
        continue;
      }

      if (docRecords && docRecords.length > 0) {
        console.log(`   ✅ Found ${docRecords.length} user_documents record(s)`);
        recordsFound++;

        for (const doc of docRecords) {
          console.log(`      ID: ${doc.id}`);
          console.log(`      Storage path: ${doc.storage_path}`);
          console.log(`      Status: ${doc.status}`);
          console.log(`      Created: ${doc.created_at}`);

          // Check if the file actually exists in storage
          const { data: fileCheck, error: fileError } = await supabase.storage
            .from('user-documents')
            .list('', { search: doc.storage_path });

          if (fileError) {
            console.log(`      ❌ Error checking storage:`, fileError.message);
          } else if (fileCheck && fileCheck.length > 0) {
            console.log(`      ✅ FILE EXISTS in storage`);
            filesExist++;
          } else {
            console.log(`      🔴 FILE MISSING from storage!`);
            filesMissing++;
          }
        }
      } else {
        console.log(`   🔴 NO user_documents record found`);
        recordsMissing++;
      }
    }

    // Summary
    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   SUMMARY                                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Claimed temp_uploads: ${tempUploads.length}`);
    console.log(`✅ user_documents records found: ${recordsFound}`);
    console.log(`🔴 user_documents records missing: ${recordsMissing}\n`);

    if (recordsFound > 0) {
      console.log(`📁 Storage Status:`);
      console.log(`   ✅ Files exist: ${filesExist}`);
      console.log(`   🔴 Files missing: ${filesMissing}\n`);

      if (filesMissing > 0) {
        console.log('⚠️  CRITICAL: Database records exist but storage files are missing!');
        console.log('   This indicates finalization created records but files were deleted.\n');
      }
    }

    if (recordsMissing > 0) {
      console.log('⚠️  Some uploads were claimed but no user_documents records exist.');
      console.log('   This indicates finalization started but never completed.\n');
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

checkUserDocumentsRecords().catch(console.error);
