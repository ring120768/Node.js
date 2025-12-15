#!/usr/bin/env node
/**
 * Test upload to audio-transcriptions bucket
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function testAudioTranscriptionsBucket() {
  console.log(colors.cyan, '\n🧪 Testing audio-transcriptions Bucket\n');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Test upload
    const testUserId = 'dc4a056e-fd91-4337-b931-2093d925f1b4';
    const testBuffer = Buffer.from('Test audio file');
    const fileName = `${testUserId}/${Date.now()}_test.webm`;

    console.log('Testing upload to audio-transcriptions bucket...');
    const { data, error } = await supabase
      .storage
      .from('audio-transcriptions')
      .upload(fileName, testBuffer, {
        contentType: 'audio/webm',
        upsert: false
      });

    if (error) {
      console.log(colors.red, `❌ Upload failed: ${error.message}`);
      console.log(colors.reset);
      return;
    }

    console.log(colors.green, '✅ Upload successful!');
    console.log(colors.cyan, `   Path: ${data.path}`);

    // Clean up
    console.log('\nCleaning up test file...');
    const { error: deleteError } = await supabase
      .storage
      .from('audio-transcriptions')
      .remove([fileName]);

    if (deleteError) {
      console.log(colors.red, `⚠️  Could not delete: ${deleteError.message}`);
    } else {
      console.log(colors.green, '✅ Test file deleted');
    }

    console.log(colors.green, '\n✅ audio-transcriptions bucket is working!\n');
    console.log(colors.reset);

  } catch (error) {
    console.log(colors.red, `❌ Error: ${error.message}`);
    console.log(colors.reset);
  }
}

testAudioTranscriptionsBucket().catch(console.error);
