#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('\nChecking incident_reports table for what3words/image columns...\n');

  const { data: sample, error } = await supabase
    .from('incident_reports')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.log('Error:', error.message);
    console.log('(This is normal if table is empty after cleanup)');
    return;
  }

  if (sample) {
    const columns = Object.keys(sample);
    const what3wordsColumns = columns.filter(col => {
      const lower = col.toLowerCase();
      return lower.includes('what3') || lower.includes('image') || lower.includes('photo') || lower.includes('picture');
    });

    console.log('Columns containing what3words, image, photo, or picture:\n');
    what3wordsColumns.forEach(col => {
      const value = sample[col];
      const hasValue = value !== null && value !== undefined;
      const preview = hasValue ? (typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value) : 'null';
      console.log(`  - ${col}:`);
      console.log(`      Type: ${typeof value}`);
      console.log(`      Value: ${preview}`);
      console.log('');
    });
  } else {
    console.log('No data in incident_reports table (empty after cleanup)');
  }
})();
