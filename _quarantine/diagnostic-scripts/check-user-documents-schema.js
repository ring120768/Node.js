#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          CHECK user_documents SCHEMA                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Get a sample record to see the schema
  const { data, error } = await supabase
    .from('user_documents')
    .select('*')
    .limit(1);

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log('Sample record columns:\n');
    Object.keys(data[0]).forEach(key => {
      console.log(`   ${key}: ${typeof data[0][key]}`);
    });
    console.log('\n');
    console.log('Full record:\n', JSON.stringify(data[0], null, 2));
  } else {
    console.log('No records found in user_documents');
  }

  // Also check recent records
  console.log('\n\n📋 Recent user_documents records (last 24 hours):\n');
  
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: recent, error: recentError } = await supabase
    .from('user_documents')
    .select('id, storage_path, original_filename, status, created_at, create_user_id')
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false });

  if (recentError) {
    console.log('❌ Error:', recentError.message);
    return;
  }

  console.log(`Found ${recent.length} recent records\n`);
  
  recent.forEach((rec, idx) => {
    console.log(`${idx + 1}. ${rec.original_filename || 'N/A'}`);
    console.log(`   ID: ${rec.id}`);
    console.log(`   Path: ${rec.storage_path}`);
    console.log(`   Status: ${rec.status}`);
    console.log(`   User: ${rec.create_user_id}`);
    console.log(`   Created: ${rec.created_at}\n`);
  });
}

checkSchema().catch(console.error);
