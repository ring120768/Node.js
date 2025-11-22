/**
 * Check if Page 8 image columns exist in incident_reports
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkImageColumns() {
  console.log('🔍 Checking Page 8 Image Columns in incident_reports...\n');

  const { data, error } = await supabase
    .from('incident_reports')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  const columns = data && data.length > 0
    ? Object.keys(data[0])
    : [];

  // Expected columns for Page 8 (other vehicle images)
  const expectedColumns = [
    'file_url_other_vehicle',
    'file_url_other_vehicle_1',
    'other_damage_photo',  // Current generic field
    'other_vehicle_photo',  // Potential specific field
    'other_vehicle_photo_1',
    'other_vehicle_photo_2'
  ];

  console.log('📸 Page 8 Image Column Status:\n');

  expectedColumns.forEach(col => {
    const exists = columns.includes(col);
    if (exists) {
      console.log(`  ✅ ${col} - EXISTS`);
    } else {
      console.log(`  ❌ ${col} - MISSING`);
    }
  });

  // Also check for any other "file_url" columns
  const fileUrlColumns = columns.filter(col => col.startsWith('file_url_'));
  console.log(`\n🔍 All "file_url_*" columns (${fileUrlColumns.length} found):\n`);
  fileUrlColumns.forEach(col => {
    console.log(`  - ${col}`);
  });
}

checkImageColumns()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
