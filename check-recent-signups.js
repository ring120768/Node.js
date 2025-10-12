
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const config = require('./src/config');
const logger = require('./src/utils/logger');

async function checkRecentSignups() {
  console.log('🔍 Checking for recent user signups and webhook activity...\n');
  
  if (!config.supabase.url || !config.supabase.serviceKey) {
    console.log('❌ Supabase not configured');
    return;
  }

  const supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Check recent user_signup records (last 24 hours)
    console.log('📊 Recent user_signup records (last 24 hours):');
    const { data: signups, error: signupError } = await supabase
      .from('user_signup')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (signupError) {
      console.log('❌ Error querying user_signup:', signupError.message);
    } else if (signups && signups.length > 0) {
      signups.forEach((signup, index) => {
        console.log(`\n${index + 1}. User Signup:`);
        console.log(`   ID: ${signup.id}`);
        console.log(`   Email: ${signup.email}`);
        console.log(`   Auth User ID: ${signup.auth_user_id}`);
        console.log(`   Typeform Completed: ${signup.typeform_completed ? '✅ Yes' : '❌ No'}`);
        console.log(`   Created: ${signup.created_at}`);
        console.log(`   First Name: ${signup.first_name || 'N/A'}`);
        console.log(`   Last Name: ${signup.last_name || 'N/A'}`);
        console.log(`   Phone: ${signup.phone || 'N/A'}`);
        console.log(`   Vehicle Registration: ${signup.vehicle_registration || 'N/A'}`);
      });
    } else {
      console.log('   No user signups found in the last 24 hours');
    }

    // Check GDPR audit logs for webhook activity
    console.log('\n📋 Recent GDPR audit logs (webhook activity):');
    const { data: auditLogs, error: auditError } = await supabase
      .from('gdpr_audit_log')
      .select('*')
      .eq('activity_type', 'TYPEFORM_PROFILE_COMPLETION')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(5);

    if (auditError) {
      console.log('❌ Error querying audit logs:', auditError.message);
    } else if (auditLogs && auditLogs.length > 0) {
      auditLogs.forEach((log, index) => {
        console.log(`\n${index + 1}. Webhook Activity:`);
        console.log(`   User ID: ${log.user_id}`);
        console.log(`   Activity: ${log.activity_type}`);
        console.log(`   Timestamp: ${log.timestamp}`);
        console.log(`   Details: ${JSON.stringify(log.activity_details, null, 2)}`);
      });
    } else {
      console.log('   No webhook activity found in audit logs');
    }

    // Check auth.users for recent users
    console.log('\n👤 Recent auth users (last 24 hours):');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Error querying auth users:', authError.message);
    } else if (authUsers && authUsers.users) {
      const recentUsers = authUsers.users.filter(user => {
        const createdAt = new Date(user.created_at);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return createdAt > oneDayAgo;
      });

      if (recentUsers.length > 0) {
        recentUsers.forEach((user, index) => {
          console.log(`\n${index + 1}. Auth User:`);
          console.log(`   ID: ${user.id}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Created: ${user.created_at}`);
          console.log(`   Confirmed: ${user.email_confirmed_at ? '✅ Yes' : '❌ No'}`);
          console.log(`   Metadata: ${JSON.stringify(user.user_metadata, null, 2)}`);
        });
      } else {
        console.log('   No new auth users in the last 24 hours');
      }
    }

  } catch (error) {
    console.log('💥 Error:', error.message);
  }

  console.log('\n=== WEBHOOK TESTING RECOMMENDATIONS ===');
  console.log('1. 🧪 Test webhook manually:');
  console.log('   curl -X POST https://workspace.ring120768.repl.co/api/webhooks/test \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"test": "manual_webhook_test"}\'');
  
  console.log('\n2. 🎭 Simulate Typeform webhook:');
  console.log('   curl -X POST https://workspace.ring120768.repl.co/api/webhooks/simulate-typeform \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"auth_user_id": "test-user-id", "email": "test@example.com"}\'');
  
  console.log('\n3. 🔗 Configure Typeform webhook URL:');
  console.log('   https://workspace.ring120768.repl.co/api/webhooks/signup');
}

checkRecentSignups().catch(console.error);
