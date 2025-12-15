#!/usr/bin/env node

/**
 * Check Storage Contents
 *
 * Lists all files in temp/ folder to see what actually exists
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStorageContents() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          CHECK STORAGE CONTENTS                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // List all files in temp/ folder
    console.log('📂 Listing all files in temp/ folder...\n');

    const { data: tempFolders, error: listError } = await supabase.storage
      .from('user-documents')
      .list('temp', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError) {
      console.log('❌ Error listing temp folder:', listError.message);
      return;
    }

    if (!tempFolders || tempFolders.length === 0) {
      console.log('⚠️  No folders found in temp/\n');
      return;
    }

    console.log(`✅ Found ${tempFolders.length} session folders in temp/\n`);

    // List files in each session folder
    for (const folder of tempFolders) {
      if (folder.name === '.emptyFolderPlaceholder') continue;

      console.log(`📁 Session: ${folder.name}`);

      const { data: files, error: filesError } = await supabase.storage
        .from('user-documents')
        .list(`temp/${folder.name}`, {
          limit: 100
        });

      if (filesError) {
        console.log(`   ❌ Error: ${filesError.message}\n`);
        continue;
      }

      if (!files || files.length === 0) {
        console.log(`   ⚠️  Empty folder\n`);
        continue;
      }

      console.log(`   Files: ${files.length}`);
      files.forEach(file => {
        const size = (file.metadata.size / 1024).toFixed(2);
        console.log(`   - ${file.name} (${size} KB, created: ${file.created_at})`);
      });
      console.log('');
    }

    // Now check the specific sessions from temp_uploads table
    console.log('\n📊 Cross-checking with temp_uploads table...\n');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: uploads, error: uploadError } = await supabase
      .from('temp_uploads')
      .select('session_id, field_name, storage_path, created_at')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });

    if (uploadError) {
      console.log('❌ Error querying temp_uploads:', uploadError.message);
      return;
    }

    const uniqueSessions = [...new Set(uploads.map(u => u.session_id))];
    console.log(`Database shows ${uploads.length} uploads in ${uniqueSessions.length} sessions:\n`);

    for (const sessionId of uniqueSessions) {
      const sessionUploads = uploads.filter(u => u.session_id === sessionId);
      console.log(`📋 Session: ${sessionId}`);
      console.log(`   Database records: ${sessionUploads.length}`);

      // Check if this session exists in storage
      const sessionExists = tempFolders.some(f => f.name === sessionId);
      console.log(`   Storage folder: ${sessionExists ? '✅ Exists' : '❌ Missing'}`);

      if (sessionExists) {
        const { data: files } = await supabase.storage
          .from('user-documents')
          .list(`temp/${sessionId}`);

        console.log(`   Storage files: ${files ? files.length : 0}`);

        if (files && files.length > 0) {
          files.forEach(file => {
            const size = (file.metadata.size / 1024).toFixed(2);
            console.log(`      ✅ ${file.name} (${size} KB)`);
          });
        }
      }

      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

checkStorageContents().catch(console.error);
