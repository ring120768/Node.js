require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getActualSchema() {
  const userId = 'adeedf9d-fe8e-43c9-80d1-30db3c226522';
  const { data: incident } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  // Get all column names that have data
  const columns = Object.keys(incident).filter(k => incident[k] !== null);

  console.log(`📋 ACTUAL DATABASE COLUMNS WITH DATA (${columns.length} total):\n`);

  // Check for specific unmapped PDF fields
  const pdfFields = [
    'medical_how_are_you_feeling',
    'medical_treatment_recieved',  // typo in PDF
    'medical_treatment_received',  // correct spelling
    'final_feeling',
    'other_driver_vehicle_marked_for_export',
    'map_screenshot_captured'
  ];

  console.log('🔍 Checking for PDF field equivalents:\n');
  pdfFields.forEach(field => {
    const exists = columns.includes(field);
    const value = incident[field];
    console.log(`${exists ? '✅' : '❌'} ${field}: ${exists ? value : 'NOT IN DB'}`);
  });

  // Look for "feeling" related fields
  console.log('\n💭 FEELING-related fields in DB:');
  const feelingFields = columns.filter(c => c.toLowerCase().includes('feeling'));
  feelingFields.forEach(f => console.log(`  ✅ ${f}: ${incident[f]}`));

  // Look for "treatment" related fields
  console.log('\n💉 TREATMENT-related fields in DB:');
  const treatmentFields = columns.filter(c => c.toLowerCase().includes('treatment'));
  treatmentFields.forEach(f => console.log(`  ✅ ${f}: ${incident[f]}`));
}

getActualSchema().catch(console.error);
