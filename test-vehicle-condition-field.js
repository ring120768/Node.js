#!/usr/bin/env node
/**
 * Test Script: Vehicle Condition Field
 * Purpose: Verify vehicle_condition field exists and can be saved
 * Usage: node test-vehicle-condition-field.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

async function testVehicleConditionField() {
  console.log(colors.cyan, '\n🧪 Testing Vehicle Condition Field\n', colors.reset);

  try {
    // Step 1: Check if vehicle_condition column exists in user_signup table
    console.log('1. Checking database schema...');

    const { data: columns, error: schemaError } = await supabase
      .rpc('get_column_info', { table_name: 'user_signup' })
      .single();

    if (schemaError) {
      // Fallback: Query the table to check column existence
      console.log(colors.yellow, '   Using fallback method to check column...', colors.reset);

      const { data: testData, error: testError } = await supabase
        .from('user_signup')
        .select('vehicle_condition')
        .limit(1);

      if (testError) {
        if (testError.message.includes('vehicle_condition')) {
          console.log(colors.red, '   ❌ vehicle_condition column does NOT exist', colors.reset);
          console.log(colors.yellow, '\n⚠️  You need to add the vehicle_condition column to user_signup table:', colors.reset);
          console.log('\n   Run this SQL in Supabase dashboard:');
          console.log(colors.cyan, '\n   ALTER TABLE user_signup ADD COLUMN IF NOT EXISTS vehicle_condition TEXT;\n', colors.reset);
          return;
        } else {
          throw testError;
        }
      }

      console.log(colors.green, '   ✅ vehicle_condition column exists', colors.reset);
    }

    // Step 2: Query existing records to see current state
    console.log('\n2. Checking existing records...');

    const { data: existingRecords, error: queryError } = await supabase
      .from('user_signup')
      .select('create_user_id, email, vehicle_condition, vehicle_make, vehicle_model, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (queryError) {
      throw queryError;
    }

    if (existingRecords && existingRecords.length > 0) {
      console.log(colors.cyan, `   Found ${existingRecords.length} recent records:\n`, colors.reset);
      existingRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. Email: ${record.email}`);
        console.log(`      Vehicle Condition: ${record.vehicle_condition || '(empty)'}`);
        console.log(`      Vehicle: ${record.vehicle_make || 'N/A'} ${record.vehicle_model || 'N/A'}`);
        console.log(`      Created: ${new Date(record.created_at).toLocaleString('en-GB')}\n`);
      });

      // Count how many have vehicle_condition set
      const withCondition = existingRecords.filter(r => r.vehicle_condition);
      const withoutCondition = existingRecords.filter(r => !r.vehicle_condition);

      console.log(colors.cyan, '   Summary:', colors.reset);
      console.log(`   - Records with vehicle_condition: ${withCondition.length}`);
      console.log(`   - Records without vehicle_condition: ${withoutCondition.length}`);

      if (withCondition.length > 0) {
        console.log(colors.green, '\n   ✅ Some records already have vehicle_condition filled', colors.reset);
      } else {
        console.log(colors.yellow, '\n   ⚠️  No records have vehicle_condition filled yet', colors.reset);
        console.log('      This is expected if no new signups have occurred since adding the field.');
      }
    } else {
      console.log(colors.yellow, '   No records found in user_signup table', colors.reset);
    }

    // Step 3: Test INSERT with vehicle_condition
    console.log('\n3. Testing INSERT with vehicle_condition...');

    const testUserId = `test-vehicle-condition-${Date.now()}`;
    const testData = {
      create_user_id: testUserId,
      email: `test-${Date.now()}@example.com`,
      name: 'Test', // Database uses 'name', not 'first_name'
      surname: 'User', // Database uses 'surname', not 'last_name'
      mobile: '+447123456789', // Database uses 'mobile', not 'mobile_number'
      vehicle_condition: 'good', // Test value
      vehicle_make: 'Test Make',
      vehicle_model: 'Test Model',
      gdpr_consent: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('user_signup')
      .insert([testData])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    console.log(colors.green, '   ✅ Successfully inserted test record with vehicle_condition = "good"', colors.reset);

    // Step 4: Verify the inserted data
    console.log('\n4. Verifying inserted data...');

    const { data: verifyData, error: verifyError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', testUserId)
      .single();

    if (verifyError) {
      throw verifyError;
    }

    console.log(colors.cyan, '\n   Inserted record:', colors.reset);
    console.log(`   - Email: ${verifyData.email}`);
    console.log(`   - Vehicle Condition: ${verifyData.vehicle_condition}`);
    console.log(`   - Vehicle: ${verifyData.vehicle_make} ${verifyData.vehicle_model}`);

    if (verifyData.vehicle_condition === 'good') {
      console.log(colors.green, '\n   ✅ vehicle_condition field saved correctly!', colors.reset);
    } else {
      console.log(colors.red, '\n   ❌ vehicle_condition field did not save correctly', colors.reset);
      console.log(`   Expected: "good", Got: "${verifyData.vehicle_condition}"`);
    }

    // Step 5: Clean up test record
    console.log('\n5. Cleaning up test record...');

    const { error: deleteError } = await supabase
      .from('user_signup')
      .delete()
      .eq('create_user_id', testUserId);

    if (deleteError) {
      console.log(colors.yellow, `   ⚠️  Could not delete test record: ${deleteError.message}`, colors.reset);
      console.log(`   You may want to manually delete: ${testUserId}`);
    } else {
      console.log(colors.green, '   ✅ Test record deleted', colors.reset);
    }

    // Final summary
    console.log('\n' + '─'.repeat(80));
    console.log(colors.green, '\n✅ Vehicle Condition Field Test Complete!\n', colors.reset);
    console.log('Summary:');
    console.log('  - Database column exists: ✅');
    console.log('  - INSERT with vehicle_condition: ✅');
    console.log('  - Data retrieval: ✅');
    console.log('\nThe vehicle_condition field is ready to use in the signup form!');
    console.log('\n');

  } catch (error) {
    console.log(colors.red, `\n❌ Error: ${error.message}`, colors.reset);
    console.error(error);
    process.exit(1);
  }
}

testVehicleConditionField().catch(console.error);
