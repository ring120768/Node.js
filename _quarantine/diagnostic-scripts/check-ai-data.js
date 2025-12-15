require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAIData() {
  const userId = '5326c2aa-f1d5-4edc-a972-7fb14995ed0f';

  console.log('Fetching AI analysis data from database...\n');

  const { data, error } = await supabase
    .from('incident_reports')
    .select('voice_transcription, analysis_metadata, quality_review, ai_summary, closing_statement, final_review')
    .eq('create_user_id', userId)
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📊 Current AI Data in Database:\n');
  console.log('1. voice_transcription:');
  console.log('   ' + (data.voice_transcription || '(empty)').substring(0, 150));
  console.log('   Length:', data.voice_transcription?.length || 0, 'chars\n');

  console.log('2. analysis_metadata:');
  console.log('   ' + JSON.stringify(data.analysis_metadata, null, 2) + '\n');

  console.log('3. quality_review:');
  console.log('   ' + (data.quality_review || '(empty)').substring(0, 150));
  console.log('   Length:', data.quality_review?.length || 0, 'chars\n');

  console.log('4. ai_summary:');
  console.log('   ' + (data.ai_summary || '(empty)').substring(0, 150));
  console.log('   Length:', data.ai_summary?.length || 0, 'chars\n');

  console.log('5. closing_statement:');
  console.log('   ' + (data.closing_statement || '(empty)').substring(0, 150));
  console.log('   Length:', data.closing_statement?.length || 0, 'chars\n');

  console.log('6. final_review:');
  console.log('   ' + (data.final_review || '(empty)').substring(0, 150));
  console.log('   Length:', data.final_review?.length || 0, 'chars\n');
}

checkAIData().catch(console.error);
