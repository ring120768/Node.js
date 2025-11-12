// scripts/query-user-data.js
// Query all data for a specific user from the database

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const USER_ID = '9db03736-74ac-4d00-9ae2-3639b58360a3';

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function queryUserData() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 QUERYING DATABASE FOR USER: ${USER_ID}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // ==================== USER SIGNUP ====================
    console.log('1️⃣  Querying user_signup table...\n');
    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', USER_ID)
      .single();

    if (userError) {
      console.error('❌ Error fetching user_signup:', userError.message);
    } else if (!userData) {
      console.log('⚠️  No data found in user_signup table');
    } else {
      console.log('✅ user_signup data found:');
      console.log(JSON.stringify(userData, null, 2));
      console.log(`\n   Total fields: ${Object.keys(userData).length}`);
      console.log(`   Non-null fields: ${Object.values(userData).filter(v => v !== null).length}`);
    }

    // ==================== INCIDENT REPORTS ====================
    console.log('\n' + '─'.repeat(80) + '\n');
    console.log('2️⃣  Querying incident_reports table...\n');
    const { data: incidentData, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('create_user_id', USER_ID)
      .order('created_at', { ascending: false });

    if (incidentError) {
      console.error('❌ Error fetching incident_reports:', incidentError.message);
    } else if (!incidentData || incidentData.length === 0) {
      console.log('⚠️  No data found in incident_reports table');
    } else {
      console.log(`✅ incident_reports data found (${incidentData.length} record(s)):\n`);
      incidentData.forEach((incident, index) => {
        console.log(`   Record ${index + 1}/${incidentData.length}:`);
        console.log(JSON.stringify(incident, null, 2));
        console.log(`\n   Total fields: ${Object.keys(incident).length}`);
        console.log(`   Non-null fields: ${Object.values(incident).filter(v => v !== null).length}`);
        if (index < incidentData.length - 1) {
          console.log('\n   ' + '·'.repeat(40) + '\n');
        }
      });
    }

    // ==================== INCIDENT OTHER VEHICLES ====================
    console.log('\n' + '─'.repeat(80) + '\n');
    console.log('3️⃣  Querying incident_other_vehicles table...\n');

    let vehiclesData = [];
    if (incidentData && incidentData.length > 0) {
      const latestIncidentId = incidentData[0].id;
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('incident_other_vehicles')
        .select('*')
        .eq('incident_id', latestIncidentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (vehiclesError) {
        console.error('❌ Error fetching incident_other_vehicles:', vehiclesError.message);
      } else if (!vehicles || vehicles.length === 0) {
        console.log('⚠️  No data found in incident_other_vehicles table');
      } else {
        vehiclesData = vehicles;
        console.log(`✅ incident_other_vehicles data found (${vehicles.length} record(s)):\n`);
        vehicles.forEach((vehicle, index) => {
          console.log(`   Vehicle ${index + 1}/${vehicles.length}:`);
          console.log(JSON.stringify(vehicle, null, 2));
          console.log(`\n   Total fields: ${Object.keys(vehicle).length}`);
          console.log(`   Non-null fields: ${Object.values(vehicle).filter(v => v !== null).length}`);
          if (index < vehicles.length - 1) {
            console.log('\n   ' + '·'.repeat(40) + '\n');
          }
        });
      }
    } else {
      console.log('⚠️  No incident found, skipping incident_other_vehicles query');
    }

    // ==================== INCIDENT WITNESSES ====================
    console.log('\n' + '─'.repeat(80) + '\n');
    console.log('4️⃣  Querying incident_witnesses table...\n');

    let witnessesData = [];
    if (incidentData && incidentData.length > 0) {
      const latestIncidentId = incidentData[0].id;
      const { data: witnesses, error: witnessError } = await supabase
        .from('incident_witnesses')
        .select('*')
        .eq('incident_report_id', latestIncidentId)
        .is('deleted_at', null)
        .order('witness_number', { ascending: true });

      if (witnessError) {
        console.error('❌ Error fetching incident_witnesses:', witnessError.message);
      } else if (!witnesses || witnesses.length === 0) {
        console.log('⚠️  No data found in incident_witnesses table');
      } else {
        witnessesData = witnesses;
        console.log(`✅ incident_witnesses data found (${witnesses.length} record(s)):\n`);
        witnesses.forEach((witness, index) => {
          console.log(`   Witness ${index + 1}/${witnesses.length}:`);
          console.log(JSON.stringify(witness, null, 2));
          console.log(`\n   Total fields: ${Object.keys(witness).length}`);
          console.log(`   Non-null fields: ${Object.values(witness).filter(v => v !== null).length}`);
          if (index < witnesses.length - 1) {
            console.log('\n   ' + '·'.repeat(40) + '\n');
          }
        });
      }
    } else {
      console.log('⚠️  No incident found, skipping incident_witnesses query');
    }

    // ==================== USER DOCUMENTS ====================
    console.log('\n' + '─'.repeat(80) + '\n');
    console.log('5️⃣  Querying user_documents table...\n');
    const { data: userDocumentsData, error: userDocsError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', USER_ID)
      .is('deleted_at', null);

    if (userDocsError) {
      console.error('❌ Error fetching user_documents:', userDocsError.message);
    } else if (!userDocumentsData || userDocumentsData.length === 0) {
      console.log('⚠️  No data found in user_documents table');
    } else {
      console.log(`✅ user_documents data found (${userDocumentsData.length} record(s)):\n`);
      userDocumentsData.forEach((doc, index) => {
        console.log(`   Document ${index + 1}/${userDocumentsData.length}:`);
        console.log(JSON.stringify(doc, null, 2));
        if (index < userDocumentsData.length - 1) {
          console.log('\n   ' + '·'.repeat(40) + '\n');
        }
      });
    }

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(80) + '\n');
    console.log('📋 SUMMARY:\n');
    console.log(`   User ID: ${USER_ID}`);
    console.log(`   user_signup: ${userData ? '✅ Found' : '❌ Not found'}`);
    console.log(`   incident_reports: ${incidentData?.length || 0} record(s)`);
    console.log(`   incident_other_vehicles: ${vehiclesData.length} record(s)`);
    console.log(`   incident_witnesses: ${witnessesData.length} record(s)`);
    console.log(`   user_documents: ${userDocumentsData?.length || 0} record(s)`);
    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run the query
queryUserData()
  .then(() => {
    console.log('✅ Query complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Query failed:', error);
    process.exit(1);
  });
