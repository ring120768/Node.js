#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function exploreStorageStructure() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          EXPLORE SUPABASE STORAGE STRUCTURE                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // 1. List all buckets
  console.log('📦 Available Storage Buckets:\n');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.log('❌ Error listing buckets:', bucketsError.message);
    return;
  }

  buckets.forEach(bucket => {
    console.log(`   ${bucket.name} (${bucket.public ? 'PUBLIC' : 'PRIVATE'})`);
  });

  // 2. List root of user-documents bucket
  console.log('\n\n📂 Root folders in "user-documents" bucket:\n');
  const { data: rootFiles, error: rootError } = await supabase.storage
    .from('user-documents')
    .list('', { limit: 100 });

  if (rootError) {
    console.log('❌ Error:', rootError.message);
  } else if (rootFiles && rootFiles.length > 0) {
    rootFiles.forEach(item => {
      const type = item.id ? '📄' : '📁';
      const size = item.metadata?.size ? ` (${(item.metadata.size / 1024).toFixed(2)} KB)` : '';
      console.log(`   ${type} ${item.name}${size}`);
    });
  } else {
    console.log('   (empty)');
  }

  // 3. Look for session ID folder specifically
  const sessionId = 'c8c058bb-88e7-4ae6-aceb-f517164dccd6';
  console.log(`\n\n🔍 Searching for session folder "${sessionId}":\n`);

  // Check if it appears in root
  const sessionFolder = rootFiles?.find(f => f.name === sessionId);
  if (sessionFolder) {
    console.log(`   ✅ Found in root! Listing contents...\n`);

    const { data: sessionFiles, error: sessionError } = await supabase.storage
      .from('user-documents')
      .list(sessionId, { limit: 100 });

    if (sessionError) {
      console.log(`   ❌ Error: ${sessionError.message}`);
    } else if (sessionFiles && sessionFiles.length > 0) {
      console.log(`   Found ${sessionFiles.length} files:\n`);
      sessionFiles.forEach((file, idx) => {
        console.log(`   ${idx + 1}. ${file.name}`);
        console.log(`      Size: ${(file.metadata?.size / 1024 || 0).toFixed(2)} KB`);
        console.log(`      Created: ${file.created_at || 'unknown'}\n`);
      });
    }
  } else {
    console.log(`   ❌ Session folder not found in root`);
  }

  // 4. Check temp uploads bucket (if exists)
  console.log('\n\n📂 Checking "temp-uploads" bucket (if exists):\n');
  const { data: tempBucketFiles, error: tempError } = await supabase.storage
    .from('temp-uploads')
    .list('', { limit: 100 });

  if (tempError) {
    console.log(`   ℹ️  Bucket doesn't exist or error: ${tempError.message}`);
  } else if (tempBucketFiles && tempBucketFiles.length > 0) {
    console.log(`   Found ${tempBucketFiles.length} items in temp-uploads bucket`);
    tempBucketFiles.slice(0, 10).forEach(item => {
      console.log(`   - ${item.name}`);
    });
  }

  console.log('\n');
}

exploreStorageStructure().catch(console.error);
