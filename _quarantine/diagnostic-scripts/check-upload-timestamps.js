#!/usr/bin/env node

/**
 * Check Upload Timestamps
 *
 * Compare database record timestamps with storage file timestamps
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUploadTimestamps() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          UPLOAD TIMESTAMP ANALYSIS                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: uploads, error: uploadError } = await supabase
      .from('temp_uploads')
      .select('*')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });

    if (uploadError) {
      console.log('❌ Error:', uploadError.message);
      return;
    }

    console.log(`Found ${uploads.length} database records\n`);

    // Group by session
    const sessionGroups = {};
    uploads.forEach(upload => {
      if (!sessionGroups[upload.session_id]) {
        sessionGroups[upload.session_id] = [];
      }
      sessionGroups[upload.session_id].push(upload);
    });

    for (const [sessionId, sessionUploads] of Object.entries(sessionGroups)) {
      console.log(`\n📋 Session: ${sessionId}`);
      console.log(`Records: ${sessionUploads.length}\n`);

      // Get files from storage
      const { data: files } = await supabase.storage
        .from('user-documents')
        .list(`temp/${sessionId}`);

      const storageFiles = files || [];
      console.log(`Storage files: ${storageFiles.length}\n`);

      // Compare each database record with storage
      for (const upload of sessionUploads) {
        const uploadTime = new Date(upload.created_at);
        const fileName = upload.storage_path.split('/').pop();
        const fileInStorage = storageFiles.find(f => f.name === fileName);

        console.log(`${upload.field_name}:`);
        console.log(`  DB Created: ${uploadTime.toISOString()}`);
        console.log(`  DB Path: ${upload.storage_path}`);
        console.log(`  DB Size: ${(upload.file_size / 1024).toFixed(2)} KB`);
        console.log(`  DB Claimed: ${upload.claimed ? 'Yes' : 'No'}`);

        if (fileInStorage) {
          const storageTime = new Date(fileInStorage.created_at);
          console.log(`  ✅ STORAGE: Found (created ${storageTime.toISOString()})`);
          console.log(`  Storage Size: ${(fileInStorage.metadata.size / 1024).toFixed(2)} KB`);

          // Check if timestamps match
          const timeDiff = Math.abs(uploadTime - storageTime) / 1000; // seconds
          if (timeDiff > 60) {
            console.log(`  ⚠️  TIME MISMATCH: ${timeDiff.toFixed(0)}s difference`);
          }
        } else {
          console.log(`  ❌ STORAGE: Missing`);

          // Calculate age
          const age = (Date.now() - uploadTime.getTime()) / 1000 / 60; // minutes
          console.log(`  Age: ${age.toFixed(1)} minutes`);
        }
        console.log('');
      }
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                   TIMELINE ANALYSIS                            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const allUploads = Object.values(sessionGroups).flat();
    allUploads.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    console.log('Upload Timeline (oldest to newest):\n');

    for (const upload of allUploads) {
      const time = new Date(upload.created_at);
      const age = (Date.now() - time.getTime()) / 1000 / 60 / 60; // hours

      // Check if file exists
      const { data: files } = await supabase.storage
        .from('user-documents')
        .list(`temp/${upload.session_id}`);

      const fileName = upload.storage_path.split('/').pop();
      const exists = files && files.some(f => f.name === fileName);

      console.log(`${time.toISOString()} (${age.toFixed(1)}h ago)`);
      console.log(`  ${upload.field_name} - ${exists ? '✅' : '❌'}`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

checkUploadTimestamps().catch(console.error);
