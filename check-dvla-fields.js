require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDvlaFields() {
  const userId = 'adeedf9d-fe8e-43c9-80d1-30db3c226522';

  const { data: dvlaRecords, error } = await supabase
    .from('dvla_vehicle_info_new')
    .select('*')
    .eq('create_user_id', userId);

  console.log('🚗 DVLA Records:', dvlaRecords ? dvlaRecords.length : 0);

  if (dvlaRecords && dvlaRecords.length > 0) {
    dvlaRecords.forEach((record, idx) => {
      console.log(`\nRecord ${idx + 1}:`);
      console.log('  Registration:', record.registration_number);
      console.log('  Marked for export:', record.marked_for_export);

      // Show all columns with data
      const cols = Object.keys(record).filter(k => record[k] !== null && record[k] !== undefined);
      console.log('  Total fields with data:', cols.length);
    });
  } else {
    console.log('❌ No DVLA records found');
  }
}

checkDvlaFields().catch(console.error);
