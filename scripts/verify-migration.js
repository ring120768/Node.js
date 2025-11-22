const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

console.log('='.repeat(70));
console.log('DATABASE MIGRATION VERIFICATION');
console.log('='.repeat(70));

// Expected new columns by table
const expectedColumns = {
  incident_reports: [
    // Medical (5)
    'ambulance_called', 'hospital_name', 'injury_severity', 'treatment_received', 'medical_follow_up_needed',
    // DVLA (10)
    'dvla_lookup_reg', 'dvla_vehicle_make', 'dvla_vehicle_model', 'dvla_vehicle_color', 'dvla_vehicle_year',
    'dvla_vehicle_fuel_type', 'dvla_mot_status', 'dvla_mot_expiry_date', 'dvla_tax_status', 'dvla_tax_due_date',
    // Weather (7)
    'weather_drizzle', 'weather_raining', 'weather_hail', 'weather_windy', 'weather_thunder',
    'weather_slush_road', 'weather_loose_surface',
    // Traffic (4)
    'traffic_heavy', 'traffic_moderate', 'traffic_light', 'traffic_none',
    // Road markings (3)
    'road_markings_yes', 'road_markings_partial', 'road_markings_no',
    // Visibility (3)
    'visibility_good', 'visibility_poor', 'visibility_very_poor'
  ],
  incident_other_vehicles: [
    // DVLA (6)
    'dvla_mot_status', 'dvla_mot_expiry_date', 'dvla_tax_status', 'dvla_tax_due_date',
    'dvla_insurance_status', 'dvla_export_marker',
    // Insurance (3)
    'insurance_company', 'insurance_policy_number', 'insurance_policy_holder'
  ],
  incident_witnesses: [
    // Witness 2 (4)
    'witness_2_name', 'witness_2_mobile', 'witness_2_email', 'witness_2_statement'
  ]
};

async function verifyMigration() {
  // Check environment
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\n❌ ERROR: Missing environment variables');
    console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log(`\n📊 Configuration:`);
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log(`   Using: Service Role Key`);

  // Initialize client
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

  console.log(`\n🔍 Verifying migration...`);

  const results = {
    found: [],
    missing: [],
    errors: []
  };

  // Check each table
  for (const [tableName, columns] of Object.entries(expectedColumns)) {
    console.log(`\n📋 Checking table: ${tableName}`);
    console.log(`   Expected columns: ${columns.length}`);

    for (const columnName of columns) {
      try {
        // Try to select the column (will fail if doesn't exist)
        const { data, error } = await supabase
          .from(tableName)
          .select(columnName)
          .limit(1);

        if (error) {
          // Check error code
          if (error.code === 'PGRST116') {
            // Table is empty but column exists
            console.log(`   ✅ ${columnName}`);
            results.found.push(`${tableName}.${columnName}`);
          } else if (error.message.includes('column') && error.message.includes('does not exist')) {
            // Column doesn't exist
            console.log(`   ❌ ${columnName} - NOT FOUND`);
            results.missing.push(`${tableName}.${columnName}`);
          } else {
            // Other error
            console.log(`   ⚠️  ${columnName} - ERROR: ${error.message}`);
            results.errors.push({
              column: `${tableName}.${columnName}`,
              error: error.message
            });
          }
        } else {
          // Success - column exists
          console.log(`   ✅ ${columnName}`);
          results.found.push(`${tableName}.${columnName}`);
        }

      } catch (err) {
        console.log(`   ⚠️  ${columnName} - EXCEPTION: ${err.message}`);
        results.errors.push({
          column: `${tableName}.${columnName}`,
          error: err.message
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`VERIFICATION SUMMARY`);
  console.log(`${'='.repeat(70)}`);

  const totalExpected = Object.values(expectedColumns).reduce((sum, cols) => sum + cols.length, 0);

  console.log(`\n📊 Statistics:`);
  console.log(`   Total expected columns: ${totalExpected}`);
  console.log(`   ✅ Found: ${results.found.length}`);
  console.log(`   ❌ Missing: ${results.missing.length}`);
  console.log(`   ⚠️  Errors: ${results.errors.length}`);

  if (results.missing.length > 0) {
    console.log(`\n❌ MISSING COLUMNS (${results.missing.length}):`);
    results.missing.forEach(col => console.log(`   - ${col}`));
  }

  if (results.errors.length > 0) {
    console.log(`\n⚠️  ERRORS (${results.errors.length}):`);
    results.errors.forEach(({ column, error }) => {
      console.log(`   - ${column}: ${error}`);
    });
  }

  // Final verdict
  console.log(`\n${'='.repeat(70)}`);

  if (results.missing.length === 0 && results.errors.length === 0) {
    console.log(`✅ MIGRATION VERIFIED SUCCESSFULLY`);
    console.log(`   All ${totalExpected} columns exist!`);
    console.log(`${'='.repeat(70)}`);
    console.log(`\n🎉 Next steps:`);
    console.log(`   1. Test PDF generation with new fields`);
    console.log(`   2. Update PDF service (src/services/pdfService.js)`);
    console.log(`   3. Update controllers to handle new fields`);
    console.log(`   4. Update UI to capture new data`);
    process.exit(0);
  } else {
    console.log(`❌ MIGRATION INCOMPLETE`);
    console.log(`   ${results.missing.length + results.errors.length} columns have issues`);
    console.log(`${'='.repeat(70)}`);
    console.log(`\n🔧 Troubleshooting:`);
    console.log(`   1. Ensure migration was run: migrations/001_add_new_pdf_fields.sql`);
    console.log(`   2. Check Supabase Dashboard → SQL Editor for errors`);
    console.log(`   3. Verify you have admin/service role permissions`);
    console.log(`   4. Re-run migration if needed (script is idempotent)`);
    process.exit(1);
  }
}

verifyMigration().catch(err => {
  console.error(`\n❌ Verification failed with exception:`);
  console.error(err);
  process.exit(1);
});
