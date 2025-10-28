#!/usr/bin/env node
/**
 * Check user_documents table schema and sample data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('\n📊 Checking user_documents table schema...\n');

  // Get sample document
  const { data, error } = await supabase
    .from('user_documents')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No documents found');
    return;
  }

  console.log('✅ Sample document structure:');
  console.log(JSON.stringify(data[0], null, 2));
  
  console.log('\n📋 Available fields:');
  Object.keys(data[0]).forEach(key => {
    console.log(`  - ${key}: ${typeof data[0][key]}`);
  });
}

checkSchema().catch(console.error);
