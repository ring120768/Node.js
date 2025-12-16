/**
 * Check PDF Generation Status - Diagnostic Tool
 * Checks completed_incident_forms table for recent PDF generation records
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPdfStatus() {
  console.log('🔍 Checking completed_incident_forms table...\n');

  const { data, error } = await supabase
    .from('completed_incident_forms')
    .select('id, create_user_id, generated_at, sent_to_user, sent_to_accounts, email_status, pdf_url')
    .order('generated_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('⚠️ No PDF generation records found');
    process.exit(0);
  }

  console.log('📊 Recent PDF Generation Records:\n');
  data.forEach((record, i) => {
    console.log(`${i + 1}. Record ID: ${record.id}`);
    console.log(`   User ID: ${record.create_user_id}`);
    console.log(`   Generated: ${record.generated_at}`);
    console.log(`   Sent to User: ${record.sent_to_user}`);
    console.log(`   Sent to Accounts: ${record.sent_to_accounts}`);
    console.log(`   PDF URL: ${record.pdf_url ? 'Yes' : 'No'}`);
    console.log(`   Email Status:`, JSON.stringify(record.email_status, null, 2));
    console.log('');
  });
}

checkPdfStatus().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
