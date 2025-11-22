#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = '1048b3ac-11ec-4e98-968d-9de28183a84d';

async function checkAuth() {
  console.log(`\nChecking Supabase Auth for user: ${USER_ID}\n`);
  
  const { data: authUser, error } = await supabase.auth.admin.getUserById(USER_ID);
  
  if (error) {
    console.log(`❌ Auth Error: ${error.message}\n`);
  } else if (!authUser || !authUser.user) {
    console.log('❌ No Supabase Auth user found\n');
  } else {
    console.log('✅ Supabase Auth User EXISTS');
    console.log(`Email: ${authUser.user.email}`);
    console.log(`Created: ${new Date(authUser.user.created_at).toLocaleString()}`);
    console.log(`Last Sign In: ${authUser.user.last_sign_in_at ? new Date(authUser.user.last_sign_in_at).toLocaleString() : 'Never'}`);
    console.log(`Email Confirmed: ${authUser.user.email_confirmed_at ? 'Yes' : 'No'}\n`);
  }
}

checkAuth().catch(console.error);
