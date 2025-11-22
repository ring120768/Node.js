/**
 * Check Migration Status
 * Verifies which migration-related columns exist in the database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumn(tableName, columnName) {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', tableName)
    .eq('column_name', columnName)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error(`Error checking ${tableName}.${columnName}:`, error.message);
    return null;
  }

  return !!data;
}

async function main() {
  console.log('🔍 Checking migration status...\n');

  // Check Migration 002 - Rename visibility column
  console.log('Migration 002: Visibility column rename');
  const hasOldVisibility = await checkColumn('incident_reports', 'visibility_severely_restricted');
  const hasNewVisibility = await checkColumn('incident_reports', 'visibility_street_lights');
  console.log(`  visibility_severely_restricted: ${hasOldVisibility ? '✅ EXISTS (needs migration)' : '❌ NOT FOUND'}`);
  console.log(`  visibility_street_lights: ${hasNewVisibility ? '✅ EXISTS' : '❌ NOT FOUND (needs migration)'}`);
  console.log();

  // Check Migration 003 - Add your_speed
  console.log('Migration 003: Add your_speed column');
  const hasYourSpeed = await checkColumn('incident_reports', 'your_speed');
  console.log(`  your_speed: ${hasYourSpeed ? '✅ EXISTS' : '❌ NOT FOUND (needs migration)'}`);
  console.log();

  // Check Migration 004 - Rename road_type column
  console.log('Migration 004: Road type column rename');
  const hasOldRoadType = await checkColumn('incident_reports', 'road_type_other');
  const hasNewRoadType = await checkColumn('incident_reports', 'road_type_private_road');
  console.log(`  road_type_other: ${hasOldRoadType ? '✅ EXISTS (needs migration)' : '❌ NOT FOUND'}`);
  console.log(`  road_type_private_road: ${hasNewRoadType ? '✅ EXISTS' : '❌ NOT FOUND (needs migration)'}`);
  console.log();

  // Check Migration 005 - Add user_documents columns
  console.log('Migration 005: User documents columns');
  const hasIncidentReportId = await checkColumn('user_documents', 'incident_report_id');
  const hasDownloadUrl = await checkColumn('user_documents', 'download_url');
  console.log(`  incident_report_id: ${hasIncidentReportId ? '✅ EXISTS' : '❌ NOT FOUND (needs migration)'}`);
  console.log(`  download_url: ${hasDownloadUrl ? '✅ EXISTS' : '❌ NOT FOUND (needs migration)'}`);
  console.log();

  // Summary
  const neededMigrations = [];
  if (hasOldVisibility && !hasNewVisibility) neededMigrations.push('002');
  if (!hasYourSpeed) neededMigrations.push('003');
  if (hasOldRoadType && !hasNewRoadType) neededMigrations.push('004');
  if (!hasIncidentReportId || !hasDownloadUrl) neededMigrations.push('005');

  if (neededMigrations.length === 0) {
    console.log('✅ All migrations appear to be applied!');
  } else {
    console.log('⚠️  Migrations needed:', neededMigrations.join(', '));
  }
}

main().catch(console.error);
