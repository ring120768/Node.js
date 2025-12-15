#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSignedUrl() {
  // Try to select signed_url field
  const { data, error } = await supabase
    .from('user_documents')
    .select('id, storage_path, public_url, signed_url')
    .limit(1);

  if (error) {
    if (error.message.includes('signed_url')) {
      console.log('❌ signed_url field does NOT exist in user_documents table');
    } else {
      console.error('Error:', error.message);
    }
  } else {
    console.log('✅ Query successful. Fields available:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

checkSignedUrl().catch(console.error);
