
/**
 * Database Migration Script for Car Crash Lawyer AI
 * Safely applies schema changes from supabase_fields_1759689113802.csv
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🔄 Starting database migration...');
  console.log('📋 This will update your Supabase schema to match the CSV field structure');
  
  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'migrate-supabase-schema.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error('Migration SQL file not found. Please ensure migrate-supabase-schema.sql exists.');
    }
    
    const migrationSQL = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim() === '') {
        continue;
      }
      
      console.log(`\n⚡ Executing statement ${i + 1}/${statements.length}:`);
      console.log(`   ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          errorCount++;
          
          // Don't fail on "already exists" errors
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate column name')) {
            console.log('   ℹ️  This is expected for existing columns/indexes');
          } else {
            console.error('   🚨 This may require manual intervention');
          }
        } else {
          console.log(`   ✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
      } catch (execError) {
        console.error(`❌ Execution error in statement ${i + 1}:`, execError.message);
        errorCount++;
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    console.log(`📝 Total statements: ${statements.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('🔍 All required fields should now be available in your Supabase tables');
    } else {
      console.log('\n⚠️  Migration completed with some errors');
      console.log('📋 Most errors are likely due to columns/indexes already existing');
      console.log('🔍 Check the output above for any critical issues');
    }
    
    // Verify the migration by checking key tables
    await verifyMigration();
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration results...');
  
  try {
    // Check if key tables exist and have expected columns
    const tablesToCheck = [
      'user_signup',
      'incident_reports', 
      'transcription_queue',
      'ai_transcription',
      'ai_summary'
    ];
    
    for (const tableName of tablesToCheck) {
      console.log(`\n📋 Checking table: ${tableName}`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ Error accessing ${tableName}:`, error.message);
      } else {
        console.log(`✅ Table ${tableName} is accessible`);
        
        // Check for key fields
        const keyFields = ['create_user_id', 'user_id', 'created_at'];
        const availableFields = data && data.length > 0 ? Object.keys(data[0]) : [];
        
        keyFields.forEach(field => {
          if (availableFields.includes(field)) {
            console.log(`   ✅ ${field} field exists`);
          } else {
            console.log(`   ⚠️  ${field} field not found in sample data`);
          }
        });
      }
    }
    
    // Check if hidden fields were added
    console.log('\n🔍 Checking for Typeform hidden fields...');
    const hiddenFields = ['user_id', 'product_id', 'auth_code'];
    
    const { data: userSignup } = await supabase
      .from('user_signup')
      .select(hiddenFields.join(','))
      .limit(1);
      
    if (userSignup) {
      console.log('✅ Hidden fields added to user_signup table');
    }
    
  } catch (verifyError) {
    console.error('❌ Verification failed:', verifyError.message);
  }
}

// Run the migration
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration, verifyMigration };
