/**
 * Check PDF storage and completed forms
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('=== ALL completed_incident_forms ===\n');

  const { data: forms, error: formsError } = await supabase
    .from('completed_incident_forms')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(10);

  if (formsError) {
    console.log('ERROR:', formsError.message);
  } else if (!forms || forms.length === 0) {
    console.log('(empty - NO PDFs have ever been generated!)');
  } else {
    console.log('Found', forms.length, 'completed forms:');
    forms.forEach(f => console.log(JSON.stringify(f, null, 2)));
  }

  console.log('\n=== Any PDF storage in Supabase? ===');

  const { data: buckets } = await supabase.storage.listBuckets();
  console.log('Buckets:', buckets ? buckets.map(b => b.name) : 'none');

  // Check the completed-forms bucket
  const { data: files, error: filesError } = await supabase.storage
    .from('completed-forms')
    .list('', { limit: 10 });

  if (filesError) {
    console.log('Storage error:', filesError.message);
  } else {
    console.log('Files in completed-forms bucket:', files ? files.length : 0);
    if (files && files.length > 0) {
      files.forEach(f => console.log(' -', f.name, f.created_at));
    }
  }
}

check().then(() => process.exit(0)).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
