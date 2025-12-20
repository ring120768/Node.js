#!/usr/bin/env node
/**
 * Apply Email Retry Queue Migration
 * Creates the email_retry_queue table and adds email tracking columns
 *
 * Run: node scripts/apply-email-retry-queue-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('📦 Applying Email Retry Queue Migration...\n');

  // Step 1: Check if table already exists
  console.log('1. Checking if email_retry_queue table exists...');
  const { data: existingTable, error: checkError } = await supabase
    .from('email_retry_queue')
    .select('id')
    .limit(1);

  if (!checkError || !checkError.message.includes('does not exist')) {
    console.log('   ✅ email_retry_queue table already exists');
    return true;
  }

  console.log('   ⚠️ Table does not exist - creating...\n');

  // The table needs to be created via SQL Editor in Supabase Dashboard
  // because the JS client can't run DDL statements
  console.log('   📋 Please run this SQL in the Supabase SQL Editor:\n');
  console.log('   https://supabase.com/dashboard/project/dtvcncnmqxnnyuphivtq/sql\n');

  const sql = `
-- Create email_retry_queue table
CREATE TABLE IF NOT EXISTS email_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  create_user_id UUID NOT NULL,
  incident_id UUID,
  completed_form_id UUID,
  email_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT,
  template_name VARCHAR(100),
  template_data JSONB,
  pdf_storage_path TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'abandoned')),
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  last_error TEXT,
  error_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  source VARCHAR(50),
  priority INTEGER DEFAULT 10
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_email_retry_queue_status_next_retry
  ON email_retry_queue(status, next_retry_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_email_retry_queue_user
  ON email_retry_queue(create_user_id);

CREATE INDEX IF NOT EXISTS idx_email_retry_queue_type
  ON email_retry_queue(email_type);

-- Add columns to completed_incident_forms for email tracking
ALTER TABLE completed_incident_forms
  ADD COLUMN IF NOT EXISTS email_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_last_error TEXT,
  ADD COLUMN IF NOT EXISTS email_retry_queued BOOLEAN DEFAULT FALSE;

-- RLS Policies
ALTER TABLE email_retry_queue ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access to email_retry_queue"
  ON email_retry_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own email queue entries (read-only)
CREATE POLICY "Users can view own email queue"
  ON email_retry_queue
  FOR SELECT
  TO authenticated
  USING (create_user_id = auth.uid());
`;

  console.log(sql);
  console.log('\n');

  return false;
}

applyMigration()
  .then(exists => {
    if (exists) {
      console.log('\n✅ Migration complete - table exists');
      process.exit(0);
    } else {
      console.log('⚠️ Please run the SQL above in Supabase Dashboard');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Migration check failed:', err);
    process.exit(1);
  });
