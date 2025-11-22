const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('=== AI LISTENING TRANSCRIPTS TABLE SCHEMA ===\n');

  const { data, error } = await supabase
    .from('ai_listening_transcripts')
    .select('*')
    .limit(1);

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log('Table columns:');
    Object.keys(data[0]).forEach(col => console.log(`  - ${col}`));
  } else {
    console.log('ℹ️  No records found, checking table info via raw SQL...');

    const { data: columns, error: colError } = await supabase.rpc('exec', {
      sql: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'ai_listening_transcripts' 
        ORDER BY ordinal_position;
      `
    });

    if (!colError && columns) {
      console.log('\nTable structure:');
      columns.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));
    }
  }
})();
