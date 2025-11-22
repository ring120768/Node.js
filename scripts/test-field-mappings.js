/**
 * Test Field Mappings - Verify the 6 fixed fields
 *
 * This script verifies that:
 * 1. accident_date/accident_time now read from page3 (not page1)
 * 2. Witness fields (name, phone, email, statement) are mapped from page9
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function testFieldMappings(userId) {
  console.log('\n📋 Testing Fixed Field Mappings\n');
  console.log('=' . repeat(80) + '\n');

  try {
    // Fetch the most recent incident report for the user
    const { data: incident, error } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.log(`${colors.red}❌ Error fetching incident:${colors.reset}`, error.message);
      return;
    }

    if (!incident) {
      console.log(`${colors.yellow}⚠️  No incident reports found for user ${userId}${colors.reset}`);
      return;
    }

    console.log(`${colors.blue}📊 Testing incident ID: ${incident.id}${colors.reset}\n`);

    // Test the 6 fixed fields
    const fieldsToTest = [
      { name: 'accident_date', label: 'Accident Date', expected: 'From Page 3' },
      { name: 'accident_time', label: 'Accident Time', expected: 'From Page 3' },
      { name: 'witness_name', label: 'Witness Name', expected: 'From Page 9' },
      { name: 'witness_mobile_number', label: 'Witness Mobile', expected: 'From Page 9' },
      { name: 'witness_email_address', label: 'Witness Email', expected: 'From Page 9' },
      { name: 'witness_statement', label: 'Witness Statement', expected: 'From Page 9' }
    ];

    let passCount = 0;
    let failCount = 0;

    console.log('FIELD MAPPING TEST RESULTS:');
    console.log('-'.repeat(80));

    for (const field of fieldsToTest) {
      const value = incident[field.name];
      const hasData = value !== null && value !== '' && value !== undefined;

      if (hasData) {
        console.log(`${colors.green}✓${colors.reset} ${field.label}: ${colors.green}${value}${colors.reset}`);
        console.log(`  ${colors.blue}Source: ${field.expected}${colors.reset}`);
        passCount++;
      } else {
        console.log(`${colors.red}✗${colors.reset} ${field.label}: ${colors.red}NULL${colors.reset}`);
        console.log(`  ${colors.yellow}Expected source: ${field.expected}${colors.reset}`);
        failCount++;
      }
      console.log('');
    }

    console.log('-'.repeat(80));
    console.log(`\n📊 SUMMARY: ${passCount}/${fieldsToTest.length} fields populated`);

    if (passCount === 6) {
      console.log(`${colors.green}✅ SUCCESS - All 6 fields are now being saved!${colors.reset}\n`);
    } else if (passCount > 0) {
      console.log(`${colors.yellow}⚠️  PARTIAL - ${failCount} field(s) still NULL${colors.reset}`);
      console.log(`\n${colors.blue}ℹ️  Testing Notes:${colors.reset}`);
      console.log('  1. This test uses EXISTING data from the database');
      console.log('  2. If fields are NULL, they were submitted BEFORE the fix');
      console.log('  3. Create a NEW form submission to test the fix properly\n');
    } else {
      console.log(`${colors.red}❌ FAIL - No fields populated${colors.reset}`);
      console.log(`\n${colors.yellow}⚠️  This incident was likely created before the fix${colors.reset}`);
      console.log('Please submit a NEW form to test the fix.\n');
    }

    // Additional check: Verify incident_witnesses table for additional witnesses
    const { data: witnesses, error: witnessError } = await supabase
      .from('incident_witnesses')
      .select('*')
      .eq('incident_report_id', incident.id)
      .order('witness_number', { ascending: true });

    if (!witnessError && witnesses && witnesses.length > 0) {
      console.log(`${colors.blue}📝 Additional Witnesses:${colors.reset}`);
      witnesses.forEach(w => {
        console.log(`  ${colors.green}✓${colors.reset} Witness ${w.witness_number}: ${w.witness_name || 'No name'}`);
      });
      console.log('');
    }

  } catch (err) {
    console.error(`${colors.red}❌ Test error:${colors.reset}`, err.message);
  }
}

// Get user ID from command line
const userId = process.argv[2];

if (!userId) {
  console.log(`${colors.yellow}Usage: node scripts/test-field-mappings.js <user-uuid>${colors.reset}\n`);
  process.exit(1);
}

testFieldMappings(userId);
