#!/usr/bin/env node

/**
 * Test Emergency User Existence
 *
 * Checks if the user exists in user_signup table and has emergency contact info
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const userId = '1048b3ac-11ec-4e98-968d-9de28183a84d';
const email = 'ian.ring@sky.com';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkUser() {
  console.log('========================================');
  console.log('🔍 Emergency Contact User Check');
  console.log('========================================');
  console.log('User UUID:', userId);
  console.log('Email:', email);
  console.log('');

  // Check by UUID
  console.log('📍 Checking user_signup by UUID...');
  const { data: uuidData, error: uuidError } = await supabase
    .from('user_signup')
    .select('create_user_id, email, name, surname, emergency_contact, recovery_breakdown_number')
    .eq('create_user_id', userId)
    .single();

  if (uuidError) {
    console.log('❌ Error finding user by UUID:', uuidError.message);
    console.log('   Error code:', uuidError.code);
    if (uuidError.details) {
      console.log('   Details:', uuidError.details);
    }
    console.log('');
  }

  if (uuidData) {
    console.log('✅ User found by UUID:');
    console.log('   Email:', uuidData.email);
    console.log('   Name:', `${uuidData.name || ''} ${uuidData.surname || ''}`);
    console.log('   Emergency Contact:', uuidData.emergency_contact || 'NOT SET');
    console.log('   Recovery Number:', uuidData.recovery_breakdown_number || 'NOT SET');
    console.log('');
  } else {
    console.log('❌ No user found by UUID');
    console.log('');

    // Try finding by email
    console.log('📍 Checking user_signup by email...');
    const { data: emailData, error: emailError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('email', email);

    if (emailError) {
      console.log('❌ Error finding user by email:', emailError.message);
    } else if (emailData && emailData.length > 0) {
      console.log('✅ Found', emailData.length, 'user(s) by email:');
      emailData.forEach((user, index) => {
        console.log('');
        console.log(`   User ${index + 1}:`);
        console.log('   UUID:', user.create_user_id);
        console.log('   Email:', user.email);
        console.log('   Name:', `${user.name || ''} ${user.surname || ''}`);
        console.log('   Emergency Contact:', user.emergency_contact || 'NOT SET');
        console.log('   Recovery Number:', user.recovery_breakdown_number || 'NOT SET');
      });
    } else {
      console.log('❌ No user found by email either');
    }
  }

  console.log('');
  console.log('========================================');
}

checkUser()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test script error:', error);
    process.exit(1);
  });
