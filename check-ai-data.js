const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const userId = 'ee7cfcaf-5810-4c62-b99b-ab0f2291733e';

  console.log('=== CHECKING AI DATA FOR TEST USER ===\n');

  // Check ai_transcription table
  const { data: transcriptions, error: transError } = await supabase
    .from('ai_transcription')
    .select('*')
    .eq('create_user_id', userId);

  console.log('📝 ai_transcription table:');
  if (transError) {
    console.log(`   ❌ Error: ${transError.message}`);
  } else if (!transcriptions || transcriptions.length === 0) {
    console.log('   ⚠️  No records found');
  } else {
    console.log(`   ✅ Found ${transcriptions.length} record(s)`);
    transcriptions.forEach((t, i) => {
      console.log(`   Record ${i + 1}:`);
      console.log(`     - ID: ${t.id}`);
      console.log(`     - Transcript length: ${t.transcript_text?.length || 0} chars`);
      console.log(`     - Model: ${t.model || 'N/A'}`);
      console.log(`     - Created: ${t.created_at}`);
    });
  }

  console.log('');

  // Check ai_summary table
  const { data: summaries, error: summError } = await supabase
    .from('ai_summary')
    .select('*')
    .eq('create_user_id', userId);

  console.log('📋 ai_summary table:');
  if (summError) {
    console.log(`   ❌ Error: ${summError.message}`);
  } else if (!summaries || summaries.length === 0) {
    console.log('   ⚠️  No records found');
  } else {
    console.log(`   ✅ Found ${summaries.length} record(s)`);
    summaries.forEach((s, i) => {
      console.log(`   Record ${i + 1}:`);
      console.log(`     - ID: ${s.id}`);
      console.log(`     - Summary length: ${s.summary?.length || 0} chars`);
      console.log(`     - Created: ${s.created_at}`);
    });
  }

  console.log('');

  // Check incident_reports for fallback fields
  const { data: incident } = await supabase
    .from('incident_reports')
    .select('ai_summary_of_data_collected, detailed_account_of_what_happened')
    .eq('create_user_id', userId)
    .single();

  console.log('📄 incident_reports fallback fields:');
  if (incident) {
    console.log(`   ai_summary_of_data_collected: ${incident.ai_summary_of_data_collected ? '✅ Has data (' + incident.ai_summary_of_data_collected.length + ' chars)' : '❌ Empty'}`);
    console.log(`   detailed_account_of_what_happened: ${incident.detailed_account_of_what_happened ? '✅ Has data (' + incident.detailed_account_of_what_happened.length + ' chars)' : '❌ Empty'}`);
  }
})();
