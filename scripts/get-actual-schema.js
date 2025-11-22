/**
 * Get Actual ai_transcription Table Schema
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getActualSchema() {
  console.log('🔍 Querying actual table structure from PostgreSQL...\n');

  try {
    // Query PostgreSQL information_schema to get column details
    const { data, error } = await supabase
      .from('ai_transcription')
      .select('*')
      .limit(0); // Don't fetch rows, just get structure

    if (error) {
      // Try raw SQL query
      const { data: sqlData, error: sqlError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'ai_transcription'
          ORDER BY ordinal_position;
        `
      });

      if (sqlError) {
        console.log('⚠️  RPC method not available. Trying direct query...\n');

        // Last resort: try to select with all possible column names
        const possibleColumns = [
          'id', 'create_user_id', 'user_id',
          'transcription', 'transcript', 'transcript_text',
          'narrative', 'narrative_text',
          'voice_transcription', 'audio_url',
          'created_at', 'updated_at'
        ];

        for (const col of possibleColumns) {
          const { data: testData, error: testError } = await supabase
            .from('ai_transcription')
            .select(col)
            .limit(1);

          if (!testError) {
            console.log(`✅ Column exists: ${col}`);
          }
        }

        return;
      }

      console.log('📊 Actual table schema:');
      sqlData.forEach(col => {
        console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });

    } else {
      console.log('✅ Query succeeded but table appears to be empty');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);

    // Fallback: Check Supabase dashboard manually
    console.log('\n💡 Alternative: Check schema in Supabase dashboard:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/obrztlhdqlhjnfncybsc');
    console.log('   2. Click "Table Editor"');
    console.log('   3. Find "ai_transcription" table');
    console.log('   4. Check column names\n');
  }
}

getActualSchema().then(() => {
  console.log('\n✅ Schema query complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
