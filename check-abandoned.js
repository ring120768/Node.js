const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Find abandoned queue entries
  const { data, error } = await supabase
    .from('pdf_generation_queue')
    .select('id, completed_form_id, create_user_id, status, attempt_count, last_error, created_at')
    .eq('status', 'abandoned')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Abandoned Queue Entries (failed before fix):');
  console.log('=============================================');
  if (!data || data.length === 0) {
    console.log('None found');
    return;
  }

  data.forEach((entry, i) => {
    console.log('');
    console.log((i + 1) + '. Queue ID:', entry.id);
    console.log('   Form ID:', entry.completed_form_id);
    console.log('   User ID:', entry.create_user_id);
    console.log('   Attempts:', entry.attempt_count);
    console.log('   Last Error:', entry.last_error);
    console.log('   Created:', entry.created_at);
  });

  console.log('');
  console.log('Total abandoned entries:', data.length);
})();
