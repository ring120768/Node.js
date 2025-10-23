#!/usr/bin/env node
/**
 * Test Transcription Authentication
 * Checks if userId is being sent correctly
 */

require('dotenv').config();
const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

async function testTranscriptionAuth() {
  console.log(colors.cyan, '\n🔐 Testing Transcription Authentication\n');
  console.log('='.repeat(80), '\n');

  // Test 1: Check environment variables
  console.log(colors.cyan, '1️⃣ Checking Environment Variables:\n');

  const checks = {
    'OPENAI_API_KEY': !!process.env.OPENAI_API_KEY,
    'SUPABASE_URL': !!process.env.SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  for (const [key, exists] of Object.entries(checks)) {
    if (exists) {
      console.log(colors.green, `✅ ${key} is set`);
    } else {
      console.log(colors.red, `❌ ${key} is NOT set`);
    }
  }

  // Test 2: Create test audio file
  console.log(colors.cyan, '\n2️⃣ Creating Test Audio File:\n');

  const testAudioPath = './test-audio-sample.wav';
  if (!fs.existsSync(testAudioPath)) {
    console.log(colors.yellow, '⚠️  Test audio file not found');
    console.log('   Creating dummy audio file for testing...');
    // Create a minimal WAV file (just headers, silent audio)
    const wavBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
      0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00,
      0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61,
      0x00, 0x00, 0x00, 0x00
    ]);
    fs.writeFileSync(testAudioPath, wavBuffer);
    console.log(colors.green, '✅ Dummy audio file created');
  } else {
    console.log(colors.green, '✅ Test audio file found');
  }

  // Test 3: Test API with different userId formats
  console.log(colors.cyan, '\n3️⃣ Testing API Endpoint:\n');

  const testUserId = 'test-user-' + Date.now();
  console.log(`Using test userId: ${testUserId}\n`);

  try {
    const audioBuffer = fs.readFileSync(testAudioPath);
    const formData = new FormData();
    formData.append('audio', audioBuffer, {
      filename: 'test-audio.wav',
      contentType: 'audio/wav'
    });
    formData.append('userId', testUserId);

    console.log('📤 Sending request to /api/transcription/transcribe...');
    console.log('   userId in form:', testUserId);
    console.log('   File size:', audioBuffer.length, 'bytes');

    const apiUrl = process.env.APP_URL || 'http://localhost:5000';
    const response = await fetch(`${apiUrl}/api/transcription/transcribe`, {
      method: 'POST',
      headers: formData.getHeaders(),
      body: formData
    });

    console.log(colors.cyan, '\n📥 Response:\n');
    console.log('   Status:', response.status, response.statusText);
    console.log('   OK:', response.ok);

    const responseText = await response.text();

    if (response.ok) {
      console.log(colors.green, '\n✅ SUCCESS! Authentication working!\n');
      try {
        const result = JSON.parse(responseText);
        console.log('Response data:', JSON.stringify(result, null, 2));
      } catch (e) {
        console.log('Response:', responseText);
      }
    } else {
      console.log(colors.red, '\n❌ FAILED!\n');
      try {
        const error = JSON.parse(responseText);
        console.log(colors.red, 'Error:', error.error || error.message);
        if (error.error === 'User not authenticated') {
          console.log(colors.yellow, '\n💡 The server is NOT accepting userId from request body yet.');
          console.log('   This means the server code hasn\'t been updated.');
          console.log('   Run: git pull origin feat/audit-prep');
        }
      } catch (e) {
        console.log('Response text:', responseText);
      }
    }

  } catch (error) {
    console.log(colors.red, '\n❌ Request failed:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log(colors.cyan, '\n📋 Summary:\n');

  if (!process.env.OPENAI_API_KEY) {
    console.log(colors.red, '❌ Missing OPENAI_API_KEY - Set this in .env or Replit Secrets');
  }

  console.log(colors.cyan, '\n💡 Next Steps:');
  console.log('   1. If server code is old: git pull origin feat/audit-prep');
  console.log('   2. Restart server after pulling');
  console.log('   3. Make sure OPENAI_API_KEY is set');
  console.log('   4. Test in browser with expanded console objects\n');

  console.log(colors.reset);
}

testTranscriptionAuth().catch(console.error);
