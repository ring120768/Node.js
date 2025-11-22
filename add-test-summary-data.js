const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('=== ADDING TEST AI SUMMARY DATA ===\n');

  const transcriptionId = 'ea85d0c8-00eb-4bc9-8b48-5c41c9f08b46';

  const testSummary = `PROFESSIONAL INCIDENT SUMMARY (AI-Generated)

INCIDENT OVERVIEW:
On the date in question, the claimant was operating their vehicle when an unexpected traffic incident occurred. The circumstances surrounding the event were documented through audio recording to ensure accuracy and detail preservation.

KEY DETAILS CAPTURED:
- Clear verbal account of events as they unfolded
- Precise timestamp and location information provided
- Detailed description of weather and road conditions at the time
- Comprehensive account of actions taken by all parties involved

REPORTING STANDARDS:
The recording guidelines were followed to ensure optimal accuracy. A quiet recording environment was selected to maximize audio clarity. The claimant spoke clearly and methodically, providing comprehensive details about:
- Exact time and location of incident
- Sequence of events leading to and following the incident
- Actions taken by the claimant and other parties
- Environmental conditions and visibility factors
- Any witnesses present at the scene

LEGAL DOCUMENTATION:
This AI-generated summary has been prepared based on the claimant's audio recording. The original audio file remains the primary evidence and source of truth for all statements made. This summary is provided for convenience and should not replace the complete audio transcript for legal purposes.

NEXT STEPS:
All relevant details have been captured for insurance and legal review. The full transcript and audio recording are available for verification and further analysis as required.`;

  console.log('Test summary to add:');
  console.log(testSummary.substring(0, 200) + '...\n');
  console.log(`Total length: ${testSummary.length} chars\n`);

  const { data, error } = await supabase
    .from('ai_transcription')
    .update({ ai_summary: testSummary })
    .eq('id', transcriptionId)
    .select();

  if (error) {
    console.error('❌ Error updating:', error.message);
  } else {
    console.log('✅ Successfully added AI summary to database!');
    console.log(`   Updated record: ${data[0].id}`);
    console.log(`   Summary length: ${data[0].ai_summary.length} chars`);
  }
})();
