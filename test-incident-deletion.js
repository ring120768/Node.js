/**
 * Test Incident Deletion
 *
 * Diagnostic script to check:
 * 1. Which user ID columns are populated in incident_reports
 * 2. Whether deleted_at is being set correctly
 * 3. Why soft-deleted records might still appear
 *
 * Usage: node test-incident-deletion.js <user-uuid>
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function testIncidentDeletion(userId) {
  console.log('\n🔍 Incident Deletion Diagnostic\n');
  console.log('='.repeat(80) + '\n');

  try {
    // Step 1: Check ALL incident reports for this user (including soft-deleted)
    console.log(`${colors.blue}📊 Step 1: Checking ALL incident reports (including deleted)${colors.reset}\n`);

    const { data: allReports, error: allError } = await supabase
      .from('incident_reports')
      .select('id, auth_user_id, create_user_id, user_id, deleted_at, created_at')
      .or(`auth_user_id.eq.${userId},create_user_id.eq.${userId},user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (allError) {
      console.log(`${colors.red}❌ Error:${colors.reset}`, allError.message);
      return;
    }

    if (!allReports || allReports.length === 0) {
      console.log(`${colors.yellow}⚠️  No incident reports found for user ${userId}${colors.reset}`);
      console.log(`\n${colors.blue}ℹ️  This could mean:${colors.reset}`);
      console.log('  1. User has never created an incident report');
      console.log('  2. User ID is incorrect');
      console.log('  3. Records use a different user ID field\n');
      return;
    }

    console.log(`${colors.green}✅ Found ${allReports.length} incident report(s)${colors.reset}\n`);

    // Analyze each report
    let softDeleted = 0;
    let active = 0;

    console.log('REPORT ANALYSIS:');
    console.log('-'.repeat(80));

    allReports.forEach((report, index) => {
      const num = index + 1;
      const isDeleted = report.deleted_at !== null;

      if (isDeleted) {
        softDeleted++;
        console.log(`\n${colors.red}❌ Report ${num}: SOFT-DELETED${colors.reset}`);
      } else {
        active++;
        console.log(`\n${colors.green}✅ Report ${num}: ACTIVE${colors.reset}`);
      }

      console.log(`   ID: ${report.id}`);
      console.log(`   Created: ${new Date(report.created_at).toLocaleString('en-GB')}`);
      console.log(`   User ID Fields:`);
      console.log(`     - auth_user_id: ${report.auth_user_id || '(null)'}`);
      console.log(`     - create_user_id: ${report.create_user_id || '(null)'}`);
      console.log(`     - user_id: ${report.user_id || '(null)'}`);

      if (isDeleted) {
        console.log(`   ${colors.red}Deleted At: ${new Date(report.deleted_at).toLocaleString('en-GB')}${colors.reset}`);
      } else {
        console.log(`   Deleted At: (null) - ACTIVE`);
      }

      // Check which user ID field matches
      const matches = [];
      if (report.auth_user_id === userId) matches.push('auth_user_id');
      if (report.create_user_id === userId) matches.push('create_user_id');
      if (report.user_id === userId) matches.push('user_id');

      console.log(`   Matches: ${matches.length > 0 ? matches.join(', ') : 'NONE (⚠️ Problem!)'}`);
    });

    console.log('\n' + '-'.repeat(80));
    console.log(`\n${colors.blue}📊 SUMMARY:${colors.reset}`);
    console.log(`   Total Reports: ${allReports.length}`);
    console.log(`   Active (deleted_at = null): ${colors.green}${active}${colors.reset}`);
    console.log(`   Soft-Deleted (deleted_at set): ${colors.red}${softDeleted}${colors.reset}`);

    // Step 2: Check what the dashboard API would return
    console.log(`\n\n${colors.blue}📊 Step 2: Simulating Dashboard Query (excludes deleted)${colors.reset}\n`);

    const { data: visibleReports, error: visibleError } = await supabase
      .from('incident_reports')
      .select('id, deleted_at')
      .or(`auth_user_id.eq.${userId},create_user_id.eq.${userId},user_id.eq.${userId}`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (visibleError) {
      console.log(`${colors.red}❌ Error:${colors.reset}`, visibleError.message);
      return;
    }

    console.log(`${colors.green}✅ Dashboard would show ${visibleReports.length} report(s)${colors.reset}\n`);

    if (visibleReports.length > 0) {
      console.log('Visible Report IDs:');
      visibleReports.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.id}`);
      });
    }

    // Step 3: Recommendations
    console.log(`\n\n${colors.blue}💡 RECOMMENDATIONS:${colors.reset}\n`);

    if (softDeleted > 0 && visibleReports.length === 0) {
      console.log(`${colors.green}✅ DELETION IS WORKING CORRECTLY${colors.reset}`);
      console.log('   - Records are soft-deleted (deleted_at is set)');
      console.log('   - Dashboard query correctly excludes them');
      console.log('   - If you see them in Supabase, that\'s normal (soft delete)');
      console.log('   - If you see them on dashboard, try hard refresh (Cmd+Shift+R)\n');
    } else if (active > 0 && visibleReports.length > 0) {
      console.log(`${colors.yellow}⚠️  RECORDS ARE STILL ACTIVE${colors.reset}`);
      console.log('   - deleted_at is NULL (not soft-deleted)');
      console.log('   - This means deletion didn\'t work or wasn\'t called');
      console.log('\n   Possible causes:');
      console.log('   1. Deletion API wasn\'t called');
      console.log('   2. User ID mismatch (check matches above)');
      console.log('   3. RLS policy blocked the update');
      console.log('   4. JavaScript error prevented deletion\n');

      console.log(`${colors.blue}ℹ️  To fix:${colors.reset}`);
      console.log('   1. Check browser console (F12) for JavaScript errors');
      console.log('   2. Check server logs for deletion API errors');
      console.log('   3. Try deletion again from dashboard');
      console.log('   4. Run: node test-manual-deletion.js <user-uuid> <report-id>\n');
    }

  } catch (err) {
    console.error(`${colors.red}❌ Test error:${colors.reset}`, err.message);
  }
}

// Get user ID from command line
const userId = process.argv[2];

if (!userId) {
  console.log(`${colors.yellow}Usage: node test-incident-deletion.js <user-uuid>${colors.reset}\n`);
  process.exit(1);
}

testIncidentDeletion(userId);
