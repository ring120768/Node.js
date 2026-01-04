const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Get recent queue entries
  const { data, error } = await supabase
    .from('pdf_generation_queue')
    .select('id, create_user_id, status, attempt_count, last_error, completed_at, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Recent PDF Queue Entries:');
  console.log('=========================\n');

  const statusCounts = { pending: 0, processing: 0, completed: 0, failed: 0, abandoned: 0 };

  data.forEach((entry, i) => {
    statusCounts[entry.status] = (statusCounts[entry.status] || 0) + 1;
    const emoji = entry.status === 'completed' ? '✅' : entry.status === 'pending' ? '⏳' : entry.status === 'failed' ? '❌' : '🔄';
    console.log(`${emoji} ${entry.id.substring(0, 8)}... | ${entry.status.padEnd(10)} | User: ${entry.create_user_id.substring(0, 8)}...`);
    if (entry.last_error) console.log(`   Error: ${entry.last_error}`);
    if (entry.completed_at) console.log(`   Completed: ${entry.completed_at}`);
  });

  console.log('\n--- Summary ---');
  console.log(`Completed: ${statusCounts.completed}`);
  console.log(`Pending: ${statusCounts.pending}`);
  console.log(`Failed: ${statusCounts.failed}`);
  console.log(`Abandoned: ${statusCounts.abandoned}`);
})();
