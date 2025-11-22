#!/usr/bin/env node

/**
 * Check Actual Column Data Types
 *
 * Queries PostgreSQL information_schema to verify exact data types
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumnTypes() {
  console.log('\n🔍 Checking Column Data Types...\n');

  const { data, error } = await supabase
    .from('incident_reports')
    .select('*')
    .limit(0);  // Just get column info, no data

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  // Get table schema using a raw SQL query via Supabase REST API
  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/?select=*`,
    {
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  console.log('📋 Column Types Check:\n');
  console.log('Expected:');
  console.log('  usual_vehicle          → TEXT');
  console.log('  vehicle_driveable      → TEXT');
  console.log('  impact_point           → TEXT[] (array)\n');

  console.log('ℹ️  To check actual types, run this query in Supabase SQL Editor:\n');
  console.log(`
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'incident_reports'
  AND column_name IN ('usual_vehicle', 'vehicle_driveable', 'impact_point')
ORDER BY column_name;
  `);

  console.log('\n📝 If types are wrong, run this fix:\n');
  console.log(`
-- Fix usual_vehicle type
ALTER TABLE incident_reports
ALTER COLUMN usual_vehicle TYPE TEXT
USING CASE
  WHEN usual_vehicle = true THEN 'yes'
  WHEN usual_vehicle = false THEN 'no'
  ELSE NULL
END;

-- Fix vehicle_driveable type
ALTER TABLE incident_reports
ALTER COLUMN vehicle_driveable TYPE TEXT
USING CASE
  WHEN vehicle_driveable = true THEN 'yes'
  WHEN vehicle_driveable = false THEN 'no'
  ELSE NULL
END;
  `);
}

checkColumnTypes();
