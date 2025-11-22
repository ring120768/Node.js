/**
 * Check if incident_witnesses table exists in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTable() {
  try {
    // Try to query the table directly
    console.log('Checking if incident_witnesses table exists...\n');

    const { data, error, count } = await supabase
      .from('incident_witnesses')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Table does NOT exist');
      console.log('Error:', error.message);
      console.log('\n⚠️  You need to create the table manually in Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/_/sql');
      console.log('\n📄 Run this SQL:');
      console.log('   migrations/024_create_incident_witnesses_table.sql\n');
      process.exit(1);
    }

    console.log('✅ Table EXISTS!');
    console.log(`📊 Current record count: ${count || 0}`);
    console.log('\n✅ All good - table is ready to use\n');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkTable();
