/**
 * Check user_documents table structure for image storage
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserDocumentsStructure() {
  console.log('🔍 Checking user_documents Table Structure...\n');

  const { data, error } = await supabase
    .from('user_documents')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  const columns = data && data.length > 0
    ? Object.keys(data[0])
    : [];

  console.log('📊 user_documents columns:\n');
  columns.forEach(col => {
    console.log(`  - ${col}`);
  });

  console.log(`\n✅ Total: ${columns.length} columns`);

  // Check for document_type or field_name column
  const hasDocType = columns.includes('document_type');
  const hasFieldName = columns.includes('field_name');

  console.log('\n🔍 Image Categorization:');
  console.log(`  - document_type column: ${hasDocType ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`  - field_name column: ${hasFieldName ? '✅ EXISTS' : '❌ MISSING'}`);
}

checkUserDocumentsStructure()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
