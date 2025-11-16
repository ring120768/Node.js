require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listColumns() {
  const userId = 'adeedf9d-fe8e-43c9-80d1-30db3c226522';

  const { data: incident } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (!incident) {
    console.log('No incident found');
    return;
  }

  const allColumns = Object.keys(incident).sort();

  console.log('ALL INCIDENT_REPORTS COLUMNS:\n');
  allColumns.forEach((col, idx) => {
    const value = incident[col];
    const hasValue = value !== null && value !== undefined && value !== '';
    const status = hasValue ? '✅' : '❌';
    const valueStr = hasValue ? JSON.stringify(value).substring(0, 50) : 'NULL';
    console.log(`${idx + 1}. ${status} ${col}: ${valueStr}`);
  });

  console.log(`\nTotal columns: ${allColumns.length}`);
}

listColumns().catch(console.error);
