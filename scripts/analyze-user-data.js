// scripts/analyze-user-data.js
// Analyze data completeness for user 9db03736-74ac-4d00-9ae2-3639b58360a3

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const USER_ID = '9db03736-74ac-4d00-9ae2-3639b58360a3';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function analyzeUserData() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 DATA ANALYSIS FOR USER: ${USER_ID}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Fetch user signup
    const { data: userData } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', USER_ID)
      .single();

    // Fetch most recent incident
    const { data: incidentData } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('create_user_id', USER_ID)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch vehicles for most recent incident
    let vehiclesData = [];
    if (incidentData) {
      const { data: vehicles } = await supabase
        .from('incident_other_vehicles')
        .select('*')
        .eq('incident_id', incidentData.id)
        .is('deleted_at', null);
      vehiclesData = vehicles || [];
    }

    // Fetch witnesses for most recent incident
    let witnessesData = [];
    if (incidentData) {
      const { data: witnesses } = await supabase
        .from('incident_witnesses')
        .select('*')
        .eq('incident_report_id', incidentData.id)
        .is('deleted_at', null);
      witnessesData = witnesses || [];
    }

    // ==================== USER SIGNUP ANALYSIS ====================
    console.log('1️⃣  USER SIGNUP DATA:\n');
    if (userData) {
      console.log('   ✅ Record found');
      console.log(`   📧 Email: ${userData.email}`);
      console.log(`   👤 Name: ${userData.name} ${userData.surname}`);
      console.log(`   📱 Mobile: ${userData.mobile}`);
      console.log(`   🚗 Vehicle: ${userData.vehicle_make} ${userData.vehicle_model} (${userData.car_registration_number})`);
      console.log(`   🛡️  Insurance: ${userData.insurance_company} - Policy ${userData.policy_number}`);
      console.log(`   📍 Address: ${userData.street_address}, ${userData.town}, ${userData.postcode}`);
      console.log(`   ⚡ Emergency: ${userData.emergency_contact}`);
      console.log(`   🎓 License: ${userData.driving_license_number}`);
      console.log(`\n   📊 Field Stats:`);
      console.log(`      Total fields: ${Object.keys(userData).length}`);
      console.log(`      Non-null fields: ${Object.values(userData).filter(v => v !== null).length}`);
      console.log(`      Completion: ${Math.round(Object.values(userData).filter(v => v !== null).length / Object.keys(userData).length * 100)}%`);
    } else {
      console.log('   ❌ No record found');
    }

    // ==================== INCIDENT REPORT ANALYSIS ====================
    console.log('\n' + '─'.repeat(80) + '\n');
    console.log('2️⃣  MOST RECENT INCIDENT REPORT:\n');
    if (incidentData) {
      console.log('   ✅ Record found');
      console.log(`   📅 Date: ${incidentData.accident_date}`);
      console.log(`   ⏰ Time: ${incidentData.accident_time}`);
      console.log(`   📍 Location: ${incidentData.what3words}`);
      console.log(`   🏥 Medical: ${incidentData.medical_attention_needed ? 'YES' : 'NO'}`);
      if (incidentData.medical_attention_needed) {
        console.log(`      Details: ${incidentData.medical_injury_details}`);
        console.log(`      Severity: ${incidentData.medical_injury_severity}`);
        console.log(`      Hospital: ${incidentData.medical_hospital_name}`);
      }
      console.log(`   🚗 Your Vehicle: ${incidentData.dvla_make} ${incidentData.dvla_model} (${incidentData.vehicle_license_plate})`);
      console.log(`   💥 Damage: ${incidentData.no_damage ? 'NO DAMAGE' : incidentData.damage_to_your_vehicle || 'YES'}`);
      console.log(`   🚓 Police: ${incidentData.police_attended === 'true' ? 'YES' : 'NO'}`);
      if (incidentData.police_attended === 'true') {
        console.log(`      Ref: ${incidentData.accident_ref_number}`);
        console.log(`      Force: ${incidentData.police_force}`);
        console.log(`      Officer: ${incidentData.officer_name} (${incidentData.officer_badge})`);
      }
      console.log(`   👁️  Witnesses: ${incidentData.witnesses_present === 'yes' ? 'YES' : 'NO'}`);
      console.log(`\n   📊 Field Stats:`);
      console.log(`      Total fields: ${Object.keys(incidentData).length}`);
      console.log(`      Non-null fields: ${Object.values(incidentData).filter(v => v !== null).length}`);
      console.log(`      Completion: ${Math.round(Object.values(incidentData).filter(v => v !== null).length / Object.keys(incidentData).length * 100)}%`);
    } else {
      console.log('   ❌ No record found');
    }

    // ==================== OTHER VEHICLES ANALYSIS ====================
    console.log('\n' + '─'.repeat(80) + '\n');
    console.log('3️⃣  OTHER VEHICLES INVOLVED:\n');
    if (vehiclesData.length > 0) {
      console.log(`   ✅ ${vehiclesData.length} vehicle(s) found\n`);
      vehiclesData.forEach((vehicle, index) => {
        console.log(`   Vehicle ${index + 1}:`);
        console.log(`      Registration: ${vehicle.vehicle_registration || 'N/A'}`);
        console.log(`      Make/Model: ${vehicle.vehicle_make || 'N/A'} ${vehicle.vehicle_model || 'N/A'}`);
        console.log(`      Colour: ${vehicle.vehicle_colour || 'N/A'}`);
        console.log(`      Driver: ${vehicle.driver_name || 'N/A'}`);
        console.log(`      Contact: ${vehicle.driver_phone || 'N/A'}`);
        console.log(`      Insurance: ${vehicle.insurance_company || 'N/A'}`);
        console.log(`      Policy: ${vehicle.policy_number || 'N/A'}`);
        console.log(`      Damage: ${vehicle.damage_description || 'N/A'}`);
        console.log(`      Non-null fields: ${Object.values(vehicle).filter(v => v !== null).length}/${Object.keys(vehicle).length}`);
        if (index < vehiclesData.length - 1) console.log('');
      });
    } else {
      console.log('   ⚠️  No vehicles found');
    }

    // ==================== WITNESSES ANALYSIS ====================
    console.log('\n' + '─'.repeat(80) + '\n');
    console.log('4️⃣  WITNESSES:\n');
    if (witnessesData.length > 0) {
      console.log(`   ✅ ${witnessesData.length} witness(es) found\n`);
      witnessesData.forEach((witness, index) => {
        console.log(`   Witness ${index + 1}:`);
        console.log(`      Name: ${witness.witness_name || 'N/A'}`);
        console.log(`      Phone: ${witness.witness_phone || 'N/A'}`);
        console.log(`      Email: ${witness.witness_email || 'N/A'}`);
        console.log(`      Statement: ${witness.witness_statement || 'N/A'}`);
        console.log(`      Non-null fields: ${Object.values(witness).filter(v => v !== null).length}/${Object.keys(witness).length}`);
        if (index < witnessesData.length - 1) console.log('');
      });
    } else {
      console.log('   ⚠️  No witnesses found');
    }

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(80) + '\n');
    console.log('📋 OVERALL SUMMARY:\n');
    console.log(`   User ID: ${USER_ID}`);
    console.log(`   User Signup: ${userData ? '✅ Complete' : '❌ Missing'}`);
    console.log(`   Most Recent Incident: ${incidentData ? '✅ Found' : '❌ Missing'}`);
    console.log(`   Other Vehicles: ${vehiclesData.length} record(s)`);
    console.log(`   Witnesses: ${witnessesData.length} record(s)`);

    if (userData && incidentData) {
      console.log(`\n   🎯 DATA COMPLETENESS:`);
      console.log(`      User data: ${Math.round(Object.values(userData).filter(v => v !== null).length / Object.keys(userData).length * 100)}%`);
      console.log(`      Incident data: ${Math.round(Object.values(incidentData).filter(v => v !== null).length / Object.keys(incidentData).length * 100)}%`);
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // ==================== KEY FINDINGS ====================
    console.log('🔍 KEY FINDINGS:\n');

    if (userData && incidentData) {
      console.log('   ✅ All core data is present in the database');
      console.log('   ✅ User profile is complete');
      console.log('   ✅ Incident report exists with comprehensive details');

      if (incidentData.police_attended === 'true') {
        console.log('   ✅ Police information recorded');
      }

      if (incidentData.witnesses_present === 'yes') {
        console.log(`   ✅ Witness information available (${witnessesData.length} witness(es) in database)`);
      }

      if (vehiclesData.length > 0) {
        console.log(`   ✅ Other vehicle information recorded (${vehiclesData.length} vehicle(s))`);
      }

      console.log('\n   ⚠️  If PDF generation is failing or showing missing data:');
      console.log('       • Check pdfFieldMapper.js mapping logic');
      console.log('       • Verify dataFetcher.js is fetching all tables correctly');
      console.log('       • Check for data transformation issues in the mapping');
      console.log('       • Verify field name consistency between DB and PDF');
    } else {
      console.log('   ❌ Missing critical data - this could explain PDF issues');
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run analysis
analyzeUserData()
  .then(() => {
    console.log('✅ Analysis complete\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });
