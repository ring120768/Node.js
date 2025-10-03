
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function diagnoseIncidentReports() {
  console.log('🔍 DIAGNOSING INCIDENT REPORTS ISSUE');
  console.log('=====================================');

  // Initialize Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Check if incident_reports table exists and its structure
    console.log('1. Checking incident_reports table structure...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_info', { table_name: 'incident_reports' })
      .catch(async () => {
        // Fallback: try to query the table directly
        const { data, error } = await supabase
          .from('incident_reports')
          .select('*')
          .limit(1);
        
        if (error) {
          console.log('❌ incident_reports table may not exist:', error.message);
          return null;
        }
        return data;
      });

    // 2. Check current records in incident_reports
    console.log('2. Checking current incident reports...');
    const { data: reports, error: reportsError } = await supabase
      .from('incident_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (reportsError) {
      console.log('❌ Error querying incident_reports:', reportsError.message);
    } else {
      console.log(`✅ Found ${reports.length} incident reports`);
      if (reports.length > 0) {
        console.log('Recent reports:');
        reports.forEach((report, i) => {
          console.log(`  ${i + 1}. ID: ${report.id}, User: ${report.create_user_id || report.user_id}, Created: ${report.created_at}`);
        });
      }
    }

    // 3. Check webhook failures
    console.log('3. Checking webhook failures...');
    const { data: failures, error: failuresError } = await supabase
      .from('webhook_failures')
      .select('*')
      .eq('endpoint', '/webhook/incident-report')
      .order('created_at', { ascending: false })
      .limit(5);

    if (failuresError) {
      console.log('⚠️ Error querying webhook_failures:', failuresError.message);
    } else {
      console.log(`Found ${failures.length} webhook failures for incident-report endpoint`);
      if (failures.length > 0) {
        console.log('Recent failures:');
        failures.forEach((failure, i) => {
          console.log(`  ${i + 1}. Error: ${failure.error_message}, Created: ${failure.created_at}`);
        });
      }
    }

    // 4. Check transcription_queue for comparison
    console.log('4. Checking transcription_queue for comparison...');
    const { data: queue, error: queueError } = await supabase
      .from('transcription_queue')
      .select('create_user_id, created_at, status')
      .order('created_at', { ascending: false })
      .limit(5);

    if (queueError) {
      console.log('⚠️ Error querying transcription_queue:', queueError.message);
    } else {
      console.log(`✅ Found ${queue.length} items in transcription_queue`);
      if (queue.length > 0) {
        console.log('Recent queue items:');
        queue.forEach((item, i) => {
          console.log(`  ${i + 1}. User: ${item.create_user_id}, Status: ${item.status}, Created: ${item.created_at}`);
        });
      }
    }

    // 5. Check ai_transcription for comparison
    console.log('5. Checking ai_transcription for comparison...');
    const { data: transcriptions, error: transcriptionsError } = await supabase
      .from('ai_transcription')
      .select('create_user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (transcriptionsError) {
      console.log('⚠️ Error querying ai_transcription:', transcriptionsError.message);
    } else {
      console.log(`✅ Found ${transcriptions.length} transcriptions`);
      if (transcriptions.length > 0) {
        console.log('Recent transcriptions:');
        transcriptions.forEach((trans, i) => {
          console.log(`  ${i + 1}. User: ${trans.create_user_id}, Created: ${trans.created_at}`);
        });
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log('===========');
    console.log(`Incident Reports: ${reports?.length || 0}`);
    console.log(`Webhook Failures: ${failures?.length || 0}`);
    console.log(`Transcription Queue: ${queue?.length || 0}`);
    console.log(`AI Transcriptions: ${transcriptions?.length || 0}`);

    if ((queue?.length || 0) > 0 && (reports?.length || 0) === 0) {
      console.log('\n⚠️  ISSUE IDENTIFIED:');
      console.log('- Transcription data is being saved correctly');
      console.log('- But incident reports are NOT being saved');
      console.log('- This suggests the /webhook/incident-report endpoint is not being called');
      console.log('- OR there are errors preventing the data from being saved');
    }

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

// Run diagnosis if called directly
if (require.main === module) {
  diagnoseIncidentReports().catch(console.error);
}

module.exports = { diagnoseIncidentReports };
