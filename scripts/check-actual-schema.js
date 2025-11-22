/**
 * Check Actual Database Schema
 *
 * Queries Supabase to determine which columns actually exist in problematic tables.
 * This will resolve the schema mismatch causing deletion failures.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTableSchema(tableName) {
  console.log(`\n📊 Checking schema for table: ${tableName}`);
  console.log('='.repeat(60));

  try {
    // Query information_schema to get column details
    const { data, error } = await supabase
      .rpc('get_table_columns', {
        table_name_param: tableName
      });

    if (error) {
      // Fallback: Try to query a single row to infer columns
      console.log('⚠️  RPC not available, using fallback method...');

      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (sampleError) {
        console.error(`❌ Error querying ${tableName}:`, sampleError.message);
        return null;
      }

      if (sampleData && sampleData.length > 0) {
        const columns = Object.keys(sampleData[0]);
        console.log('✅ Columns found (from sample row):');
        columns.forEach(col => console.log(`   - ${col}`));

        // Check for specific columns we care about
        const userIdColumns = columns.filter(col =>
          col.includes('user_id') || col === 'auth_user_id' || col === 'create_user_id'
        );
        console.log('\n🔑 User ID columns:', userIdColumns.length > 0 ? userIdColumns.join(', ') : 'NONE FOUND');

        const hasDeletedAt = columns.includes('deleted_at');
        console.log(`🗑️  Has deleted_at column: ${hasDeletedAt ? '✅ YES' : '❌ NO'}`);

        return { columns, userIdColumns, hasDeletedAt };
      } else {
        console.log('⚠️  Table is empty, cannot infer schema');
        return null;
      }
    }

    return data;

  } catch (error) {
    console.error(`❌ Error checking ${tableName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 SCHEMA INVESTIGATION');
  console.log('Checking actual database schema to resolve deletion errors...\n');

  // Tables that failed during deletion
  const problematicTables = [
    'incident_reports',
    'user_documents',
    'ai_transcription',
    'ai_summary',
    'temp_uploads'
  ];

  const results = {};

  for (const table of problematicTables) {
    const schema = await checkTableSchema(table);
    results[table] = schema;
  }

  // Summary report
  console.log('\n\n📋 SUMMARY REPORT');
  console.log('='.repeat(60));

  for (const [table, schema] of Object.entries(results)) {
    if (!schema) {
      console.log(`\n❌ ${table}: FAILED TO QUERY`);
      continue;
    }

    console.log(`\n✅ ${table}:`);
    console.log(`   Total columns: ${schema.columns.length}`);
    console.log(`   User ID columns: ${schema.userIdColumns.join(', ') || 'NONE'}`);
    console.log(`   Has deleted_at: ${schema.hasDeletedAt ? 'YES' : 'NO'}`);
  }

  // Recommendations
  console.log('\n\n💡 RECOMMENDATIONS');
  console.log('='.repeat(60));

  for (const [table, schema] of Object.entries(results)) {
    if (!schema) continue;

    if (schema.userIdColumns.length === 0) {
      console.log(`\n⚠️  ${table}: NO USER ID COLUMNS FOUND`);
      console.log(`   → This table cannot be filtered by user!`);
    }

    if (!schema.hasDeletedAt && table !== 'temp_uploads') {
      console.log(`\n⚠️  ${table}: MISSING deleted_at COLUMN`);
      console.log(`   → Either add the column or remove from deletion list`);
    }

    if (schema.userIdColumns.includes('auth_user_id')) {
      console.log(`\n✅ ${table}: Has auth_user_id (can use in queries)`);
    } else {
      console.log(`\n❌ ${table}: Does NOT have auth_user_id`);
      console.log(`   → Remove auth_user_id from OR clauses for this table`);
    }
  }

  console.log('\n✅ Schema check complete!\n');
}

main().catch(console.error);
