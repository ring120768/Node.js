#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking for users in user_signup table...\n');

  const { data, error } = await supabase
    .from('user_signup')
    .select('create_user_id, driver_name, driver_surname, driver_email, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.log('❌ Error:', error.message);
  } else if (!data || data.length === 0) {
    console.log('⚠️  No users found in user_signup table');
    console.log('   This means the signup process did not complete successfully.');
    console.log('   Only temp uploads were created, but the user never submitted the form.\n');
  } else {
    console.log(`✅ Found ${data.length} users:\n`);
    data.forEach((u, i) => {
      console.log(`${i+1}. ${u.driver_name} ${u.driver_surname} (${u.driver_email})`);
      console.log(`   ID: ${u.create_user_id}`);
      console.log(`   Created: ${new Date(u.created_at).toLocaleString()}\n`);
    });
  }
})().catch(console.error);
