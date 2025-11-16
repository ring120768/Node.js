const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const userId = 'ee7cfcaf-5810-4c62-b99b-ab0f2291733e';

  console.log('=== CHECKING AI EAVESDROPPER DATA ===\n');

  // First get incident ID
  const { data: incident } = await supabase
    .from('incident_reports')
    .select('id')
    .or(`auth_user_id.eq.${userId},create_user_id.eq.${userId},user_id.eq.${userId}`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!incident) {
    console.log('❌ No incident found for user');
    return;
  }

  console.log(`Found incident ID: ${incident.id}\n`);

  // Fetch emergency audio data
  const { data: emergencyAudio, error: audioError } = await supabase
    .from('ai_listening_transcripts')
    .select('*')
    .eq('incident_id', incident.id)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  if (audioError) {
    console.log('❌ No emergency audio found:', audioError.message);
    console.log('\nℹ️  This is expected if user did not use AI Eavesdropper feature');
    return;
  }

  if (emergencyAudio) {
    console.log('✅ Emergency audio record found!\n');
    console.log('Available fields:');
    Object.keys(emergencyAudio).forEach(key => {
      const value = emergencyAudio[key];
      if (value && typeof value === 'string' && value.length > 100) {
        console.log(`  ${key}: ${value.substring(0, 100)}... (${value.length} chars)`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    });

    console.log('\n=== KEY FIELDS FOR PDF PAGE 15 ===');
    console.log(`Transcription: ${emergencyAudio.transcription_text ? emergencyAudio.transcription_text.length + ' chars' : 'NULL'}`);
    console.log(`Audio URL: ${emergencyAudio.audio_storage_path ? 'Available' : 'NULL'}`);
    console.log(`Recorded at: ${emergencyAudio.recorded_at || 'NULL'}`);
  }
})();
