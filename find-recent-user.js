#!/usr/bin/env node
/**
 * Find Recent User with Data
 * Locate the most recent user who completed signup
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m'
};

async function findRecentUser() {
  console.log(colors.cyan, '\n🔍 Finding Recent User with Signup Data\n');

  try {
    // Find most recent user signup
    const { data: users, error } = await supabase
      .from('user_signup')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log(colors.red, '❌ Error:', error.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log(colors.red, '❌ No users found in user_signup table');
      return;
    }

    console.log(colors.green, `✅ Found ${users.length} recent users:\n`);

    for (const user of users) {
      console.log(colors.cyan, '━'.repeat(60));
      console.log(colors.green, `User: ${user.email}`);
      console.log(colors.dim, `ID: ${user.create_user_id}`);
      console.log(colors.dim, `Name: ${user.name} ${user.surname}`);
      console.log(colors.dim, `Created: ${user.created_at}`);
      console.log(colors.dim, `Vehicle: ${user.vehicle_make || 'N/A'} ${user.vehicle_model || ''}`);
      console.log(colors.dim, `DVLA Fields: ${user.vehicle_make ? 'Populated ✅' : 'Empty ❌'}`);

      // Check for documents
      const { count: docCount } = await supabase
        .from('user_documents')
        .select('*', { count: 'exact' })
        .eq('create_user_id', user.create_user_id)
        .is('deleted_at', null);

      console.log(colors.dim, `Documents: ${docCount}`);

      // Check for temp uploads
      const { count: tempCount } = await supabase
        .from('temp_uploads')
        .select('*', { count: 'exact' })
        .eq('session_user_id', user.create_user_id);

      if (tempCount > 0) {
        console.log(colors.yellow, `⚠️  ${tempCount} temp uploads (not moved to permanent storage)`);
      }

      // Check for GDPR audit logs (in storage)
      const { data: auditLogs, error: auditError } = await supabase.storage
        .from('gdpr-audit-logs')
        .list(`${user.create_user_id}/gdpr-audit`);

      if (auditError) {
        console.log(colors.red, `GDPR audit logs: Error - ${auditError.message}`);
      } else {
        console.log(colors.dim, `GDPR audit logs: ${auditLogs?.length || 0}`);
      }

      console.log('');
    }

    // Recommendation
    console.log(colors.cyan, '\n📝 Recommendation:');
    const latestUser = users[0];
    console.log(colors.dim, `\nUpdate dashboard.html line 1161 with:`);
    console.log(colors.green, `  id: '${latestUser.create_user_id}',`);
    console.log(colors.green, `  email: '${latestUser.email}',`);
    console.log(colors.green, `  fullName: '${latestUser.name} ${latestUser.surname}'`);
    console.log('');

  } catch (error) {
    console.log(colors.red, '\n❌ Fatal error:', error.message);
  }
}

findRecentUser().catch(console.error);
