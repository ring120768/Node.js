#!/usr/bin/env node
/**
 * Apply Email Retry Queue Migration
 * Run: node scripts/apply-email-queue-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('📦 Applying Email Retry Queue Migration...\n');

  // Step 1: Create email_retry_queue table
  console.log('1. Creating email_retry_queue table...');

  const { error: createError } = await supabase.from('email_retry_queue').select('id').limit(1);

  if (createError && createError.message.includes('does not exist')) {
    console.log('   Table does not exist - please run the following SQL in Supabase SQL Editor:\n');
    console.log('   File: migrations/020_email_retry_queue.sql\n');
    console.log('   Or copy this SQL:\n');
    console.log(`
CREATE TABLE email_retry_queue (
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

CREATE INDEX idx_email_retry_queue_status_next_retry
  ON email_retry_queue(status, next_retry_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX idx_email_retry_queue_user ON email_retry_queue(create_user_id);

ALTER TABLE email_retry_queue ENABLE ROW LEVEL SECURITY;
    `);
    return false;
  } else {
    console.log('   ✅ email_retry_queue table exists');
  }

  // Step 2: Add columns to completed_incident_forms
  console.log('\n2. Checking completed_incident_forms columns...');

  const columnsToAdd = [
    { name: 'email_attempts', type: 'INTEGER', default: '0' },
    { name: 'email_last_error', type: 'TEXT', default: null },
    { name: 'email_retry_queued', type: 'BOOLEAN', default: 'FALSE' }
  ];

  for (const col of columnsToAdd) {
    const { data, error } = await supabase
      .from('completed_incident_forms')
      .select(col.name)
      .limit(1);

    if (error && error.message.includes(col.name)) {
      console.log(`   ⚠️ Column ${col.name} needs to be added manually`);
      console.log(`   SQL: ALTER TABLE completed_incident_forms ADD COLUMN ${col.name} ${col.type}${col.default ? ` DEFAULT ${col.default}` : ''};`);
    } else {
      console.log(`   ✅ Column ${col.name} exists`);
    }
  }

  console.log('\n✅ Migration check complete');
  return true;
}

applyMigration()
  .then(success => {
    if (!success) {
      console.log('\n⚠️ Some manual steps required - see above');
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
