#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = '1048b3ac-11ec-4e98-968d-9de28183a84d';

async function checkSafetyStatus() {
  console.log(`\nChecking safety status for user: ${userId}\n`);
  
  const { data, error } = await supabase
    .from('user_signup')
    .select('create_user_id, email, are_you_safe, safety_status, safety_status_timestamp')
    .eq('create_user_id', userId)
    .single();
  
  if (error) {
    console.log(`❌ Error: ${error.message}\n`);
    return;
  }
  
  if (!data) {
    console.log('❌ No user_signup record found\n');
    return;
  }
  
  console.log('📋 Safety Check Status:');
  console.log(`   Email: ${data.email}`);
  console.log(`   are_you_safe: ${data.are_you_safe === null ? 'NULL' : data.are_you_safe}`);
  console.log(`   safety_status: ${data.safety_status || 'NULL'}`);
  console.log(`   safety_status_timestamp: ${data.safety_status_timestamp || 'NULL'}`);
  console.log();
  
  if (data.are_you_safe === true) {
    console.log('✅ User has completed safety check and is marked as safe\n');
  } else if (data.are_you_safe === false) {
    console.log('⚠️  User completed safety check but is NOT safe (needs assistance)\n');
  } else {
    console.log('❌ User has NOT completed safety check (are_you_safe is NULL)\n');
    console.log('🔧 Solution: User must visit /safety-check.html and complete safety assessment\n');
  }
}

checkSafetyStatus().catch(console.error);
