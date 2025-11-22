#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTempStorage() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          TEMP STORAGE FILES CHECK                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get the 5 claimed temp uploads
    const { data: claimedUploads, error } = await supabase
      .from('temp_uploads')
      .select('*')
      .eq('claimed', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }

    console.log(`📋 FOUND ${claimedUploads.length} CLAIMED TEMP UPLOADS:\n`);

    for (const upload of claimedUploads) {
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`Field: ${upload.field_name}`);
      console.log(`Created: ${new Date(upload.uploaded_at || upload.created_at).toLocaleString()}`);
      console.log(`Temp Path: ${upload.storage_path}`);
      console.log(`File Size: ${Math.round(upload.file_size / 1024)} KB`);

      // Check if temp file still exists
      const { data: tempFile, error: tempError } = await supabase.storage
        .from('user-documents')
        .download(upload.storage_path);

      if (tempError) {
        console.log(`Temp File: ❌ MISSING (${tempError.message})`);
      } else {
        console.log(`Temp File: ✅ EXISTS (${Math.round(tempFile.size / 1024)} KB)`);
      }

      // Check if permanent file exists
      const permanentPath = upload.storage_path.replace(/^temp\/[^\/]+\//, 'users/ee7cfcaf-5810-4c62-b99b-ab0f2291733e/signup/');
      console.log(`Permanent Path: ${permanentPath}`);

      const { data: permFile, error: permError } = await supabase.storage
        .from('user-documents')
        .download(permanentPath);

      if (permError) {
        console.log(`Permanent File: ❌ MISSING (${permError.message})`);
      } else {
        console.log(`Permanent File: ✅ EXISTS (${Math.round(permFile.size / 1024)} KB)`);
      }
    }

    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                         DIAGNOSIS                              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('🔍 POSSIBLE SCENARIOS:\n');
    console.log('1. If BOTH temp AND permanent missing:');
    console.log('   → clear-test-data.js was run (manual cleanup)\n');
    console.log('2. If temp EXISTS but permanent MISSING:');
    console.log('   → Storage.move() failed or was never called\n');
    console.log('3. If temp MISSING and permanent MISSING:');
    console.log('   → Move was called but permanent files deleted later\n');
    console.log('4. If temp MISSING and permanent EXISTS:');
    console.log('   → Normal successful flow (files moved correctly)\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

checkTempStorage().catch(console.error);
