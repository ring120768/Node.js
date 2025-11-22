/**
 * Diagnose PDF Field Population Issues
 * Checks what data exists in DB vs what gets mapped to PDF
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnosePdfPopulation() {
  const userId = 'adeedf9d-fe8e-43c9-80d1-30db3c226522';

  console.log('🔍 DIAGNOSIS: PDF Field Population\n');
  console.log('='.repeat(60));

  // 1. Check user_signup data
  console.log('\n📊 USER_SIGNUP DATA:');
  console.log('-'.repeat(60));
  const { data: signup, error: signupError } = await supabase
    .from('user_signup')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (signupError) {
    console.error('❌ Error fetching signup:', signupError.message);
  } else {
    const nonNullFields = Object.entries(signup).filter(([k, v]) => v !== null && v !== '');
    console.log(`✅ Found ${nonNullFields.length} non-null fields:`);
    nonNullFields.forEach(([key, value]) => {
      const displayValue = typeof value === 'string' && value.length > 50
        ? value.substring(0, 50) + '...'
        : value;
      console.log(`   ${key}: ${displayValue}`);
    });
  }

  // 2. Check incident_reports data
  console.log('\n\n📊 INCIDENT_REPORTS DATA:');
  console.log('-'.repeat(60));
  const { data: incident, error: incidentError } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (incidentError) {
    console.error('❌ Error fetching incident:', incidentError.message);
  } else if (!incident) {
    console.log('⚠️  No incident reports found for this user');
  } else {
    const nonNullFields = Object.entries(incident).filter(([k, v]) => v !== null && v !== '');
    console.log(`✅ Found ${nonNullFields.length} non-null fields:`);

    // Group by page (based on field naming patterns)
    const fieldsByPage = {
      'Page 3 (Date/Time)': [],
      'Page 4 (Location)': [],
      'Page 5 (Vehicle)': [],
      'Page 6 (Damage)': [],
      'Page 7 (Other Vehicles)': [],
      'Page 9 (Witnesses)': [],
      'Page 10 (Police)': [],
      'Page 11 (Medical)': [],
      'Page 12 (Final)': [],
      'Unknown': []
    };

    nonNullFields.forEach(([key, value]) => {
      const displayValue = typeof value === 'string' && value.length > 50
        ? value.substring(0, 50) + '...'
        : value;

      // Classify by field name patterns
      if (key.includes('accident_date') || key.includes('accident_time')) {
        fieldsByPage['Page 3 (Date/Time)'].push(`${key}: ${displayValue}`);
      } else if (key.includes('location') || key.includes('postcode') || key.includes('what3words')) {
        fieldsByPage['Page 4 (Location)'].push(`${key}: ${displayValue}`);
      } else if (key.includes('vehicle_driveable') || key.includes('your_vehicle')) {
        fieldsByPage['Page 5 (Vehicle)'].push(`${key}: ${displayValue}`);
      } else if (key.includes('damage') || key.includes('impact_point')) {
        fieldsByPage['Page 6 (Damage)'].push(`${key}: ${displayValue}`);
      } else if (key.includes('other_vehicle') || key.includes('other_driver')) {
        fieldsByPage['Page 7 (Other Vehicles)'].push(`${key}: ${displayValue}`);
      } else if (key.includes('witness')) {
        fieldsByPage['Page 9 (Witnesses)'].push(`${key}: ${displayValue}`);
      } else if (key.includes('police') || key.includes('crime_number')) {
        fieldsByPage['Page 10 (Police)'].push(`${key}: ${displayValue}`);
      } else if (key.includes('medical') || key.includes('injury') || key.includes('hospital')) {
        fieldsByPage['Page 11 (Medical)'].push(`${key}: ${displayValue}`);
      } else if (key.includes('final') || key.includes('feeling') || key.includes('additional')) {
        fieldsByPage['Page 12 (Final)'].push(`${key}: ${displayValue}`);
      } else {
        fieldsByPage['Unknown'].push(`${key}: ${displayValue}`);
      }
    });

    // Display grouped fields
    Object.entries(fieldsByPage).forEach(([page, fields]) => {
      if (fields.length > 0) {
        console.log(`\n  ${page}: ${fields.length} fields`);
        fields.forEach(field => console.log(`    - ${field}`));
      }
    });
  }

  // 3. Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 SUMMARY:');
  console.log('='.repeat(60));
  console.log(`User Signup Fields: ${signup ? Object.entries(signup).filter(([k, v]) => v !== null && v !== '').length : 0}`);
  console.log(`Incident Report Fields: ${incident ? Object.entries(incident).filter(([k, v]) => v !== null && v !== '').length : 0}`);
  console.log('\n💡 NEXT STEPS:');
  console.log('   1. Review pdfFieldMapper.js to see field mapping logic');
  console.log('   2. Check if PDF field names match database column names');
  console.log('   3. Verify data is being passed to Adobe PDF service correctly');
}

diagnosePdfPopulation().catch(console.error);
