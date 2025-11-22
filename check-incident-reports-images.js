const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('=== INCIDENT_REPORTS IMAGE/URL COLUMNS ===\n');

  const userId = 'ee7cfcaf-5810-4c62-b99b-ab0f2291733e';

  const { data, error } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Find all columns with 'url', 'image', 'photo', 'picture', or 'file_url' in the name
  const imageColumns = Object.keys(data).filter(key => {
    const lower = key.toLowerCase();
    return lower.includes('url') ||
           lower.includes('image') ||
           lower.includes('photo') ||
           lower.includes('picture') ||
           lower.includes('file_url');
  });

  console.log(`Found ${imageColumns.length} image/URL-related columns:\n`);

  imageColumns.forEach(col => {
    const value = data[col];
    const hasValue = value ? '✅ HAS VALUE' : '⚠️  NULL';
    const preview = value ? value.substring(0, 80) + '...' : 'NULL';
    console.log(`${col}:`);
    console.log(`  Status: ${hasValue}`);
    console.log(`  Value: ${preview}`);
    console.log('');
  });

  // Count populated vs empty
  const populated = imageColumns.filter(col => data[col]).length;
  const empty = imageColumns.filter(col => !data[col]).length;

  console.log('=== SUMMARY ===');
  console.log(`Total image/URL columns: ${imageColumns.length}`);
  console.log(`Populated: ${populated}`);
  console.log(`Empty: ${empty}`);
})();
