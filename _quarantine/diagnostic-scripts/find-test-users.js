#!/usr/bin/env node

/**
 * Find Valid Test Users
 * Queries database for existing users to use in test scripts
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findTestUsers() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          FIND VALID TEST USERS                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get recent users from user_signup table
    const { data: users, error } = await supabase
      .from('user_signup')
      .select('create_user_id, email, name, surname, created_at')
      .not('email', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error querying database:', error.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ No users found in database\n');
      return;
    }

    console.log(`✅ Found ${users.length} users:\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email || '[NO EMAIL]'}`);
      console.log(`   User ID: ${user.create_user_id}`);
      console.log(`   Name: ${user.name || '[NONE]'} ${user.surname || '[NONE]'}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString('en-GB')}\n`);
    });

    // Check for the specific test user email
    const testEmail = 'ringo1967@gmail.com';
    const testUser = users.find(u => u.email === testEmail);

    if (testUser) {
      console.log(`\n✅ Test email "${testEmail}" exists in database!`);
      console.log(`   User ID: ${testUser.create_user_id}\n`);
    } else {
      console.log(`\n⚠️  Test email "${testEmail}" NOT found in database`);
      console.log(`   Available test emails to use:\n`);
      users.slice(0, 3).forEach((user, idx) => {
        if (user.email) {
          console.log(`   ${idx + 1}. ${user.email}`);
        }
      });
      console.log('');
    }

    // Check if these users exist in Supabase Auth
    console.log('🔐 Checking Supabase Auth status:\n');
    for (const user of users.slice(0, 3)) {
      if (user.email) {
        const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
        if (authUser && authUser.users) {
          const existsInAuth = authUser.users.some(au => au.email === user.email);
          console.log(`   ${user.email}: ${existsInAuth ? '✅ Auth user exists' : '❌ No auth user'}`);
        }
      }
    }
    console.log('');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

findTestUsers().catch(console.error);
