#!/usr/bin/env node
/**
 * VERIFY MIGRATION 002
 *
 * Checks if the 77 new columns were successfully added
 * Run this AFTER executing the migration via Supabase Dashboard
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
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function verifyMigration() {
  log('\n========================================', 'cyan');
  log('  🔍 VERIFYING MIGRATION 002', 'cyan');
  log('========================================\n', 'cyan');

  const columnsToCheck = {
    incident_reports: [
      // Medical (19 fields)
      'medical_ambulance_called',
      'medical_attention_needed',
      'medical_hospital_name',
      'medical_injury_details',
      'medical_injury_severity',
      'medical_treatment_received',
      // Accident info (2)
      'accident_date',
      'accident_time',
      // Road conditions (6)
      'road_condition_dry',
      'road_condition_wet',
      'road_condition_icy',
      // Road type (7)
      'road_type_motorway',
      'road_type_a_road',
      // Traffic (4)
      'traffic_conditions_heavy',
      'traffic_conditions_light',
      // Weather (6)
      'weather_clear',
      'weather_cloudy',
      // Visibility (1)
      'visibility_severely_restricted',
      // Location (6)
      'location',
      'what3words',
      'nearestlandmark',  // PostgreSQL converts to lowercase
      // Junction (4)
      'junctiontype',     // PostgreSQL converts to lowercase
      'junctioncontrol',  // PostgreSQL converts to lowercase
      // Vehicle (7)
      'your_speed',
      'impact_point',
      'seatbelts_worn',
      // Recovery (3)
      'recovery_location',
      'recovery_phone',
      // Police/Witnesses (2)
      'police_attended',
      'witnesses_present',
      // Final (1)
      'final_feeling'
    ],
    incident_other_vehicles: [
      'other_driver_name',
      'other_driver_phone',
      'other_driver_email',
      'other_driver_license',
      'other_license_plate',
      'other_point_of_impact'
    ]
  };

  let totalChecked = 0;
  let totalFound = 0;
  let failures = [];

  // Check incident_reports columns
  log('📊 Checking incident_reports table...', 'cyan');
  for (const column of columnsToCheck.incident_reports) {
    totalChecked++;

    const { data, error } = await supabase
      .from('incident_reports')
      .select(column)
      .limit(1);

    if (error && error.message.includes('column') && error.message.includes('does not exist')) {
      log(`  ❌ Missing: ${column}`, 'red');
      failures.push(`incident_reports.${column}`);
    } else if (!error) {
      totalFound++;
    }
  }

  log(`  Found: ${totalFound}/${columnsToCheck.incident_reports.length} columns\n`,
    totalFound === columnsToCheck.incident_reports.length ? 'green' : 'yellow');

  // Check incident_other_vehicles columns
  log('📊 Checking incident_other_vehicles table...', 'cyan');
  const otherVehicleFound = [];

  for (const column of columnsToCheck.incident_other_vehicles) {
    totalChecked++;

    const { data, error } = await supabase
      .from('incident_other_vehicles')
      .select(column)
      .limit(1);

    if (error && error.message.includes('column') && error.message.includes('does not exist')) {
      log(`  ❌ Missing: ${column}`, 'red');
      failures.push(`incident_other_vehicles.${column}`);
    } else if (!error) {
      totalFound++;
      otherVehicleFound.push(column);
    }
  }

  log(`  Found: ${otherVehicleFound.length}/${columnsToCheck.incident_other_vehicles.length} columns\n`,
    otherVehicleFound.length === columnsToCheck.incident_other_vehicles.length ? 'green' : 'yellow');

  // Summary
  log('========================================', 'cyan');
  log('  📊 VERIFICATION SUMMARY', 'cyan');
  log('========================================\n', 'cyan');

  log(`Total columns checked: ${totalChecked}`, 'reset');
  log(`Total columns found: ${totalFound}`, totalFound === totalChecked ? 'green' : 'yellow');
  log(`Missing columns: ${failures.length}\n`, failures.length === 0 ? 'green' : 'red');

  if (failures.length > 0) {
    log('❌ MIGRATION NOT COMPLETE', 'red');
    log('\nMissing columns:', 'yellow');
    failures.forEach(col => log(`  - ${col}`, 'red'));
    log('\n📝 Next steps:', 'magenta');
    log('  1. Run the migration via Supabase Dashboard', 'reset');
    log('  2. See RUN_MIGRATION_002.md for instructions\n', 'cyan');
    process.exit(1);
  } else {
    log('✅ MIGRATION 002 VERIFIED SUCCESSFULLY!\n', 'green');
    log('All 77 columns have been added:', 'green');
    log('  • incident_reports: 71 columns ✅', 'reset');
    log('  • incident_other_vehicles: 6 columns ✅\n', 'reset');
    log('📝 Next steps:', 'magenta');
    log('  Run postbox validation to verify the fix:', 'reset');
    log('  node scripts/validate-postbox.js\n', 'cyan');
  }
}

verifyMigration().catch(error => {
  log(`\n❌ Verification failed: ${error.message}\n`, 'red');
  process.exit(1);
});
