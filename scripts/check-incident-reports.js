/**
 * Check Incident Reports - Diagnostic Tool
 * Checks incident_reports table for recent submissions
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkIncidentReports() {
  console.log('🔍 Checking incident_reports table...\n');

  const { data, error } = await supabase
    .from('incident_reports')
    .select('id, create_user_id, accident_date, accident_time, location, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('⚠️ No incident reports found');
    process.exit(0);
  }

  console.log(`📊 Found ${data.length} Recent Incident Reports:\n`);
  data.forEach((record, i) => {
    console.log(`${i + 1}. Incident ID: ${record.id}`);
    console.log(`   User ID: ${record.create_user_id}`);
    console.log(`   Accident Date: ${record.accident_date || 'Not set'}`);
    console.log(`   Accident Time: ${record.accident_time || 'Not set'}`);
    console.log(`   Location: ${record.location || 'Not set'}`);
    console.log(`   Created: ${record.created_at}`);
    console.log(`   Updated: ${record.updated_at}`);
    console.log('');
  });
}

checkIncidentReports().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
