#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data } = await supabase
    .from('user_documents')
    .select('document_type, document_category')
    .eq('create_user_id', '199d9251-b2e0-40a5-80bf-fc1529d9bf6c');

  console.log('Document types and categories in database:');
  console.log(JSON.stringify(data, null, 2));
})();