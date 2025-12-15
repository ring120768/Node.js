#!/usr/bin/env node

/**
 * Update voice_transcription in incident_reports table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateVoiceTranscription() {
  const userId = '5326c2aa-f1d5-4edc-a972-7fb14995ed0f';

  const mockTranscription = `Right, so this happened about 2 hours ago on the M25 near Junction 15. I was driving along in the middle lane, doing about 60 miles per hour, traffic was quite heavy. The weather was clear, dry roads, good visibility. I noticed the brake lights ahead and started slowing down, but the car behind me just ploughed straight into the back of me. Massive jolt, my head snapped forward against the headrest, thank God for that. The other driver got out and admitted he was looking at his phone, didn't see me braking. He's apologised profusely. My boot is completely crumpled in, rear lights are smashed. His front bumper is hanging off. No one else was hurt, just me with a bit of whiplash. We exchanged details, took photos. Police weren't called as it seemed straightforward. I've got his insurance details - he's with Admiral. My neck is quite sore now, might need to see a doctor.`;

  console.log('Updating voice_transcription in incident_reports for user:', userId);
  console.log('Transcription length:', mockTranscription.length, 'characters\n');

  // Update incident_reports table
  const { data, error } = await supabase
    .from('incident_reports')
    .update({
      voice_transcription: mockTranscription
    })
    .eq('create_user_id', userId)
    .select();

  if (error) {
    console.error('❌ Error updating voice_transcription:', error);
    process.exit(1);
  }

  console.log('✅ Voice transcription updated:', data[0]?.id);
  console.log('   Field: voice_transcription');
  console.log('   Table: incident_reports');
  console.log('   Length:', mockTranscription.length, 'characters');
  console.log('\n✅ Mock transcription data updated successfully!');
  console.log('   PDF will now show M25 Junction 15 incident on Page 13');
}

updateVoiceTranscription().catch(console.error);
