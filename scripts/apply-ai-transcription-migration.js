/**
 * Apply Migration: Add Missing Columns to ai_transcription Table
 *
 * This script adds the columns expected by ai.controller.js:
 * - transcript_text (main personal statement)
 * - narrative_text (AI-generated narrative)
 * - voice_transcription (raw Whisper transcription)
 *
 * Fixes error: "Could not find the 'narrative_text' column of 'ai_transcription' in the schema cache"
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Service role bypasses RLS
);

async function applyMigration() {
  console.log('🔧 Applying ai_transcription schema migration...\n');

  try {
    // Step 1: Add transcript_text column
    console.log('Adding transcript_text column...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE ai_transcription
        ADD COLUMN IF NOT EXISTS transcript_text TEXT;

        COMMENT ON COLUMN ai_transcription.transcript_text IS
        'Main personal statement text entered or transcribed by user';
      `
    });

    if (error1 && !error1.message.includes('exec_sql')) {
      throw error1;
    }

    // Step 2: Add narrative_text column
    console.log('Adding narrative_text column...');
    const { error: error2 } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE ai_transcription
        ADD COLUMN IF NOT EXISTS narrative_text TEXT;

        COMMENT ON COLUMN ai_transcription.narrative_text IS
        'AI-generated narrative version of the personal statement';
      `
    });

    if (error2 && !error2.message.includes('exec_sql')) {
      throw error2;
    }

    // Step 3: Add voice_transcription column
    console.log('Adding voice_transcription column...');
    const { error: error3 } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE ai_transcription
        ADD COLUMN IF NOT EXISTS voice_transcription TEXT;

        COMMENT ON COLUMN ai_transcription.voice_transcription IS
        'Raw voice transcription from OpenAI Whisper API';
      `
    });

    if (error3 && !error3.message.includes('exec_sql')) {
      throw error3;
    }

    // Step 4: Verify columns were added
    console.log('\n✅ Verifying migration...');
    const { data: verification, error: verifyError } = await supabase
      .from('ai_transcription')
      .select('transcript_text, narrative_text, voice_transcription')
      .limit(0);  // Don't fetch rows, just verify columns exist

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      console.log('\n⚠️  Migration may have failed. Check Supabase dashboard SQL editor.');
      process.exit(1);
    }

    console.log('✅ All columns verified successfully!');
    console.log('\nMigration complete:');
    console.log('  ✓ transcript_text column added');
    console.log('  ✓ narrative_text column added');
    console.log('  ✓ voice_transcription column added');
    console.log('\n📝 The save-statement endpoint should now work correctly.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Manual migration steps:');
    console.log('1. Go to: https://supabase.com/dashboard/project/obrztlhdqlhjnfncybsc');
    console.log('2. Click "SQL Editor"');
    console.log('3. Run the migration from: migrations/add_ai_transcription_columns.sql\n');
    process.exit(1);
  }
}

applyMigration().then(() => {
  console.log('\n✅ Migration script complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
