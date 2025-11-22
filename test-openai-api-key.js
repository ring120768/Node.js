/**
 * OpenAI API Key Diagnostic Tool
 * Verifies which API key is configured and tests its validity
 */

require('dotenv').config(); // Load from .env
const OpenAI = require('openai');

async function diagnoseApiKey() {
  console.log('\n🔍 OpenAI API Key Diagnostics\n');
  console.log('='.repeat(60));

  // Check if API key exists
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.log('❌ ERROR: No OPENAI_API_KEY found in environment');
    console.log('\nPlease check:');
    console.log('1. Replit Secrets (Tools → Secrets)');
    console.log('2. .env file (if running locally)');
    return;
  }

  // Show partial API key (for security)
  const keyStart = apiKey.substring(0, 7);
  const keyEnd = apiKey.substring(apiKey.length - 4);
  console.log(`✅ API Key Found: ${keyStart}...${keyEnd}`);
  console.log(`   Length: ${apiKey.length} characters`);

  // Initialize OpenAI client
  const openai = new OpenAI({ apiKey });

  console.log('\n📡 Testing API Connection...\n');

  try {
    // Test 1: List models (basic API call)
    console.log('Test 1: Fetching available models...');
    const models = await openai.models.list();
    console.log('✅ API Key is VALID');
    console.log(`   Found ${models.data.length} models`);

    // Test 2: Check if whisper-1 is available
    const whisperModel = models.data.find(m => m.id === 'whisper-1');
    if (whisperModel) {
      console.log('✅ Whisper model (whisper-1) is available');
    } else {
      console.log('⚠️  Whisper model not found in available models');
    }

    // Test 3: Check account details via a minimal completion request
    console.log('\nTest 2: Checking account quota...');
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      });
      console.log('✅ Account has active quota');
      console.log(`   Model used: ${completion.model}`);
    } catch (quotaError) {
      console.log('\n❌ QUOTA ERROR DETECTED:');
      console.log('   Status:', quotaError.status);
      console.log('   Code:', quotaError.code);
      console.log('   Message:', quotaError.message);

      if (quotaError.code === 'insufficient_quota') {
        console.log('\n🚨 THIS API KEY HAS NO CREDITS/QUOTA');
        console.log('\nThis explains the error! The API key in your environment');
        console.log('belongs to a DIFFERENT OpenAI account than the one in your screenshot.');
        console.log('\nSOLUTION:');
        console.log('1. Go to https://platform.openai.com/api-keys');
        console.log('2. Make sure you\'re logged into the account with credits ($99.99)');
        console.log('3. Create a new API key OR find your existing key');
        console.log('4. Update OPENAI_API_KEY in Replit Secrets (Tools → Secrets)');
        console.log('5. Restart the application');
      }
    }

    console.log('\n='.repeat(60));
    console.log('✅ Diagnostics Complete');

  } catch (error) {
    console.log('\n❌ API ERROR:');
    console.log('   Status:', error.status);
    console.log('   Code:', error.code);
    console.log('   Type:', error.type);
    console.log('   Message:', error.message);

    if (error.status === 401) {
      console.log('\n🚨 API KEY IS INVALID');
      console.log('\nThe API key is malformed or has been revoked.');
      console.log('You need to create a new API key at:');
      console.log('https://platform.openai.com/api-keys');
    }

    console.log('\n='.repeat(60));
  }
}

// Run diagnostics
diagnoseApiKey().catch(console.error);
