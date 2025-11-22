/**
 * Diagnostic Script: Check ai_transcription Table Schema
 *
 * Identifies missing columns causing save errors
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('🔍 Checking ai_transcription table schema...\n');

  try {
    // Get a sample record to see what columns exist
    const { data, error } = await supabase
      .from('ai_transcription')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying table:', error.message);

      // Try to get table structure from information_schema
      const { data: columns, error: schemaError } = await supabase
        .rpc('get_table_columns', { table_name: 'ai_transcription' })
        .catch(() => null);

      if (schemaError) {
        console.log('\n⚠️  Could not query information_schema');
        console.log('   Attempting alternative method...\n');
      }
    }

    if (data && data.length > 0) {
      console.log('✅ Table exists. Current columns:');
      const columns = Object.keys(data[0]);
      columns.forEach(col => console.log(`   - ${col}`));

      console.log('\n📋 Expected columns by controller:');
      const expectedColumns = [
        'id',
        'create_user_id',
        'transcript_text',
        'narrative_text',      // ⚠️ MISSING?
        'voice_transcription', // ⚠️ MISSING?
        'created_at',
        'updated_at'
      ];

      expectedColumns.forEach(col => {
        const exists = columns.includes(col);
        console.log(`   ${exists ? '✅' : '❌'} ${col}`);
      });

      console.log('\n🔧 Missing columns:');
      const missing = expectedColumns.filter(col => !columns.includes(col));
      if (missing.length === 0) {
        console.log('   None - schema is correct! ✨');
      } else {
        missing.forEach(col => console.log(`   ❌ ${col}`));
        console.log('\n💡 Action needed: Add missing columns to database');
      }

    } else {
      console.log('⚠️  Table exists but has no records');
      console.log('   Cannot determine columns from empty table');
      console.log('\n   Attempting INSERT to see which columns are accepted...');

      // Try a test insert to see what columns exist
      const testData = {
        create_user_id: '00000000-0000-0000-0000-000000000000',
        transcript_text: 'test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('ai_transcription')
        .insert([testData])
        .select();

      if (insertError) {
        console.log(`   ❌ Insert failed: ${insertError.message}`);
      } else {
        console.log('   ✅ Basic insert succeeded');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkSchema().then(() => {
  console.log('\n✅ Schema check complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
