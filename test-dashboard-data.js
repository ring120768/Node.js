#!/usr/bin/env node

/**
 * Dashboard Data Test Script
 *
 * Tests that dashboard can fetch and display real Supabase data
 * Verifies all API endpoints return valid data
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m'
};

// Import environment variables
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log(colors.red, '❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDashboardData() {
  console.log(colors.cyan + colors.bold, '\n🧪 Testing Dashboard Data Integration\n');
  console.log(colors.reset + '='.repeat(60));

  // Step 1: Find a test user with data
  console.log(colors.cyan, '\n📊 Step 1: Finding test user with data...\n');

  const { data: users, error: usersError } = await supabase
    .from('user_signup')
    .select('create_user_id, email, first_name, last_name')
    .not('create_user_id', 'is', null)
    .limit(5);

  if (usersError || !users || users.length === 0) {
    console.log(colors.red, '❌ No users found in database');
    console.log(colors.yellow, '\nCreate a test user first via signup form\n');
    process.exit(1);
  }

  const testUser = users[0];
  console.log(colors.green, `✅ Found test user: ${testUser.email}`);
  console.log(colors.reset, `   User ID: ${testUser.create_user_id}`);

  // Step 2: Test profile data fetch
  console.log(colors.cyan, '\n📊 Step 2: Testing profile data fetch...\n');

  const { data: profile, error: profileError } = await supabase
    .from('user_signup')
    .select('first_name, last_name, phone, email, vehicle_registration_number, make, model, colour, created_at')
    .eq('create_user_id', testUser.create_user_id)
    .single();

  if (profileError) {
    console.log(colors.red, `❌ Profile fetch failed: ${profileError.message}`);
  } else {
    console.log(colors.green, '✅ Profile data loaded');
    console.log(colors.reset, '   Name:', profile.first_name, profile.last_name);
    console.log('   Vehicle:', profile.make || 'Not set', profile.model || '');
  }

  // Step 3: Test incidents API
  console.log(colors.cyan, '\n📊 Step 3: Testing incidents API...\n');

  try {
    const incidentsResponse = await fetch(`http://localhost:5000/api/incident-reports?user_id=${testUser.create_user_id}`);
    const incidentsData = await incidentsResponse.json();

    if (incidentsData.success && incidentsData.incidents.length > 0) {
      console.log(colors.green, `✅ Incidents API working: ${incidentsData.incidents.length} incidents found`);
      const latest = incidentsData.incidents[0];
      console.log(colors.reset, '   Latest incident:', latest.incidentId);
      console.log('   Status:', latest.status);
    } else {
      console.log(colors.yellow, '⚠️  No incidents found for this user');
    }
  } catch (error) {
    console.log(colors.red, `❌ Incidents API error: ${error.message}`);
    console.log(colors.yellow, '   Make sure server is running: npm start');
  }

  // Step 4: Test documents API
  console.log(colors.cyan, '\n📊 Step 4: Testing documents API...\n');

  try {
    const docsResponse = await fetch(`http://localhost:5000/api/user-documents?user_id=${testUser.create_user_id}&limit=10`);
    const docsData = await docsResponse.json();

    if (docsData.success && docsData.documents.length > 0) {
      console.log(colors.green, `✅ Documents API working: ${docsData.documents.length} documents found`);
      const imageTypes = docsData.documents.filter(d => d.document_type.includes('picture')).length;
      const videoTypes = docsData.documents.filter(d => d.document_type.includes('video')).length;
      console.log(colors.reset, `   Images: ${imageTypes}, Videos: ${videoTypes}`);
    } else {
      console.log(colors.yellow, '⚠️  No documents found for this user');
    }
  } catch (error) {
    console.log(colors.red, `❌ Documents API error: ${error.message}`);
  }

  // Step 5: Test transcriptions API
  console.log(colors.cyan, '\n📊 Step 5: Testing transcriptions API...\n');

  try {
    const transResponse = await fetch(`http://localhost:5000/api/transcription/history?user_id=${testUser.create_user_id}`);
    const transData = await transResponse.json();

    if (transData.success && transData.transcriptions.length > 0) {
      console.log(colors.green, `✅ Transcriptions API working: ${transData.transcriptions.length} transcriptions found`);
      const completed = transData.transcriptions.filter(t => t.status === 'completed').length;
      console.log(colors.reset, `   Completed: ${completed}`);
    } else {
      console.log(colors.yellow, '⚠️  No transcriptions found for this user');
    }
  } catch (error) {
    console.log(colors.red, `❌ Transcriptions API error: ${error.message}`);
  }

  // Step 6: Test PDF reports API
  console.log(colors.cyan, '\n📊 Step 6: Testing PDF reports API...\n');

  try {
    const pdfResponse = await fetch(`http://localhost:5000/api/pdf/status/${testUser.create_user_id}`);
    const pdfData = await pdfResponse.json();

    if (pdfData.success && pdfData.reports && pdfData.reports.length > 0) {
      console.log(colors.green, `✅ PDF reports API working: ${pdfData.reports.length} reports found`);
      console.log(colors.reset, '   Latest:', new Date(pdfData.reports[0].generated_at).toLocaleDateString('en-GB'));
    } else {
      console.log(colors.yellow, '⚠️  No PDF reports found for this user');
    }
  } catch (error) {
    console.log(colors.red, `❌ PDF reports API error: ${error.message}`);
  }

  // Summary
  console.log(colors.cyan + colors.bold, '\n📊 TEST SUMMARY\n');
  console.log(colors.reset + '='.repeat(60));
  console.log(colors.green, '\n✅ Dashboard integration test complete!\n');
  console.log(colors.reset, 'Test user for manual browser testing:');
  console.log(colors.cyan, `   User ID: ${testUser.create_user_id}`);
  console.log(`   Email: ${testUser.email}\n`);
  console.log(colors.yellow, '📌 Next steps:');
  console.log(colors.reset, '   1. Start server: npm start');
  console.log('   2. Login with test user credentials');
  console.log('   3. Navigate to /dashboard.html');
  console.log('   4. Verify cards display with real data\n');
}

testDashboardData().catch(err => {
  console.error(colors.red, '\n❌ Fatal error:', err.message);
  console.error(colors.reset, err.stack);
  process.exit(1);
});
