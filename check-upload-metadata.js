#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking most recent upload metadata...\n');

  const { data, error } = await supabase
    .from('user_documents')
    .select('*')
    .eq('create_user_id', 'adeedf9d-fe8e-43c9-80d1-30db3c226522')
    .eq('document_type', 'driving_license_picture')
    .single();

  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log('Full record:');
    console.log(JSON.stringify(data, null, 2));
  }
})().catch(console.error);
