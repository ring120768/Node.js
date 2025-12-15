#!/usr/bin/env node

/**
 * Update AI transcription with mock data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateTranscription() {
  const userId = '5326c2aa-f1d5-4edc-a972-7fb14995ed0f';

  const mockTranscription = `Right, so this happened about 2 hours ago on the M25 near Junction 15. I was driving along in the middle lane, doing about 60 miles per hour, traffic was quite heavy. The weather was clear, dry roads, good visibility. I noticed the brake lights ahead and started slowing down, but the car behind me just ploughed straight into the back of me. Massive jolt, my head snapped forward against the headrest, thank God for that. The other driver got out and admitted he was looking at his phone, didn't see me braking. He's apologised profusely. My boot is completely crumpled in, rear lights are smashed. His front bumper is hanging off. No one else was hurt, just me with a bit of whiplash. We exchanged details, took photos. Police weren't called as it seemed straightforward. I've got his insurance details - he's with Admiral. My neck is quite sore now, might need to see a doctor.`;

  console.log('Updating transcription for user:', userId);
  console.log('Transcription length:', mockTranscription.length, 'characters\n');

  // Update ai_transcription table
  const { data, error } = await supabase
    .from('ai_transcription')
    .update({
      transcript_text: mockTranscription,
      updated_at: new Date().toISOString()
    })
    .eq('create_user_id', userId)
    .select();

  if (error) {
    console.error('❌ Error updating transcription:', error);

    // If no record exists, insert one
    console.log('\n🔄 No existing transcription found, creating new record...');
    const { data: insertData, error: insertError } = await supabase
      .from('ai_transcription')
      .insert({
        create_user_id: userId,
        transcript_text: mockTranscription,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (insertError) {
      console.error('❌ Error creating transcription:', insertError);
      process.exit(1);
    }

    console.log('✅ Transcription created:', insertData);
  } else {
    console.log('✅ Transcription updated:', data);
  }

  console.log('\n✅ Mock transcription data updated successfully!');
  console.log('   You can now regenerate the PDF with this data.');
}

updateTranscription().catch(console.error);
