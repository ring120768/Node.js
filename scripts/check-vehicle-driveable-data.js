/**
 * Check what's being saved to vehicle_driveable fields
 * This will show us if data is going to TEXT or BOOLEAN columns
 *
 * Usage: node scripts/check-vehicle-driveable-data.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  console.log('🔍 Checking vehicle_driveable data in incident_reports table...\n');

  try {
    // Get all incident reports with any vehicle_driveable data
    const { data: incidents, error } = await supabase
      .from('incident_reports')
      .select('id, create_user_id, created_at, vehicle_driveable, vehicle_driveable_yes, vehicle_driveable_no, vehicle_driveable_unsure')
      .or('vehicle_driveable.not.is.null,vehicle_driveable_yes.eq.true,vehicle_driveable_no.eq.true,vehicle_driveable_unsure.eq.true')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    if (!incidents || incidents.length === 0) {
      console.log('❌ No incident reports found with vehicle_driveable data');
      console.log('\n📊 Checking total incident reports...');

      const { data: allIncidents, error: countError } = await supabase
        .from('incident_reports')
        .select('id', { count: 'exact', head: true });

      if (countError) {
        console.log('  Error counting:', countError.message);
      } else {
        console.log(`  Total incidents in database: ${allIncidents?.length || 0}`);
      }

      console.log('\n💡 This means:');
      console.log('  1. Users may not be reaching Page 5, OR');
      console.log('  2. Users are not selecting a driveable option, OR');
      console.log('  3. Data is not being saved from sessionStorage');

      return;
    }

    console.log(`✅ Found ${incidents.length} incident reports with vehicle_driveable data:\n`);

    // Analyze the data
    let textCount = 0;
    let booleanYesCount = 0;
    let booleanNoCount = 0;
    let booleanUnsureCount = 0;
    let bothCount = 0;

    incidents.forEach((incident, index) => {
      console.log(`─────────────────────────────────────────────────────────`);
      console.log(`Incident #${index + 1}`);
      console.log(`  ID: ${incident.id}`);
      console.log(`  User: ${incident.create_user_id}`);
      console.log(`  Created: ${new Date(incident.created_at).toLocaleString()}`);
      console.log(`  TEXT field (vehicle_driveable): "${incident.vehicle_driveable}"`);
      console.log(`  BOOLEAN fields:`);
      console.log(`    - vehicle_driveable_yes: ${incident.vehicle_driveable_yes}`);
      console.log(`    - vehicle_driveable_no: ${incident.vehicle_driveable_no}`);
      console.log(`    - vehicle_driveable_unsure: ${incident.vehicle_driveable_unsure}`);

      // Count which fields are populated
      if (incident.vehicle_driveable) textCount++;
      if (incident.vehicle_driveable_yes) booleanYesCount++;
      if (incident.vehicle_driveable_no) booleanNoCount++;
      if (incident.vehicle_driveable_unsure) booleanUnsureCount++;
      if (incident.vehicle_driveable && (incident.vehicle_driveable_yes || incident.vehicle_driveable_no || incident.vehicle_driveable_unsure)) {
        bothCount++;
      }
    });

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`📊 SUMMARY:`);
    console.log(`  TEXT field populated: ${textCount} incidents`);
    console.log(`  BOOLEAN yes populated: ${booleanYesCount} incidents`);
    console.log(`  BOOLEAN no populated: ${booleanNoCount} incidents`);
    console.log(`  BOOLEAN unsure populated: ${booleanUnsureCount} incidents`);
    console.log(`  Both TEXT and BOOLEAN: ${bothCount} incidents`);

    console.log(`\n💡 INTERPRETATION:`);
    if (textCount > 0 && (booleanYesCount + booleanNoCount + booleanUnsureCount) === 0) {
      console.log('  ✅ GOOD: Only TEXT field is being used (correct!)');
      console.log('  ✅ Your HTML form → controller → database flow is working');
      console.log('  ✅ PDF mapping should work correctly');
    } else if ((booleanYesCount + booleanNoCount + booleanUnsureCount) > 0 && textCount === 0) {
      console.log('  ⚠️  LEGACY: Only BOOLEAN fields are populated');
      console.log('  ⚠️  This is from old Typeform data');
      console.log('  ⚠️  New HTML form should populate TEXT field instead');
    } else if (bothCount > 0) {
      console.log('  🔀 MIXED: Both TEXT and BOOLEAN fields populated');
      console.log('  🔀 This suggests migration or transition period');
    } else {
      console.log('  ❓ UNKNOWN: Check the data manually');
    }

    console.log(`\n🎯 RECOMMENDATION:`);
    console.log('  1. If TEXT field is populating: Everything works! ✅');
    console.log('  2. If only BOOLEAN fields: Check controller is running (line 569)');
    console.log('  3. Test by submitting a new incident form and run this script again');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  }
}

checkData();
