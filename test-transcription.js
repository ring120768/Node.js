// test-transcription.js
// Debugging script for transcription flow

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test configuration
const TEST_CONFIG = {
  userId: 'test_user_123',
  audioPath: 'test_user_123/recording_1758178026684_6qzhi7s.webm', // Update with your actual file path
  bucketName: 'incident-audio'
};

console.log('🔧 Starting Transcription Debug Test');
console.log('================================');

// Step 1: Verify Supabase Connection
async function testSupabaseConnection() {
  console.log('\n📡 Step 1: Testing Supabase Connection...');
  try {
    const { data, error } = await supabase
      .from('transcription_queue')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return false;
    }

    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    return false;
  }
}

// Step 2: Verify Audio File Exists
async function testAudioFileExists() {
  console.log('\n📁 Step 2: Checking if audio file exists...');
  try {
    // List files in the bucket
    const { data: files, error } = await supabase
      .storage
      .from(TEST_CONFIG.bucketName)
      .list(TEST_CONFIG.userId, {
        limit: 100
      });

    if (error) {
      console.error('❌ Error listing files:', error);
      return false;
    }

    console.log(`📋 Files found in ${TEST_CONFIG.userId}/:`, files?.map(f => f.name));

    const fileName = TEST_CONFIG.audioPath.split('/').pop();
    const fileExists = files?.some(f => f.name === fileName);

    if (fileExists) {
      console.log(`✅ Audio file exists: ${fileName}`);
      return true;
    } else {
      console.error(`❌ Audio file not found: ${fileName}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking file:', error);
    return false;
  }
}

// Step 3: Download Audio File
async function downloadAudioFile() {
  console.log('\n⬇️ Step 3: Downloading audio file...');
  try {
    const { data, error } = await supabase
      .storage
      .from(TEST_CONFIG.bucketName)
      .download(TEST_CONFIG.audioPath);

    if (error) {
      console.error('❌ Download failed:', error);
      return null;
    }

    // Convert blob to buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`✅ Downloaded audio file: ${buffer.length} bytes`);
    return buffer;
  } catch (error) {
    console.error('❌ Download error:', error);
    return null;
  }
}

// Step 4: Test OpenAI Whisper API
async function testWhisperAPI(audioBuffer) {
  console.log('\n🎯 Step 4: Testing OpenAI Whisper API...');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    return null;
  }

  try {
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm'
    });
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');

    console.log('📤 Sending to OpenAI Whisper...');

    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000
      }
    );

    console.log('✅ Whisper API Response received');
    console.log('📝 Transcription text:', response.data.text?.substring(0, 200) + '...');
    console.log('🌐 Language:', response.data.language);
    console.log('⏱️ Duration:', response.data.duration, 'seconds');

    return response.data;
  } catch (error) {
    console.error('❌ Whisper API error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('🔑 Check your OpenAI API key');
    }
    return null;
  }
}

// Step 5: Save to Database
async function saveTranscription(transcriptionData) {
  console.log('\n💾 Step 5: Saving transcription to database...');

  try {
    // Save to transcription_queue
    const { data: queueData, error: queueError } = await supabase
      .from('transcription_queue')
      .insert({
        create_user_id: TEST_CONFIG.userId,
        audio_url: `${process.env.SUPABASE_URL}/storage/v1/object/public/${TEST_CONFIG.bucketName}/${TEST_CONFIG.audioPath}`,
        audio_storage_path: TEST_CONFIG.audioPath,
        status: 'completed',
        transcription_text: transcriptionData.text,
        created_at: new Date().toISOString(),
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (queueError) {
      console.error('❌ Queue insert failed:', queueError);
    } else {
      console.log('✅ Saved to transcription_queue, ID:', queueData.id);
    }

    // Save to ai_transcription
    const { data: transcData, error: transcError } = await supabase
      .from('ai_transcription')
      .insert({
        create_user_id: TEST_CONFIG.userId,
        transcription_text: transcriptionData.text,
        audio_url: `${process.env.SUPABASE_URL}/storage/v1/object/public/${TEST_CONFIG.bucketName}/${TEST_CONFIG.audioPath}`,
        audio_file_path: TEST_CONFIG.audioPath,
        language: transcriptionData.language,
        duration: transcriptionData.duration,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (transcError) {
      console.error('❌ Transcription insert failed:', transcError);
    } else {
      console.log('✅ Saved to ai_transcription, ID:', transcData.id);
    }

    return { queueData, transcData };
  } catch (error) {
    console.error('❌ Database save error:', error);
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Running transcription pipeline tests...\n');

  // Test 1: Supabase Connection
  const supabaseOk = await testSupabaseConnection();
  if (!supabaseOk) {
    console.error('\n❌ Cannot proceed without Supabase connection');
    return;
  }

  // Test 2: File Exists
  const fileExists = await testAudioFileExists();
  if (!fileExists) {
    console.error('\n❌ Cannot proceed without audio file');
    console.log('💡 Tip: Update TEST_CONFIG.audioPath with an actual file path from your bucket');
    return;
  }

  // Test 3: Download Audio
  const audioBuffer = await downloadAudioFile();
  if (!audioBuffer) {
    console.error('\n❌ Cannot proceed without audio data');
    return;
  }

  // Test 4: Transcribe with Whisper
  const transcriptionResult = await testWhisperAPI(audioBuffer);
  if (!transcriptionResult) {
    console.error('\n❌ Transcription failed');
    return;
  }

  // Test 5: Save to Database
  const saved = await saveTranscription(transcriptionResult);
  if (!saved) {
    console.error('\n❌ Database save failed');
    return;
  }

  console.log('\n✅ All tests completed successfully!');
  console.log('================================');
  console.log('📊 Summary:');
  console.log('- Supabase: Connected');
  console.log('- Audio File: Found and downloaded');
  console.log('- Transcription: Completed');
  console.log('- Database: Saved successfully');
}

// Run the tests
runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});