#!/usr/bin/env node

/**
 * Find User for Dashboard Testing
 *
 * Searches for any existing user in the database that can be used for testing
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findTestUser() {
  console.log('\n🔍 Searching for users in database...\n');

  // Try to find ANY user in user_signup table
  const { data: signupUsers, error: signupError } = await supabase
    .from('user_signup')
    .select('*')
    .limit(10);

  console.log('user_signup table:');
  if (signupError) {
    console.log('  ❌ Error:', signupError.message);
  } else {
    console.log(`  Found ${signupUsers?.length || 0} users`);
    if (signupUsers && signupUsers.length > 0) {
      signupUsers.forEach(user => {
        console.log(`\n  User: ${user.email || user.create_user_id}`);
        console.log(`  ID: ${user.create_user_id}`);
        console.log(`  Name: ${user.first_name} ${user.last_name}`);
      });
    }
  }

  // Try auth.users table
  console.log('\n\nauth.users table:');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.log('  ❌ Error:', authError.message);
  } else {
    console.log(`  Found ${authUsers?.users?.length || 0} auth users`);
    if (authUsers?.users && authUsers.users.length > 0) {
      authUsers.users.forEach(user => {
        console.log(`\n  User: ${user.email}`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Created: ${new Date(user.created_at).toLocaleString('en-GB')}`);
      });
    }
  }

  console.log('\n\n📌 Dashboard Test Instructions:\n');
  console.log('If users exist above, you can test the dashboard by:');
  console.log('1. Start server: npm start');
  console.log('2. Go to http://localhost:5000/signup-form.html');
  console.log('3. Create a test account (or login if you have credentials)');
  console.log('4. Navigate to /dashboard.html');
  console.log('5. Dashboard will display your data\n');
}

findTestUser().catch(console.error);
