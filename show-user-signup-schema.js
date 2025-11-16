#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Querying user_signup table schema...\n');

  // Query information_schema to get column names
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_signup'
      ORDER BY ordinal_position
      LIMIT 20;
    `
  });

  if (error) {
    console.log('❌ Error querying schema:', error.message);
    console.log('\nTrying direct table query instead...\n');

    // Fallback: query the table with * and show first row structure
    const { data: sample, error: sampleError } = await supabase
      .from('user_signup')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.log('❌ Error:', sampleError.message);
    } else if (!sample || sample.length === 0) {
      console.log('⚠️  No data in user_signup table');
    } else {
      console.log('✅ First record structure:');
      console.log(JSON.stringify(sample[0], null, 2));
    }
  } else {
    console.log('✅ user_signup table columns:');
    data.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type})`);
    });
  }
})().catch(console.error);
