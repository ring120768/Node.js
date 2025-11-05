/**
 * Simple script to create incident_witnesses table
 * Run this if the full migration fails
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTable() {
  console.log('\n📋 Creating incident_witnesses table...\n');

  // Note: This is a simplified version
  // For production, run the full SQL migration in Supabase dashboard

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.incident_witnesses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      incident_report_id UUID NOT NULL,
      create_user_id UUID NOT NULL,
      witness_number INTEGER NOT NULL DEFAULT 1,
      witness_name TEXT NOT NULL,
      witness_phone TEXT,
      witness_email TEXT,
      witness_address TEXT,
      witness_statement TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      CONSTRAINT witness_number_positive CHECK (witness_number > 0)
    );

    CREATE INDEX IF NOT EXISTS idx_incident_witnesses_incident_report_id
    ON public.incident_witnesses(incident_report_id);

    CREATE INDEX IF NOT EXISTS idx_incident_witnesses_create_user_id
    ON public.incident_witnesses(create_user_id);

    ALTER TABLE public.incident_witnesses ENABLE ROW LEVEL SECURITY;
  `;

  console.log('⚠️  NOTE: This is a simplified creation script.');
  console.log('⚠️  For full migration with RLS policies, foreign keys, and triggers,');
  console.log('⚠️  run the SQL file in Supabase dashboard SQL editor:');
  console.log('⚠️  supabase/migrations/20251104000000_create_incident_witnesses_table.sql\n');

  console.log('📂 Please run the full migration SQL in Supabase dashboard.');
  console.log('   Go to: SQL Editor → New Query → Paste the migration SQL\n');

  // Verify if table already exists
  try {
    const { data, error } = await supabase
      .from('incident_witnesses')
      .select('*')
      .limit(0);

    if (!error) {
      console.log('✅ Table already exists!\n');
      return;
    }

    console.log('❌ Table does not exist yet');
    console.log('   Please create it using the SQL migration file\n');
  } catch (error) {
    console.log('❌ Could not verify table:', error.message, '\n');
  }
}

createTable();
