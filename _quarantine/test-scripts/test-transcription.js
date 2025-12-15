#!/usr/bin/env node
/**
 * Test Audio Transcription Flow
 * Tests OpenAI Whisper transcription end-to-end
 * Usage: node test-transcription.js [audio-file-path]
 */

require('dotenv').config();
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

// Default test audio URL (or use your own)
const DEFAULT_AUDIO_URL = 'https://github.com/mozilla/DeepSpeech/raw/master/audio/2830-3980-0043.wav';

async function downloadTestAudio() {
  console.log(colors.cyan, '\n📥 Downloading test audio file...\n');

  try {
    const response = await fetch(DEFAULT_AUDIO_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const buffer = await response.buffer();
    const testAudioPath = './test-audio-sample.wav';
    fs.writeFileSync(testAudioPath, buffer);

    console.log(colors.green, `✅ Downloaded test audio (${Math.round(buffer.length / 1024)} KB)`);
    console.log(`   Saved to: ${testAudioPath}\n`);

    return testAudioPath;
  } catch (error) {
    console.log(colors.red, `❌ Failed to download test audio: ${error.message}`);
    return null;
  }
}

async function testTranscriptionAPI(audioFilePath) {
  console.log(colors.cyan, '🧪 Testing Transcription API\n');
  console.log(`Audio file: ${audioFilePath}\n`);

  try {
    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    const audioBuffer = fs.readFileSync(audioFilePath);
    const fileSizeMB = (audioBuffer.length / (1024 * 1024)).toFixed(2);

    console.log(`📊 File size: ${fileSizeMB} MB`);
    console.log(`📊 File type: ${audioFilePath.split('.').pop()}\n`);

    // Create form data
    const formData = new FormData();
    formData.append('audio', audioBuffer, {
      filename: audioFilePath.split('/').pop(),
      contentType: 'audio/wav'
    });

    // Call transcription API
    console.log('1️⃣ Uploading to transcription API...');

    const apiUrl = process.env.APP_URL || 'http://localhost:5000';
    const response = await fetch(`${apiUrl}/api/transcription/transcribe`, {
      method: 'POST',
      headers: {
        // Note: In production, you'd need auth token here
        // For testing, we're assuming auth is disabled or using test token
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    console.log(colors.green, '\n✅ TRANSCRIPTION SUCCESSFUL!\n');
    console.log(colors.cyan, '📝 Transcription Result:');
    console.log('─'.repeat(80));
    console.log(colors.reset, result.transcription.text);
    console.log('─'.repeat(80));
    console.log(colors.cyan, '\n📊 Details:');
    console.log(`   Duration: ${result.transcription.duration} seconds`);
    console.log(`   Language: ${result.transcription.language}`);
    console.log(`   Text length: ${result.transcription.text.length} characters`);
    console.log(`   Segments: ${result.transcription.segments?.length || 0}`);

    console.log(colors.cyan, '\n💾 Storage:');
    console.log(`   Audio path: ${result.storage.audioPath}`);
    console.log(`   Transcription path: ${result.storage.transcriptionPath}`);

    return result;

  } catch (error) {
    console.log(colors.red, `\n❌ Transcription failed: ${error.message}`);
    console.error(error.stack);
    return null;
  }
}

async function testOpenAIDirect(audioFilePath) {
  console.log(colors.cyan, '\n🎯 Testing OpenAI Whisper API Directly\n');

  try {
    const audioBuffer = fs.readFileSync(audioFilePath);

    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'test-audio.wav',
      contentType: 'audio/wav'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'verbose_json');

    console.log('📤 Sending to OpenAI Whisper API...');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    console.log(colors.green, '\n✅ OPENAI WHISPER SUCCESSFUL!\n');
    console.log(colors.cyan, '📝 Transcription:');
    console.log('─'.repeat(80));
    console.log(colors.reset, result.text);
    console.log('─'.repeat(80));
    console.log(colors.cyan, '\n📊 Details:');
    console.log(`   Duration: ${result.duration} seconds`);
    console.log(`   Language: ${result.language}`);

    return result;

  } catch (error) {
    console.log(colors.red, `\n❌ OpenAI API failed: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log(colors.cyan, '\n🎙️  AUDIO TRANSCRIPTION TEST\n');
  console.log('='.repeat(80), '\n');

  // Check environment
  if (!process.env.OPENAI_API_KEY) {
    console.log(colors.red, '❌ OPENAI_API_KEY not found in environment');
    console.log('   Add it to your .env file\n');
    process.exit(1);
  }

  // Get audio file path
  let audioFilePath = process.argv[2];

  if (!audioFilePath) {
    console.log(colors.yellow, '⚠️  No audio file specified');
    console.log('   Downloading test audio sample...\n');
    audioFilePath = await downloadTestAudio();

    if (!audioFilePath) {
      console.log(colors.red, '\n❌ Cannot proceed without audio file');
      console.log(colors.yellow, '\nUsage: node test-transcription.js [path-to-audio-file]\n');
      process.exit(1);
    }
  }

  console.log('='.repeat(80), '\n');
  console.log(colors.cyan, '🧪 Test Options:\n');
  console.log('1. Test via API endpoint (full flow)');
  console.log('2. Test OpenAI Whisper directly (API only)\n');

  // Test OpenAI directly first (simpler, faster)
  console.log(colors.cyan, '\n📋 Starting Test 1: OpenAI Whisper Direct\n');
  const directResult = await testOpenAIDirect(audioFilePath);

  if (!directResult) {
    console.log(colors.red, '\n❌ OpenAI Whisper test failed');
    console.log('   Check your OPENAI_API_KEY and internet connection\n');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
  console.log(colors.cyan, '\n📋 Starting Test 2: Full API Endpoint\n');
  console.log(colors.yellow, '⚠️  Note: This requires the server to be running and auth configured');
  console.log('   Skipping for now. Run manually if needed.\n');

  // Uncomment this to test full API:
  // const apiResult = await testTranscriptionAPI(audioFilePath);

  console.log('\n' + '='.repeat(80));
  console.log(colors.green, '\n✅ TRANSCRIPTION TESTING COMPLETE!\n');
  console.log(colors.cyan, '📊 Summary:');
  console.log(`   ✓ OpenAI Whisper API: ${directResult ? 'WORKING' : 'FAILED'}`);
  console.log(`   ✓ Transcribed: ${directResult ? directResult.text.length : 0} characters`);
  console.log(`   ✓ Duration: ${directResult ? directResult.duration : 0} seconds\n`);

  console.log(colors.cyan, '💡 Next Steps:');
  console.log('   1. OpenAI Whisper is working correctly ✓');
  console.log('   2. Test with your own audio file:');
  console.log('      node test-transcription.js /path/to/your/audio.wav');
  console.log('   3. Once verified, proceed with full incident report test\n');

  console.log(colors.reset);
}

main().catch(console.error);
