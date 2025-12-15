#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function locateOrphanedScenePhotos() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          LOCATE ORPHANED SCENE PHOTOS IN STORAGE              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const sessionId = 'c8c058bb-88e7-4ae6-aceb-f517164dccd6';
  const userId = '5326c2aa-f1d5-4edc-a972-7fb14995ed0f';

  // Try different path combinations to locate the files
  const pathsToTry = [
    sessionId,
    `temp/${sessionId}`,
    `${sessionId}/`,
    `temp/${sessionId}/`,
    `users/${userId}/temp/${sessionId}`
  ];

  console.log('🔍 Searching for scene photos in storage...\n');

  for (const path of pathsToTry) {
    console.log(`Trying path: "${path}"`);

    const { data: files, error } = await supabase.storage
      .from('user-documents')
      .list(path);

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else if (files && files.length > 0) {
      console.log(`   ✅ Found ${files.length} files!`);

      const scenePhotos = files.filter(f => f.name.includes('scene'));

      if (scenePhotos.length > 0) {
        console.log(`\n📸 Scene Photos Found (${scenePhotos.length}):\n`);

        scenePhotos.forEach((file, idx) => {
          console.log(`   ${idx + 1}. ${file.name}`);
          console.log(`      Size: ${(file.metadata?.size || 0 / 1024).toFixed(2)} KB`);
          console.log(`      Created: ${file.created_at}`);
          console.log(`      Full path: ${path}/${file.name}\n`);
        });

        // Check database for these files
        console.log('\n📊 Checking database records:\n');

        for (const file of scenePhotos) {
          // Check temp_uploads
          const { data: tempRecord } = await supabase
            .from('temp_uploads')
            .select('*')
            .eq('session_id', sessionId)
            .eq('file_name', file.name)
            .single();

          // Check user_documents
          const { data: userDocRecord } = await supabase
            .from('user_documents')
            .select('*')
            .eq('create_user_id', userId)
            .ilike('original_filename', `%${file.name}%`)
            .single();

          console.log(`   ${file.name}:`);
          console.log(`      temp_uploads: ${tempRecord ? '✅ Found' : '❌ Missing'}`);
          console.log(`      user_documents: ${userDocRecord ? '✅ Found' : '❌ Missing'}`);

          if (!tempRecord && !userDocRecord) {
            console.log(`      ⚠️  ORPHANED - No database records!\n`);
          }
        }

        return { path, files: scenePhotos };
      } else {
        console.log(`   ⚠️  No scene photos in this path`);
      }
    } else {
      console.log(`   ⚠️  Path empty or not found`);
    }
    console.log('');
  }

  console.log('\n❌ Scene photos not found in any common storage paths');
  return null;
}

locateOrphanedScenePhotos().catch(console.error);
