/**
 * Get user_signup table schema
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getSchema() {
  // Query to get column names and types
  const { data, error } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns
        WHERE table_name = 'user_signup'
        ORDER BY ordinal_position;
      `
    });

  if (error) {
    console.error('Error:', error);

    // Fallback: query user_signup and see what columns come back
    const { data: sample, error: sampleError } = await supabase
      .from('user_signup')
      .select('*')
      .limit(1)
      .single();

    if (sample) {
      console.log('📋 user_signup columns (from sample record):\n');
      Object.keys(sample).sort().forEach(col => {
        console.log(`  ${col}`);
      });
    }
  } else if (data) {
    console.log('📋 user_signup schema:\n');
    data.forEach(col => {
      console.log(`  ${col.column_name.padEnd(35)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
  }
}

getSchema().catch(console.error);
