/**
 * Check user_documents table columns in Supabase
 * Quick script to see what URL-related columns exist
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
  console.log('🔍 Checking user_documents table columns...\n');

  try {
    // Get one record to see all columns
    const { data, error } = await supabase
      .from('user_documents')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    if (data) {
      console.log('📋 user_documents columns from actual record:');
      const columns = Object.keys(data).sort();

      // Highlight URL-related columns
      const urlColumns = columns.filter(col =>
        col.includes('url') || col.includes('path') || col.includes('bucket')
      );

      console.log('\n🔗 URL/Storage-related columns:');
      urlColumns.forEach(col => {
        const value = data[col];
        const type = typeof value;
        const sample = value ? (type === 'string' ? value.substring(0, 50) : value) : 'null';
        console.log(`   ✓ ${col} (${type}): ${sample}`);
      });

      console.log('\n📋 All columns:');
      columns.forEach(col => {
        console.log(`   - ${col}`);
      });
    } else {
      console.log('⚠️  No records found in user_documents table');
      console.log('   This is expected for a new database or after cleanup');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkColumns()
  .then(() => console.log('\n✅ Column check complete'))
  .catch(error => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
