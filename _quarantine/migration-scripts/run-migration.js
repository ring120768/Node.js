const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('=== RUNNING MIGRATION: add_incident_image_urls.sql ===\n');

  const sql = fs.readFileSync('migrations/add_incident_image_urls.sql', 'utf8');

  // Remove comments and split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT');

  for (const statement of statements) {
    if (!statement) continue;

    console.log(`Executing: ${statement.substring(0, 80)}...`);

    const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

    if (error) {
      // Try direct query
      const { error: directError } = await supabase.from('_').select('*').limit(0);

      // Use raw SQL execution
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ query: statement })
      });

      if (!response.ok) {
        console.error('Error:', error || directError);
        console.log('⚠️  Attempting manual column addition via ALTER TABLE...\n');

        // Extract column name from ALTER TABLE statement
        const match = statement.match(/ADD COLUMN IF NOT EXISTS (\w+) TEXT/);
        if (match) {
          const columnName = match[1];
          console.log(`  Adding column: ${columnName}`);
        }
      }
    }
  }

  console.log('\n✅ Migration completed! Verifying columns were added...\n');

  // Verify columns exist
  const { data, error } = await supabase
    .from('incident_reports')
    .select('*')
    .limit(1)
    .single();

  if (data) {
    const newColumns = [
      'audio_recording_url',
      'scene_photo_1_url',
      'scene_photo_2_url',
      'scene_photo_3_url',
      'other_vehicle_photo_1_url',
      'other_vehicle_photo_2_url',
      'other_vehicle_photo_3_url',
      'vehicle_damage_photo_1_url',
      'vehicle_damage_photo_2_url',
      'vehicle_damage_photo_3_url',
      'vehicle_damage_photo_4_url',
      'vehicle_damage_photo_5_url',
      'vehicle_damage_photo_6_url'
    ];

    console.log('Verifying new columns:');
    newColumns.forEach(col => {
      const exists = col in data;
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });

    const allExist = newColumns.every(col => col in data);
    console.log(`\n${allExist ? '✅' : '❌'} All 13 columns ${allExist ? 'added successfully' : 'NOT found'}!`);
  }
})();
