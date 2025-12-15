// Diagnostic: Compare controller field names vs actual database schema
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseSchema() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 SCHEMA MISMATCH DIAGNOSTIC');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get actual column names from database
  const { data: columns, error } = await supabase
    .from('incident_reports')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error querying database:', error.message);
    process.exit(1);
  }

  if (!columns || columns.length === 0) {
    console.log('⚠️  No incident reports found, will create test query to get columns');
    // Try empty insert to get column names from error
    const { error: insertError } = await supabase
      .from('incident_reports')
      .insert([{ create_user_id: '00000000-0000-0000-0000-000000000000' }]);

    console.log('Schema error:', insertError);
    process.exit(0);
  }

  const actualColumns = Object.keys(columns[0]);

  console.log('📊 ACTUAL DATABASE COLUMNS (' + actualColumns.length + ' total):\n');

  // Group by category
  const groups = {
    accident: [],
    location: [],
    weather: [],
    road: [],
    medical: [],
    vehicle: [],
    other_driver: [],
    police: [],
    witness: [],
    dvla: [],
    ai: [],
    meta: []
  };

  actualColumns.forEach(col => {
    if (col.includes('accident')) groups.accident.push(col);
    else if (col.includes('location') || col.includes('where') || col.includes('what3words')) groups.location.push(col);
    else if (col.includes('weather') || col.includes('visibility')) groups.weather.push(col);
    else if (col.includes('road') || col.includes('traffic') || col.includes('speed')) groups.road.push(col);
    else if (col.includes('medical') || col.includes('injury') || col.includes('hospital')) groups.medical.push(col);
    else if (col.includes('vehicle') || col.includes('make') || col.includes('model') || col.includes('damage')) groups.vehicle.push(col);
    else if (col.includes('other_')) groups.other_driver.push(col);
    else if (col.includes('police') || col.includes('officer') || col.includes('breath')) groups.police.push(col);
    else if (col.includes('witness')) groups.witness.push(col);
    else if (col.includes('dvla')) groups.dvla.push(col);
    else if (col.includes('ai_')) groups.ai.push(col);
    else groups.meta.push(col);
  });

  Object.entries(groups).forEach(([category, cols]) => {
    if (cols.length > 0) {
      console.log(`\n${category.toUpperCase()} fields (${cols.length}):`);
      cols.forEach(col => console.log(`  - ${col}`));
    }
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🔧 CONTROLLER FIELDS THAT DON\'T EXIST:\n');

  const controllerFields = [
    'location',  // Line 581 in controller
    'accident_location',  // Expected by PDF
    'accident_description',  // Expected by PDF
    'incident_description'  // Mentioned in comments as removed
  ];

  controllerFields.forEach(field => {
    const exists = actualColumns.includes(field);
    console.log(`  ${exists ? '✅' : '❌'} ${field}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 MAPPING SUGGESTIONS:\n');

  // Find Typeform equivalents
  const mappings = [
    { controller: 'location', suggested: 'where_exactly_did_the_accident_happen', category: 'Page 4 location' },
    { controller: 'accident_description', suggested: 'describe_what_happened', category: 'Page 1 description' },
    { controller: 'weather_conditions', suggested: 'weather_* checkboxes', category: 'Page 3 weather' },
    { controller: 'road_conditions', suggested: 'road_condition_* checkboxes', category: 'Page 3 road' }
  ];

  mappings.forEach(m => {
    console.log(`  ${m.category}:`);
    console.log(`    Controller uses: ${m.controller}`);
    console.log(`    Should use: ${m.suggested}\n`);
  });

  process.exit(0);
}

diagnoseSchema();
