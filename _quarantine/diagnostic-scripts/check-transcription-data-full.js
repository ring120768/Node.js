const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const userId = 'ee7cfcaf-5810-4c62-b99b-ab0f2291733e';

  console.log('=== FULL TRANSCRIPTION DATA CHECK ===\n');

  // 1. Check ai_transcription (found 1 record earlier)
  const { data: transcriptions } = await supabase
    .from('ai_transcription')
    .select('*')
    .eq('create_user_id', userId);

  console.log('1️⃣  ai_transcription table:');
  if (transcriptions && transcriptions.length > 0) {
    const t = transcriptions[0];
    console.log(`   ✅ Found record`);
    console.log(`   ID: ${t.id}`);
    console.log(`   transcript_text length: ${t.transcript_text?.length || 0} chars`);
    console.log(`   transcript_text preview: ${t.transcript_text?.substring(0, 100) || '(empty)'}...`);
    console.log(`   model: ${t.model || 'N/A'}`);
    console.log('');
    console.log('   Available columns:');
    Object.keys(t).forEach(col => console.log(`     - ${col}`));
  } else {
    console.log('   ❌ No data');
  }

  console.log('\n');

  // 2. Check incident_reports fallback
  const { data: incident } = await supabase
    .from('incident_reports')
    .select('id, create_user_id, ai_summary_of_data_collected, detailed_account_of_what_happened')
    .eq('create_user_id', userId)
    .single();

  console.log('2️⃣  incident_reports fallback fields:');
  if (incident) {
    console.log(`   ai_summary_of_data_collected:`);
    if (incident.ai_summary_of_data_collected) {
      console.log(`     ✅ ${incident.ai_summary_of_data_collected.length} chars`);
      console.log(`     Preview: ${incident.ai_summary_of_data_collected.substring(0, 100)}...`);
    } else {
      console.log(`     ❌ NULL or empty`);
    }

    console.log(`   detailed_account_of_what_happened:`);
    if (incident.detailed_account_of_what_happened) {
      console.log(`     ✅ ${incident.detailed_account_of_what_happened.length} chars`);
      console.log(`     Preview: ${incident.detailed_account_of_what_happened.substring(0, 100)}...`);
    } else {
      console.log(`     ❌ NULL or empty`);
    }
  }

  console.log('\n');

  // 3. Summary
  console.log('=== SUMMARY ===');
  const hasTranscriptionTable = transcriptions && transcriptions.length > 0;
  const hasTranscriptionText = hasTranscriptionTable && transcriptions[0].transcript_text;
  const hasSummaryFallback = incident?.ai_summary_of_data_collected;
  const hasDetailedFallback = incident?.detailed_account_of_what_happened;

  console.log(`Page 13 (AI Summary): ${hasSummaryFallback ? '✅ Has fallback data' : '❌ No data'}`);
  console.log(`Page 14 (Transcription): ${hasTranscriptionText ? '✅ Has table data' : (hasDetailedFallback ? '⚠️  Has fallback only' : '❌ No data')}`);
  console.log('');
  console.log('📌 DATA SOURCE PRIORITY:');
  console.log('   Page 13: data.aiSummary.summary > incident.ai_summary_of_data_collected');
  console.log('   Page 14: data.aiTranscription.transcription > incident.detailed_account_of_what_happened');
  console.log('');
  console.log('❌ PROBLEM: dataFetcher.js does NOT fetch ai_transcription or ai_summary tables!');
  console.log('   The PDF filler expects data.aiTranscription and data.aiSummary');
  console.log('   But dataFetcher only provides incident.* fields');
})();
