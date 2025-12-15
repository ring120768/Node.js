#!/usr/bin/env node

/**
 * Test Script: Check actual user_signup table schema
 *
 * This will query the database to see what columns actually exist,
 * resolving the conflict between schema documentation and runtime errors.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkSchema() {
  console.log('========================================');
  console.log('🔍 USER_SIGNUP TABLE SCHEMA CHECK');
  console.log('========================================');
  console.log('');

  try {
    // Try to fetch one record to see all column names
    console.log('📍 Fetching a sample record to see column names...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('user_signup')
      .select('*')
      .limit(1)
      .single();

    if (sampleError) {
      console.log('❌ Error fetching sample record:', sampleError.message);
      console.log('   Error code:', sampleError.code);
    } else if (sampleData) {
      console.log('✅ Successfully retrieved sample record');
      console.log('');
      console.log('📝 ACTUAL COLUMN NAMES IN user_signup TABLE:');
      console.log('========================================');

      const columnNames = Object.keys(sampleData);
      columnNames.forEach((col, index) => {
        const value = sampleData[col];
        const type = typeof value;
        const preview = value !== null ?
          (type === 'string' && value.length > 50 ? value.substring(0, 47) + '...' : value) :
          'NULL';

        console.log(`${(index + 1).toString().padStart(3, ' ')}. ${col.padEnd(35, ' ')} | ${type.padEnd(10, ' ')} | ${preview}`);
      });

      console.log('========================================');
      console.log('');

      // Check specifically for name columns
      console.log('🔍 NAME COLUMN ANALYSIS:');
      const nameColumns = columnNames.filter(col =>
        col.includes('name') || col.includes('first') || col.includes('last') || col.includes('driver')
      );

      if (nameColumns.length > 0) {
        console.log('Found name-related columns:');
        nameColumns.forEach(col => {
          console.log(`   ✓ ${col}: ${JSON.stringify(sampleData[col])}`);
        });
      } else {
        console.log('   ⚠️  No obvious name columns found!');
      }

      console.log('');

      // Check for emergency contact columns
      console.log('🚨 EMERGENCY CONTACT COLUMN ANALYSIS:');
      const emergencyColumns = columnNames.filter(col =>
        col.includes('emergency') || col.includes('contact')
      );

      if (emergencyColumns.length > 0) {
        console.log('Found emergency contact columns:');
        emergencyColumns.forEach(col => {
          console.log(`   ✓ ${col}: ${JSON.stringify(sampleData[col])}`);
        });
      } else {
        console.log('   ⚠️  No emergency contact columns found!');
      }

    } else {
      console.log('⚠️  No records found in user_signup table (table might be empty)');
    }

    console.log('');
    console.log('========================================');

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkSchema()
  .then(() => {
    console.log('');
    console.log('✅ Schema check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });
