#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listTempFolder() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          LIST TEMP FOLDER CONTENTS                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const sessionId = 'c8c058bb-88e7-4ae6-aceb-f517164dccd6';

  // 1. List temp folder
  console.log('📂 Listing temp/ folder:\n');
  const { data: tempFolders, error: tempError } = await supabase.storage
    .from('user-documents')
    .list('temp', { limit: 100 });

  if (tempError) {
    console.log('❌ Error:', tempError.message);
    return;
  }

  if (tempFolders && tempFolders.length > 0) {
    console.log(`Found ${tempFolders.length} items in temp/:\n`);
    tempFolders.forEach((item, idx) => {
      const type = item.id ? '📄' : '📁';
      console.log(`   ${idx + 1}. ${type} ${item.name}`);
    });

    // 2. Check if our session folder exists
    const ourSession = tempFolders.find(f => f.name === sessionId);
    if (ourSession) {
      console.log(`\n\n✅ Found session folder! Listing contents of temp/${sessionId}/:\n`);

      const { data: sessionFiles, error: sessionError } = await supabase.storage
        .from('user-documents')
        .list(`temp/${sessionId}`, { limit: 100 });

      if (sessionError) {
        console.log('❌ Error:', sessionError.message);
      } else if (sessionFiles && sessionFiles.length > 0) {
        console.log(`📸 Found ${sessionFiles.length} files:\n`);

        sessionFiles.forEach((file, idx) => {
          const isScene = file.name.includes('scene');
          const icon = isScene ? '🎯' : '📄';
          console.log(`   ${idx + 1}. ${icon} ${file.name}`);
          console.log(`      Size: ${(file.metadata?.size / 1024 || 0).toFixed(2)} KB`);
          console.log(`      Created: ${file.created_at || 'unknown'}`);
          console.log(`      Full path: temp/${sessionId}/${file.name}\n`);
        });

        // Check database for scene photos
        const scenePhotos = sessionFiles.filter(f => f.name.includes('scene'));
        if (scenePhotos.length > 0) {
          console.log(`\n\n📊 Checking database for ${scenePhotos.length} scene photos:\n`);

          const userId = '5326c2aa-f1d5-4edc-a972-7fb14995ed0f';

          for (const file of scenePhotos) {
            // Check temp_uploads
            const { data: tempRecord } = await supabase
              .from('temp_uploads')
              .select('*')
              .eq('session_id', sessionId)
              .eq('file_name', file.name)
              .maybeSingle();

            // Check user_documents
            const { data: userDocRecord } = await supabase
              .from('user_documents')
              .select('*')
              .eq('create_user_id', userId)
              .ilike('original_filename', `%${file.name}%`)
              .maybeSingle();

            console.log(`   ${file.name}:`);
            console.log(`      temp_uploads: ${tempRecord ? '✅ Found (id: ' + tempRecord.id + ')' : '❌ Missing'}`);
            console.log(`      user_documents: ${userDocRecord ? '✅ Found (id: ' + userDocRecord.id + ')' : '❌ Missing'}`);

            if (!tempRecord && !userDocRecord) {
              console.log(`      ⚠️  ORPHANED FILE - No database records!\n`);
            } else {
              console.log('');
            }
          }
        }
      } else {
        console.log('   📂 Folder is empty');
      }
    } else {
      console.log(`\n\n❌ Session folder ${sessionId} not found in temp/`);
    }
  } else {
    console.log('   📂 Temp folder is empty');
  }

  console.log('\n');
}

listTempFolder().catch(console.error);
