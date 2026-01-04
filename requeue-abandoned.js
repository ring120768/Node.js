const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('Finding abandoned queue entries...');

  // Find abandoned entries
  const { data: abandoned, error: findErr } = await supabase
    .from('pdf_generation_queue')
    .select('id, completed_form_id, create_user_id, incident_id, last_error')
    .eq('status', 'abandoned')
    .order('created_at', { ascending: false });

  if (findErr) {
    console.log('Error finding abandoned:', findErr.message);
    return;
  }

  if (!abandoned || abandoned.length === 0) {
    console.log('No abandoned entries found');
    return;
  }

  console.log(`Found ${abandoned.length} abandoned entries\n`);

  // Re-queue each one
  for (const entry of abandoned) {
    console.log(`Re-queuing: ${entry.id}`);
    console.log(`  User: ${entry.create_user_id}`);
    console.log(`  Last Error: ${entry.last_error}`);

    const { error: updateErr } = await supabase
      .from('pdf_generation_queue')
      .update({
        status: 'pending',
        attempt_count: 0,
        last_error: null,
        error_history: null,
        next_retry_at: new Date().toISOString()
      })
      .eq('id', entry.id);

    if (updateErr) {
      console.log(`  ERROR: ${updateErr.message}`);
    } else {
      console.log(`  ✅ Re-queued successfully`);
    }
    console.log('');
  }

  console.log('Done! Entries will be processed by Railway cron within 2 minutes.');
})();
