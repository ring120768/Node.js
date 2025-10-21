#!/usr/bin/env node

/**
 * Find Test User Script
 * Helps find a suitable test user for dashboard testing
 * Run: node scripts/find-test-user.js
 */

const config = require('../src/config');
const fetch = require('node-fetch');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function findTestUsers() {
  const supabaseUrl = config.supabase.url;
  const serviceKey = config.supabase.serviceRoleKey;

  if (!supabaseUrl || !serviceKey) {
    log(colors.yellow, '⚠️  Supabase credentials not configured');
    log(colors.yellow, 'Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  console.log('\n🔍 Finding test users with dashboard data...\n');

  try {
    // Fetch recent users
    const response = await fetch(`${supabaseUrl}/rest/v1/user_signup?select=create_user_id,email_address,full_name,created_at&order=created_at.desc&limit=10`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const users = await response.json();

    if (users.length === 0) {
      log(colors.yellow, '⚠️  No users found in database');
      log(colors.yellow, 'Please create a test account via Typeform or signup page');
      process.exit(1);
    }

    console.log(`Found ${users.length} recent users:\n`);

    // Check data for each user
    for (const user of users) {
      const userId = user.create_user_id;

      // Count documents
      const docsResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_documents?select=*&create_user_id=eq.${userId}&deleted_at=is.null`,
        {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
          }
        }
      );

      const docs = await docsResponse.json();
      const imageCount = docs.filter(d =>
        !d.document_type?.toLowerCase().includes('video') &&
        !d.document_type?.toLowerCase().includes('dashcam')
      ).length;
      const videoCount = docs.filter(d =>
        d.document_type?.toLowerCase().includes('video') ||
        d.document_type?.toLowerCase().includes('dashcam')
      ).length;

      // Count transcriptions
      const transResponse = await fetch(
        `${supabaseUrl}/rest/v1/ai_transcription?select=id&create_user_id=eq.${userId}`,
        {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
          }
        }
      );
      const transcriptions = await transResponse.json();

      // Count PDFs
      const pdfResponse = await fetch(
        `${supabaseUrl}/rest/v1/completed_incident_forms?select=id&create_user_id=eq.${userId}`,
        {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
          }
        }
      );
      const pdfs = await pdfResponse.json();

      // Count reports
      const reportsResponse = await fetch(
        `${supabaseUrl}/rest/v1/incident_reports?select=id&create_user_id=eq.${userId}`,
        {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
          }
        }
      );
      const reports = await reportsResponse.json();

      const totalData = imageCount + videoCount + transcriptions.length + pdfs.length + reports.length;

      // Display user info
      const hasData = totalData > 0;
      const color = hasData ? colors.green : colors.yellow;
      const icon = hasData ? '✅' : '⚠️ ';

      console.log(`${color}${icon} ${user.email_address}${colors.reset}`);
      console.log(`   ID: ${colors.cyan}${userId}${colors.reset}`);
      console.log(`   Name: ${user.full_name || 'N/A'}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleDateString('en-GB')}`);
      console.log(`   Data: ${imageCount} images, ${videoCount} videos, ${transcriptions.length} transcriptions, ${pdfs.length} PDFs, ${reports.length} reports`);
      console.log('');
    }

    // Find best test user (most data)
    const bestUser = users.map(u => {
      return { user: u, score: 0 };
    }).reduce((best, current) => current.score > best.score ? current : best);

    console.log('\n📋 Recommended test user:');
    console.log(`   ${colors.cyan}${bestUser.user.create_user_id}${colors.reset}`);
    console.log(`   Email: ${bestUser.user.email_address}`);
    console.log('');
    console.log('💡 To test dashboard with this user:');
    console.log(`   ${colors.green}node scripts/test-dashboard-api.js ${bestUser.user.create_user_id}${colors.reset}`);
    console.log('');
    console.log('🌐 Or login to dashboard:');
    console.log(`   ${colors.green}http://localhost:5000/dashboard.html${colors.reset}`);
    console.log(`   Email: ${bestUser.user.email_address}`);
    console.log('');

  } catch (error) {
    log(colors.yellow, `❌ Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

findTestUsers();
