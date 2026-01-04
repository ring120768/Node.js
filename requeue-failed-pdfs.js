/**
 * Re-queue failed PDF generation jobs
 * These were marked 'completed' with null completed_form_id due to a bug
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requeue() {
  console.log('=== RE-QUEUING FAILED PDF JOBS ===\n');

  // Find queue entries marked 'completed' but with null completed_form_id
  const { data: failedJobs, error: findError } = await supabase
    .from('pdf_generation_queue')
    .select('*')
    .eq('status', 'completed')
    .is('completed_form_id', null);

  if (findError) {
    console.error('Error finding failed jobs:', findError.message);
    return;
  }

  if (!failedJobs || failedJobs.length === 0) {
    console.log('No failed jobs to re-queue');
    return;
  }

  console.log(`Found ${failedJobs.length} jobs to re-queue:\n`);

  for (const job of failedJobs) {
    console.log(`Job ${job.id}:`);
    console.log(`  User: ${job.create_user_id}`);
    console.log(`  Incident: ${job.incident_id}`);
    console.log(`  Original Created: ${job.created_at}`);

    // Reset the job to pending
    const { error: updateError } = await supabase
      .from('pdf_generation_queue')
      .update({
        status: 'pending',
        attempt_count: 0,
        completed_at: null,
        completed_form_id: null,
        last_error: null,
        error_history: [],
        next_retry_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    if (updateError) {
      console.log(`  ❌ Failed to re-queue: ${updateError.message}`);
    } else {
      console.log(`  ✅ Re-queued successfully!`);
    }
    console.log('');
  }

  // Also reset the incident's lock columns so PDF generation can proceed
  console.log('\nResetting incident lock columns...\n');

  for (const job of failedJobs) {
    if (job.incident_id) {
      const { error: resetError } = await supabase
        .from('incident_reports')
        .update({
          pdf_send_in_progress: false,
          pdf_send_started_at: null
        })
        .eq('id', job.incident_id);

      if (resetError) {
        console.log(`Incident ${job.incident_id}: ❌ Failed to reset lock: ${resetError.message}`);
      } else {
        console.log(`Incident ${job.incident_id}: ✅ Lock reset`);
      }
    }
  }

  console.log('\n=== DONE ===');
  console.log('The queue processor will pick up these jobs on the next run.');
  console.log('Or you can manually trigger PDF generation using the admin API.');
}

requeue().then(() => process.exit(0)).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
