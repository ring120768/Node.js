// fix-transcription.js
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs').promises;
require('dotenv').config();

// Simple direct approach without complex imports
async function downloadFromSupabase() {
  console.log('📥 Downloading audio from Supabase...');

  const fileUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/incident-audio/test_user_123/recording_1758178026684_6qzhi7s.webm`;

  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const buffer = await response.buffer();
    console.log(`✅ Downloaded ${buffer.length} bytes`);
    return buffer;

  } catch (error) {
    console.error('❌ Download failed:', error);
    return null;
  }
}

async function transcribeWithOpenAI(audioBuffer) {
  console.log('🎯 Sending to OpenAI Whisper...');

  const formData = new FormData();
  formData.append('file', audioBuffer, {
    filename: 'audio.webm',
    contentType: 'audio/webm'
  });
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'json');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const result = await response.json();
    console.log('✅ Transcription successful!');
    console.log('📝 Text:', result.text);

    return result;

  } catch (error) {
    console.error('❌ Transcription failed:', error);
    return null;
  }
}

async function saveToSupabase(transcriptionText) {
  console.log('💾 Saving to Supabase...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/ai_transcription`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        create_user_id: 'test_user_123',
        transcription_text: transcriptionText,
        audio_url: `${supabaseUrl}/storage/v1/object/public/incident-audio/test_user_123/recording_1758178026684_6qzhi7s.webm`,
        created_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase error: ${error}`);
    }

    const result = await response.json();
    console.log('✅ Saved to database!');
    return result;

  } catch (error) {
    console.error('❌ Save failed:', error);
    return null;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting transcription process...\n');

  // Step 1: Download audio
  const audioBuffer = await downloadFromSupabase();
  if (!audioBuffer) {
    console.log('Failed at Step 1: Download');
    return;
  }

  // Step 2: Transcribe
  const transcription = await transcribeWithOpenAI(audioBuffer);
  if (!transcription) {
    console.log('Failed at Step 2: Transcription');
    return;
  }

  // Step 3: Save to database
  const saved = await saveToSupabase(transcription.text);
  if (!saved) {
    console.log('Failed at Step 3: Database save');
    return;
  }

  console.log('\n✅ Complete! Transcription saved to database.');
}

// Run it
main().catch(console.error);
