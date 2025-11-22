/**
 * Check temp_uploads table structure for image storage
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStructure() {
  console.log('🔍 Checking temp_uploads Table Structure...\n');

  // Try to select from table
  const { data: rows, error: selectError } = await supabase
    .from('temp_uploads')
    .select('*')
    .limit(1);

  if (selectError) {
    console.error('❌ Error:', selectError.message);
    process.exit(1);
  }

  const columns = rows && rows.length > 0
    ? Object.keys(rows[0])
    : [];

  console.log('📊 temp_uploads columns:\n');
  columns.forEach(col => {
    console.log(`  - ${col}`);
  });

  console.log(`\n✅ Total: ${columns.length} columns`);

  // Check for document_type or field_name column
  const hasFieldName = columns.includes('field_name');
  const hasDocType = columns.includes('document_type');

  console.log('\n🔍 Image Categorization:');
  console.log(`  - field_name column: ${hasFieldName ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`  - document_type column: ${hasDocType ? '✅ EXISTS' : '❌ MISSING'}`);
}

checkStructure()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
