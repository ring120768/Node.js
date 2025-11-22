const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const userId = 'ee7cfcaf-5810-4c62-b99b-ab0f2291733e';

  console.log('=== CHECKING AI SUMMARY FIELD ===\n');

  const { data: transcription } = await supabase
    .from('ai_transcription')
    .select('id, ai_summary, transcript_text, incident_details, narrative_text')
    .eq('create_user_id', userId)
    .single();

  if (transcription) {
    console.log('ai_transcription record fields:');
    console.log(`  ├─ ai_summary: ${transcription.ai_summary ? transcription.ai_summary.substring(0, 100) + '...' : 'NULL or empty'}`);
    console.log(`  │  Length: ${transcription.ai_summary?.length || 0} chars`);
    console.log('  │');
    console.log(`  ├─ incident_details: ${transcription.incident_details ? transcription.incident_details.substring(0, 100) + '...' : 'NULL or empty'}`);
    console.log(`  │  Length: ${transcription.incident_details?.length || 0} chars`);
    console.log('  │');
    console.log(`  └─ narrative_text: ${transcription.narrative_text ? transcription.narrative_text.substring(0, 100) + '...' : 'NULL or empty'}`);
    console.log(`     Length: ${transcription.narrative_text?.length || 0} chars`);
    console.log('');

    // Find which field has data
    const hasAiSummary = transcription.ai_summary && transcription.ai_summary.trim() !== '';
    const hasIncidentDetails = transcription.incident_details && transcription.incident_details.trim() !== '';
    const hasNarrativeText = transcription.narrative_text && transcription.narrative_text.trim() !== '';

    if (hasAiSummary) {
      console.log('✅ ai_summary has data - should appear on Page 13');
    } else if (hasIncidentDetails) {
      console.log('⚠️  ai_summary empty, but incident_details has data');
      console.log('   Consider using incident_details as fallback');
    } else if (hasNarrativeText) {
      console.log('⚠️  ai_summary empty, but narrative_text has data');
      console.log('   Consider using narrative_text as fallback');
    } else {
      console.log('❌ NO summary data found in any field');
      console.log('');
      console.log('📝 SOLUTION: Add test summary data to database:');
      console.log('   UPDATE ai_transcription');
      console.log(`   SET ai_summary = 'Professional AI-generated summary of the incident'`);
      console.log(`   WHERE id = '${transcription.id}';`);
    }
  }
})();
