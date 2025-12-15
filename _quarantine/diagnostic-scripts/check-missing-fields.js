require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMissingFields() {
  const userId = 'adeedf9d-fe8e-43c9-80d1-30db3c226522';

  const { data: incident } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  console.log('🔍 Checking potentially unmapped PDF fields...\n');

  const potentialFields = [
    'medical_how_are_you_feeling',
    'medical_attention_from_who',
    'medical_treatment_recieved',  // Note: typo in PDF
    'further_medical_attention_needed',
    'other_driver_vehicle_marked_for_export',
    'map_screenshot_captured',
    'additional_witnesses',
    'witness_number'
  ];

  potentialFields.forEach(field => {
    const value = incident?.[field];
    const exists = value !== null && value !== undefined;
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${field}: ${exists ? value : 'NOT IN DATABASE'}`);
  });
}

checkMissingFields().catch(console.error);
