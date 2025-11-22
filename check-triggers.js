#!/usr/bin/env node

/**
 * Check for triggers on incident_reports table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTriggers() {
  console.log('🔍 Checking triggers on incident_reports table...\n');

  // Query to get all triggers on the incident_reports table
  const query = `
    SELECT
      trigger_name,
      event_manipulation,
      action_statement,
      action_timing
    FROM information_schema.triggers
    WHERE event_object_table = 'incident_reports'
      AND trigger_schema = 'public'
    ORDER BY trigger_name;
  `;

  const { data, error } = await supabase.rpc('execute_sql', {
    query
  });

  if (error) {
    console.error('❌ Error querying triggers:', error);

    // Try alternative query using pg_catalog
    console.log('\n🔄 Trying alternative query method...\n');

    const altQuery = `
      SELECT
        t.tgname AS trigger_name,
        CASE t.tgtype::integer & 66
          WHEN 2 THEN 'BEFORE'
          WHEN 64 THEN 'INSTEAD OF'
          ELSE 'AFTER'
        END AS action_timing,
        CASE t.tgtype::integer & cast(28 as int2)
          WHEN 4 THEN 'INSERT'
          WHEN 8 THEN 'DELETE'
          WHEN 16 THEN 'UPDATE'
          WHEN 20 THEN 'INSERT, DELETE'
          WHEN 24 THEN 'DELETE, UPDATE'
          WHEN 28 THEN 'INSERT, DELETE, UPDATE'
        END AS event_manipulation,
        p.proname AS function_name
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE c.relname = 'incident_reports'
        AND n.nspname = 'public'
        AND NOT t.tgisinternal
      ORDER BY t.tgname;
    `;

    const { data: altData, error: altError } = await supabase.rpc('execute_sql', {
      query: altQuery
    });

    if (altError) {
      console.error('❌ Alternative query also failed:', altError);
      process.exit(1);
    }

    displayResults(altData);
  } else {
    displayResults(data);
  }
}

function displayResults(data) {
  if (!data || data.length === 0) {
    console.log('✅ No triggers found on incident_reports table');
    return;
  }

  console.log(`Found ${data.length} trigger(s):\n`);
  data.forEach((trigger, index) => {
    console.log(`${index + 1}. ${trigger.trigger_name}`);
    console.log(`   Timing: ${trigger.action_timing || 'N/A'}`);
    console.log(`   Event: ${trigger.event_manipulation}`);
    if (trigger.function_name) {
      console.log(`   Function: ${trigger.function_name}()`);
    }
    if (trigger.action_statement) {
      console.log(`   Statement: ${trigger.action_statement.substring(0, 100)}...`);
    }
    console.log('');
  });
}

checkTriggers().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
