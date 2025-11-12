/**
 * Verification Script: Pages 7 and 9 Data Saving
 *
 * Tests that data from pages 7 and 9 is correctly saved to the database.
 *
 * Usage:
 *   node scripts/verify-pages-7-9-data.js [user-uuid]
 *
 * If no user UUID provided, checks the most recent incident report.
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function printHeader(title) {
  console.log('\n' + colors.cyan + '='.repeat(80) + colors.reset);
  console.log(colors.cyan + title.padStart((80 + title.length) / 2) + colors.reset);
  console.log(colors.cyan + '='.repeat(80) + colors.reset + '\n');
}

function printSection(title) {
  console.log('\n' + colors.blue + '─'.repeat(80) + colors.reset);
  console.log(colors.blue + '  ' + title + colors.reset);
  console.log(colors.blue + '─'.repeat(80) + colors.reset + '\n');
}

function printResult(field, value, isArray = false) {
  const hasData = isArray ? (value && value.length > 0) : (value !== null && value !== undefined && value !== '');
  const status = hasData ? colors.green + '✓' : colors.red + '✗';
  const displayValue = isArray
    ? (value && value.length > 0 ? `[${value.length} items]` : 'NULL')
    : (hasData ? String(value).substring(0, 50) : 'NULL');

  console.log(`  ${status} ${colors.reset}${field.padEnd(35)} ${colors.gray}${displayValue}${colors.reset}`);
  return hasData;
}

async function verifyPages7And9(userId = null) {
  try {
    printHeader('PAGE 7 & 9 DATA VERIFICATION');

    // Get the most recent incident report
    let query = supabase
      .from('incident_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('create_user_id', userId);
      console.log(`${colors.yellow}Filtering by User ID: ${userId}${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}No User ID provided - checking most recent report${colors.reset}\n`);
    }

    const { data: incidents, error } = await query.limit(1);

    if (error) {
      console.error(`${colors.red}❌ Database Error:${colors.reset}`, error.message);
      process.exit(1);
    }

    if (!incidents || incidents.length === 0) {
      console.log(`${colors.red}❌ No incident reports found${colors.reset}`);
      process.exit(1);
    }

    const incident = incidents[0];

    console.log(`${colors.cyan}Incident Report Details:${colors.reset}`);
    console.log(`  ID: ${incident.id}`);
    console.log(`  User: ${incident.create_user_id}`);
    console.log(`  Created: ${new Date(incident.created_at).toLocaleString('en-GB')}\n`);

    // ===========================
    // PAGE 7: Other Driver & Vehicle (20 fields)
    // ===========================
    printSection('PAGE 7: Other Driver & Vehicle Details (20 fields)');

    const page7Fields = [
      { name: 'other_full_name', label: 'Other Driver Name' },
      { name: 'other_contact_number', label: 'Other Driver Phone' },
      { name: 'other_email_address', label: 'Other Driver Email' },
      { name: 'other_driving_license_number', label: 'Other Driver License' },
      { name: 'other_vehicle_registration', label: 'Other Vehicle Registration' },
      { name: 'other_vehicle_look_up_make', label: 'Other Vehicle Make' },
      { name: 'other_vehicle_look_up_model', label: 'Other Vehicle Model' },
      { name: 'other_vehicle_look_up_colour', label: 'Other Vehicle Colour' },
      { name: 'other_vehicle_look_up_fuel_type', label: 'Other Vehicle Fuel Type' },
      { name: 'other_vehicle_look_up_year_of_manufacture', label: 'Other Vehicle Year' },
      { name: 'other_drivers_insurance_company', label: 'Other Insurance Company' },
      { name: 'other_drivers_policy_number', label: 'Other Policy Number' },
      { name: 'other_drivers_policy_holder_name', label: 'Other Policy Holder' },
      { name: 'other_drivers_policy_cover_type', label: 'Other Cover Type' },
      { name: 'describe_damage_to_vehicle', label: 'Damage Description' },
      { name: 'no_visible_damage', label: 'No Visible Damage' }
    ];

    let page7PassCount = 0;
    let page7TotalFields = page7Fields.length;

    page7Fields.forEach(field => {
      const hasData = printResult(field.label, incident[field.name]);
      if (hasData) page7PassCount++;
    });

    const page7Percentage = Math.round((page7PassCount / page7TotalFields) * 100);
    const page7Status = page7PassCount > 0
      ? `${colors.green}✓ PASS${colors.reset}`
      : `${colors.red}✗ FAIL${colors.reset}`;

    console.log(`\n  ${page7Status} - ${page7PassCount}/${page7TotalFields} fields populated (${page7Percentage}%)`);

    // ===========================
    // PAGE 9: Witnesses (5 fields + separate table)
    // ===========================
    printSection('PAGE 9: Witness Information');

    console.log(`  ${colors.gray}Main Field:${colors.reset}`);
    const witnessesPresent = printResult('Witnesses Present', incident.witnesses_present);

    let witnessCount = 0;
    let witnessesDetails = [];

    if (incident.witnesses_present === 'yes') {
      // Query incident_witnesses table
      const { data: witnesses, error: witnessError } = await supabase
        .from('incident_witnesses')
        .select('*')
        .eq('incident_report_id', incident.id)
        .order('witness_number', { ascending: true });

      if (witnessError) {
        console.log(`\n  ${colors.red}✗ Error querying witnesses table:${colors.reset} ${witnessError.message}`);
      } else if (witnesses && witnesses.length > 0) {
        witnessCount = witnesses.length;
        witnessesDetails = witnesses;

        console.log(`\n  ${colors.gray}Witnesses Table (incident_witnesses):${colors.reset}`);
        witnesses.forEach((witness, index) => {
          console.log(`\n  ${colors.cyan}Witness ${witness.witness_number}:${colors.reset}`);
          printResult('  Name', witness.witness_name);
          printResult('  Phone', witness.witness_mobile_number);
          printResult('  Email', witness.witness_email_address);
          printResult('  Statement', witness.witness_statement);
        });
      } else {
        console.log(`\n  ${colors.yellow}⚠ Witnesses marked as present but no witness records found${colors.reset}`);
      }
    } else if (incident.witnesses_present === 'no') {
      console.log(`\n  ${colors.green}✓ No witnesses reported (expected behavior)${colors.reset}`);
    }

    const page9Status = witnessesPresent
      ? `${colors.green}✓ PASS${colors.reset}`
      : `${colors.red}✗ FAIL${colors.reset}`;

    console.log(`\n  ${page9Status} - witnesses_present field: ${incident.witnesses_present || 'NULL'}`);
    if (witnessCount > 0) {
      console.log(`  ${colors.green}✓${colors.reset} ${witnessCount} witness record(s) saved to incident_witnesses table`);
    }

    // ===========================
    // SUMMARY
    // ===========================
    printSection('VERIFICATION SUMMARY');

    const overallStatus = (page7PassCount > 0 && witnessesPresent)
      ? `${colors.green}✓ PASS${colors.reset}`
      : `${colors.red}✗ FAIL${colors.reset}`;

    console.log(`  Overall Status: ${overallStatus}\n`);
    console.log(`  Page 7: ${page7PassCount}/${page7TotalFields} fields (${page7Percentage}%)`);
    console.log(`  Page 9: ${witnessesPresent ? 'witnesses_present populated' : 'witnesses_present is NULL'}`);

    if (witnessCount > 0) {
      console.log(`         ${witnessCount} witness record(s) in incident_witnesses table`);
    }

    // Recommendations
    printSection('RECOMMENDATIONS');

    if (page7PassCount === 0) {
      console.log(`  ${colors.yellow}⚠ Page 7 has NO data - possible causes:${colors.reset}`);
      console.log(`    1. This is an old record created before the storage fix`);
      console.log(`    2. User skipped page 7 or didn't fill any fields`);
      console.log(`    3. Browser cache needs to be cleared (Cmd+Shift+R)`);
      console.log(`\n  ${colors.cyan}→ Submit a NEW test form to verify the fix works${colors.reset}`);
    } else if (page7Percentage < 50) {
      console.log(`  ${colors.yellow}⚠ Page 7 has partial data (${page7Percentage}%)${colors.reset}`);
      console.log(`    User may have partially filled the form`);
    } else {
      console.log(`  ${colors.green}✓ Page 7 data looks good (${page7Percentage}% populated)${colors.reset}`);
    }

    if (!witnessesPresent) {
      console.log(`\n  ${colors.yellow}⚠ Page 9 witnesses_present is NULL - possible causes:${colors.reset}`);
      console.log(`    1. This is an old record created before the storage fix`);
      console.log(`    2. User didn't reach page 9`);
      console.log(`    3. Browser cache needs to be cleared`);
      console.log(`\n  ${colors.cyan}→ Submit a NEW test form to verify the fix works${colors.reset}`);
    } else {
      console.log(`\n  ${colors.green}✓ Page 9 witnesses_present field is populated${colors.reset}`);
      if (incident.witnesses_present === 'yes' && witnessCount === 0) {
        console.log(`  ${colors.yellow}⚠ But no witness records found - check controller logic${colors.reset}`);
      }
    }

    console.log('\n' + colors.gray + 'Tip: Clear browser cache (Cmd+Shift+R) and sessionStorage before testing');
    console.log('     sessionStorage.clear(); // Run in browser console' + colors.reset + '\n');

    // Exit codes
    if (page7PassCount > 0 && witnessesPresent) {
      process.exit(0); // Success
    } else {
      process.exit(1); // Failure
    }

  } catch (error) {
    console.error(`${colors.red}❌ Unexpected Error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Parse command line arguments
const userId = process.argv[2];

verifyPages7And9(userId);
