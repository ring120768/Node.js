#!/usr/bin/env node
/**
 * Test Script: Transcription API Debug
 * Purpose: Diagnose OpenAI Whisper API File object issue
 * Usage: node test-transcription-debug.js
 */

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

async function testFileObjectCreation() {
  console.log(colors.cyan, '\n🧪 Testing File Object Creation for OpenAI Whisper\n');

  try {
    // 1. Check if File constructor exists
    console.log('1. Checking File API availability...');
    if (typeof File === 'undefined') {
      console.log(colors.red, '❌ File constructor is not available in this Node.js version');
      console.log(colors.yellow, '   Node version:', process.version);
      return;
    }
    console.log(colors.green, '✅ File constructor is available');

    // 2. Create a test audio buffer (simulating what multer provides)
    console.log('\n2. Creating test audio file...');
    const testAudioPath = path.join(__dirname, 'test-audio.mp3');

    // Create a minimal MP3 file (just for testing structure)
    const testBuffer = Buffer.from([
      0xFF, 0xFB, 0x90, 0x00  // MP3 header bytes
    ]);

    console.log(colors.green, `✅ Created test buffer (${testBuffer.length} bytes)`);

    // 3. Test File object creation (what we're doing in the controller)
    console.log('\n3. Creating File object...');
    const fileObject = new File(
      [testBuffer],
      'test-audio.mp3',
      { type: 'audio/mpeg' }
    );

    console.log(colors.green, '✅ File object created successfully');
    console.log('   File details:', {
      name: fileObject.name,
      size: fileObject.size,
      type: fileObject.type
    });

    // 4. Check what OpenAI SDK expects
    console.log('\n4. Checking OpenAI SDK requirements...');
    console.log('   OpenAI SDK version:', require('openai/package.json').version);

    // 5. Try actual API call with minimal file
    console.log('\n5. Testing OpenAI API call...');
    console.log(colors.yellow, '   Note: This will fail because the audio is too short/invalid');
    console.log(colors.yellow, '   But it will show us the exact error from OpenAI');

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fileObject,
        model: 'whisper-1',
        language: 'en',
        response_format: 'verbose_json'
      });

      console.log(colors.green, '✅ API call succeeded (unexpected!)');
      console.log('   Response:', transcription);
    } catch (apiError) {
      console.log(colors.yellow, '⚠️  OpenAI API error (expected):');
      console.log('   Status:', apiError.status);
      console.log('   Message:', apiError.message);
      console.log('   Error:', apiError.error);

      // Check if it's a File format error or audio content error
      if (apiError.message?.includes('File') || apiError.message?.includes('format')) {
        console.log(colors.red, '\n❌ This is a FILE FORMAT error - our File object is wrong');
      } else if (apiError.message?.includes('audio') || apiError.message?.includes('duration')) {
        console.log(colors.green, '\n✅ This is an AUDIO CONTENT error - our File object format is CORRECT');
        console.log(colors.green, '   The error is because the test audio is invalid, not because of File object');
      }
    }

    // 6. Alternative: Check if we should use fs.createReadStream instead
    console.log('\n6. Testing alternative: Blob instead of File...');
    const blob = new Blob([testBuffer], { type: 'audio/mpeg' });
    console.log('   Blob created:', {
      size: blob.size,
      type: blob.type
    });

  } catch (error) {
    console.log(colors.red, `\n❌ Error: ${error.message}`);
    console.log('   Stack:', error.stack);
  }

  console.log(colors.reset, '\n');
}

testFileObjectCreation().catch(console.error);
