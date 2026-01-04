const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const userId = '94d80b2d-e77c-4b90-b3ad-544a20a13571';

(async () => {
  console.log('Finding incidents for user:', userId);

  // Get the most recent incident for this user
  const { data: incidents, error: incErr } = await supabase
    .from('completed_incident_forms')
    .select('id, created_at, incident_id')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (incErr) {
    console.log('Error finding incidents:', incErr.message);
    return;
  }

  if (!incidents || incidents.length === 0) {
    console.log('No incidents found for this user');
    return;
  }

  const incident = incidents[0];
  console.log('Found completed form:', incident.id);
  console.log('Incident ID:', incident.incident_id);
  console.log('Created:', incident.created_at);

  // Check if already in queue
  const { data: existing } = await supabase
    .from('pdf_generation_queue')
    .select('id, status, created_at, last_error')
    .eq('completed_form_id', incident.id)
    .order('created_at', { ascending: false })
    .limit(3);

  if (existing && existing.length > 0) {
    console.log('');
    console.log('Existing queue entries:');
    existing.forEach(e => {
      console.log(`  - ${e.id}: ${e.status} (${e.created_at})`);
      if (e.last_error) console.log(`    Error: ${e.last_error}`);
    });
  }

  // Add to queue with correct column names
  console.log('');
  console.log('Adding new entry to PDF generation queue...');
  const { data: queueEntry, error: queueErr } = await supabase
    .from('pdf_generation_queue')
    .insert({
      completed_form_id: incident.id,
      incident_id: incident.incident_id,
      create_user_id: userId,
      status: 'pending',
      source: 'manual_test',
      attempt_count: 0,
      max_attempts: 3
    })
    .select()
    .single();

  if (queueErr) {
    console.log('Queue error:', queueErr.message);
    return;
  }

  console.log('✅ Queued successfully!');
  console.log('Queue ID:', queueEntry.id);
  console.log('');
  console.log('Railway will pick this up on the next cron run.');
  console.log('Monitor at: https://railway.app');
})();
