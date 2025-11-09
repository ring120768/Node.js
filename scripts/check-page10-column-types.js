require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumnTypes() {
  console.log('🔍 Checking Page 10 boolean column types...\n');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'incident_reports'
        AND column_name IN ('police_attended', 'airbags_deployed', 'seatbelts_worn')
      ORDER BY column_name;
    `
  });

  if (error) {
    console.error('❌ Error querying schema:', error.message);
    console.log('\n📝 Checking migration files instead...');
    return null;
  }

  console.log('Column Types:');
  data.forEach(col => {
    const typeEmoji = col.data_type === 'boolean' ? '✅' : '❌';
    console.log(`  ${typeEmoji} ${col.column_name}: ${col.data_type} (${col.udt_name})`);
  });

  return data;
}

checkColumnTypes()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
