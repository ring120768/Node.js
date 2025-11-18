#!/usr/bin/env node

/**
 * Check Recent User Signups
 *
 * Lists all user_signup records created in the last 24 hours
 * to identify the most recent signup attempt
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRecentSignups() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║              RECENT USER SIGNUPS (Last 24 Hours)               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get signups from last 24 hours
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: signups, error } = await supabase
      .from('user_signup')
      .select('create_user_id, email, name, surname, are_you_safe, safety_status, created_at, updated_at')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }

    if (!signups || signups.length === 0) {
      console.log('No signups found in the last 24 hours.\n');
      return;
    }

    console.log(`Found ${signups.length} signup(s) in the last 24 hours:\n`);

    for (const signup of signups) {
      console.log('─'.repeat(70));
      console.log(`User ID: ${signup.create_user_id}`);
      console.log(`Email: ${signup.email}`);
      console.log(`Name: ${signup.name} ${signup.surname}`);
      console.log(`Created: ${new Date(signup.created_at).toLocaleString()}`);
      console.log(`Updated: ${new Date(signup.updated_at).toLocaleString()}`);
      console.log(`\nSafety Check:`);
      console.log(`  - are_you_safe: ${signup.are_you_safe === true ? '✅ TRUE' : signup.are_you_safe === false ? '❌ FALSE' : '⚪ NULL (not completed)'}`);
      console.log(`  - safety_status: ${signup.safety_status || 'NULL'}`);
      console.log('');
    }

    console.log('─'.repeat(70));
    console.log('\n💡 TIP: Run "node check-user-auth-status.js" with a specific user ID to check details\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

checkRecentSignups().catch(console.error);
