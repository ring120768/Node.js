const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const userId = '61033b12-c351-42c0-9647-725eb1ee9154';

  console.log('📊 Checking incident_reports...');
  const { data: incidents } = await supabase
    .from('incident_reports')
    .select('id, status, completed_at, created_at')
    .eq('create_user_id', userId);

  console.log('Incidents:', JSON.stringify(incidents, null, 2));

  console.log('\n📄 Checking completed_incident_forms...');
  const { data: pdfs } = await supabase
    .from('completed_incident_forms')
    .select('id, generated_at, pdf_storage_path')
    .eq('create_user_id', userId);

  console.log('PDFs:', JSON.stringify(pdfs, null, 2));
  console.log('\nPDF Count:', pdfs ? pdfs.length : 0);
})();
