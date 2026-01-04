/**
 * Add missing pdf_send_in_progress and pdf_send_started_at columns
 * to the incident_reports table
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addColumns() {
  console.log('=== ADDING PDF LOCK COLUMNS ===\n');

  // First, check if columns already exist
  const { data: testData, error: testError } = await supabase
    .from('incident_reports')
    .select('id, pdf_send_in_progress, pdf_send_started_at')
    .limit(1);

  if (testError && testError.message.includes('does not exist')) {
    console.log('Columns do not exist - need to add them via Supabase dashboard or migration.\n');
    console.log('SQL to run in Supabase SQL Editor:\n');
    console.log(`
-- Add pdf_send_in_progress column (boolean, default false)
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS pdf_send_in_progress boolean DEFAULT false;

-- Add pdf_send_started_at column (timestamp with timezone)
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS pdf_send_started_at timestamptz;

-- Optionally, add an index for the lock query
CREATE INDEX IF NOT EXISTS idx_incident_reports_pdf_lock
ON incident_reports (pdf_send_in_progress, pdf_send_started_at)
WHERE pdf_sent_at IS NULL;
    `.trim());
    console.log('\n');
    return false;
  } else if (testError) {
    console.log('Unexpected error:', testError.message);
    return false;
  } else {
    console.log('✅ Columns already exist!');
    console.log('Sample data:', JSON.stringify(testData, null, 2));
    return true;
  }
}

addColumns().then(exists => {
  if (!exists) {
    console.log('\nPlease run the SQL above in the Supabase dashboard SQL Editor.');
    console.log('Then re-run the PDF queue processor.');
  }
  process.exit(0);
}).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
