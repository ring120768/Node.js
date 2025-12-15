#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  const userId = '9db03736-74ac-4d00-9ae2-3639b58360a3';

  const { data, error } = await supabase
    .from('user_signup')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('='.repeat(60));
  console.log('DATABASE FIELDS WITH NULL/EMPTY VALUES:');
  console.log('='.repeat(60));

  const emptyFields = [];
  const populatedFields = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === '') {
      emptyFields.push(key);
    } else {
      populatedFields.push({ key, value });
    }
  }

  emptyFields.forEach(field => {
    console.log(`  ❌ ${field}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('DATABASE FIELDS WITH VALUES:');
  console.log('='.repeat(60));

  populatedFields.forEach(({ key, value }) => {
    const displayValue = typeof value === 'string' && value.length > 50
      ? value.substring(0, 47) + '...'
      : value;
    console.log(`  ✅ ${key}: ${displayValue}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`SUMMARY:`);
  console.log(`  Total fields: ${Object.keys(data).length}`);
  console.log(`  Populated: ${populatedFields.length}`);
  console.log(`  Empty: ${emptyFields.length}`);
  console.log('='.repeat(60));
}

checkData().catch(console.error);
