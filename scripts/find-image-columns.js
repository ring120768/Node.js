/**
 * Find all image/photo columns in incident_reports table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findImageColumns() {
  console.log('🔍 Finding Image/Photo Columns in incident_reports...\n');

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

  // Filter columns related to images/photos
  const imageColumns = columns.filter(col => 
    col.includes('photo') || 
    col.includes('image') || 
    col.includes('picture') ||
    col.includes('_img')
  );

  console.log('📸 Image/Photo Columns Found:\n');

  if (imageColumns.length === 0) {
    console.log('  ⚠️  No image columns found');
  } else {
    imageColumns.forEach(col => {
      console.log(`  - ${col}`);
    });
  }

  console.log(`\n📊 Total: ${imageColumns.length} image columns`);

  // Also check for "other" columns
  const otherColumns = columns.filter(col => col.startsWith('other_'));
  console.log(`\n🔍 All "other_*" columns: ${otherColumns.length} found`);
  otherColumns.forEach(col => {
    if (!imageColumns.includes(col)) {
      console.log(`  - ${col}`);
    }
  });
}

findImageColumns()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
