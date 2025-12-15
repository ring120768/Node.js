#!/usr/bin/env node
/**
 * Test Supabase Storage for audio-files bucket
 * Checks if bucket exists and can upload test files
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

async function testSupabaseStorage() {
  console.log(colors.cyan, '\n🧪 Testing Supabase Storage Setup\n');

  // Initialize Supabase client with service role (bypasses RLS)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Test 1: List all buckets
    console.log('1. Listing all storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.log(colors.red, `❌ Error listing buckets: ${bucketsError.message}`);
      return;
    }

    console.log(colors.green, `✅ Found ${buckets.length} buckets:`);
    buckets.forEach(bucket => {
      console.log(colors.yellow, `   - ${bucket.name} (public: ${bucket.public}, created: ${bucket.created_at})`);
    });

    // Test 2: Check if audio-files bucket exists
    console.log('\n2. Checking for audio-files bucket...');
    const audioFilesBucket = buckets.find(b => b.name === 'audio-files');

    if (!audioFilesBucket) {
      console.log(colors.red, '❌ audio-files bucket does NOT exist!');
      console.log(colors.yellow, '\n📝 To create it, run this in Supabase SQL Editor:');
      console.log(colors.cyan, `
-- Create audio-files bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', false);

-- Set up RLS policy to allow service role to upload
CREATE POLICY "Service role can upload audio files"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'audio-files');

-- Allow service role to read/update/delete
CREATE POLICY "Service role can manage audio files"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'audio-files');
      `);
      console.log(colors.reset);
      return;
    }

    console.log(colors.green, '✅ audio-files bucket exists');
    console.log(colors.yellow, `   Public: ${audioFilesBucket.public}`);
    console.log(colors.yellow, `   Created: ${audioFilesBucket.created_at}`);

    // Test 3: Try to upload a test file
    console.log('\n3. Testing file upload...');
    const testBuffer = Buffer.from('Test audio file content');
    const testFileName = `test/${Date.now()}_test.txt`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('audio-files')
      .upload(testFileName, testBuffer, {
        contentType: 'text/plain',
        upsert: false
      });

    if (uploadError) {
      console.log(colors.red, `❌ Upload failed: ${uploadError.message}`);
      console.log(colors.yellow, '   Error details:', uploadError);
      console.log(colors.yellow, '\n💡 Common causes:');
      console.log('   - RLS policies blocking service role (unlikely)');
      console.log('   - Bucket permissions not set correctly');
      console.log('   - Storage quota exceeded');
      return;
    }

    console.log(colors.green, '✅ Upload successful!');
    console.log(colors.yellow, `   Path: ${uploadData.path}`);

    // Test 4: Clean up test file
    console.log('\n4. Cleaning up test file...');
    const { error: deleteError } = await supabase
      .storage
      .from('audio-files')
      .remove([testFileName]);

    if (deleteError) {
      console.log(colors.yellow, `⚠️  Could not delete test file: ${deleteError.message}`);
    } else {
      console.log(colors.green, '✅ Test file deleted');
    }

    console.log(colors.green, '\n✅ All tests passed! Storage is configured correctly.\n');
    console.log(colors.reset);

  } catch (error) {
    console.log(colors.red, `❌ Error: ${error.message}`);
    console.log(colors.yellow, 'Stack:', error.stack);
    console.log(colors.reset);
  }
}

testSupabaseStorage().catch(console.error);
