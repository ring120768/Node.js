/**
 * Check user_documents table schema
 * Quick script to see actual column names
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('🔍 Checking user_documents table schema...\n');

  try {
    // Try to select one record to see column names
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
      Object.keys(data).forEach(col => {
        console.log(`   - ${col} (${typeof data[col]})`);
      });
    } else {
      console.log('⚠️  No records found. Checking via information_schema...\n');

      // Query information_schema using raw SQL
      const { data: schema, error: schemaError } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = 'user_documents'
          AND table_schema = 'public'
          ORDER BY ordinal_position
        `
      });

      if (schemaError) {
        console.error('❌ Schema query error:', schemaError.message);

        // Fallback: Try to insert a test record and see what columns it expects
        console.log('\n🧪 Attempting test insert to discover required columns...\n');

        const testUserId = '1af483d1-35c3-4202-a50f-4b5a8aa631f7';

        // Try with common column variations
        const testCases = [
          { create_user_id: testUserId, mime_type: 'test' }, // mime_type
          { create_user_id: testUserId, file_type: 'test' }, // file_type
          { create_user_id: testUserId, content_type: 'test' }, // content_type
        ];

        for (const testData of testCases) {
          const { error: insertError } = await supabase
            .from('user_documents')
            .insert([testData]);

          if (!insertError) {
            console.log(`✅ Success with columns: ${Object.keys(testData).join(', ')}`);

            // Clean up test record
            await supabase
              .from('user_documents')
              .delete()
              .eq('create_user_id', testUserId)
              .eq(Object.keys(testData)[1], 'test');

            break;
          } else {
            console.log(`❌ Failed with ${Object.keys(testData)[1]}: ${insertError.message}`);
          }
        }
      } else {
        console.log('📋 user_documents schema from information_schema:');
        schema.forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkSchema()
  .then(() => console.log('\n✅ Schema check complete'))
  .catch(error => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
