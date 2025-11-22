/**
 * Verify AI Transcription Migration Success
 *
 * Run this AFTER executing the migration in Supabase dashboard
 * to confirm all three columns were added successfully.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyMigration() {
  console.log('🔍 Verifying ai_transcription migration...\n');

  try {
    // Test 1: Try to select the new columns
    console.log('Test 1: Attempting to select new columns...');
    const { data, error } = await supabase
      .from('ai_transcription')
      .select('transcript_text, narrative_text, voice_transcription')
      .limit(1);

    if (error) {
      console.error('❌ Column selection failed:', error.message);
      console.log('\n⚠️  Migration appears incomplete. Please check Supabase dashboard.\n');
      process.exit(1);
    }

    console.log('✅ All three columns exist and are queryable\n');

    // Test 2: Try to insert test data
    console.log('Test 2: Testing insert with new columns...');
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Test UUID

    const { data: insertData, error: insertError } = await supabase
      .from('ai_transcription')
      .insert([{
        create_user_id: testUserId,
        transcript_text: 'Test statement',
        narrative_text: 'Test narrative',
        voice_transcription: 'Test transcription',
      }])
      .select();

    if (insertError) {
      console.error('❌ Insert test failed:', insertError.message);
      process.exit(1);
    }

    console.log('✅ Insert test successful\n');

    // Test 3: Clean up test record
    console.log('Test 3: Cleaning up test record...');
    const { error: deleteError } = await supabase
      .from('ai_transcription')
      .delete()
      .eq('create_user_id', testUserId);

    if (deleteError) {
      console.warn('⚠️  Cleanup warning:', deleteError.message);
    } else {
      console.log('✅ Test record cleaned up\n');
    }

    // Success summary
    console.log('═══════════════════════════════════════════');
    console.log('🎉 MIGRATION VERIFIED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════');
    console.log('\nAll three columns added:');
    console.log('  ✓ transcript_text');
    console.log('  ✓ narrative_text');
    console.log('  ✓ voice_transcription');
    console.log('\nThe save-statement endpoint should now work correctly.');
    console.log('Users can proceed to the declaration page.\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.log('\n📋 Troubleshooting:');
    console.log('1. Ensure migration was executed in Supabase SQL editor');
    console.log('2. Check for any error messages in the SQL editor');
    console.log('3. Verify you\'re connected to the correct project\n');
    process.exit(1);
  }
}

verifyMigration().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
