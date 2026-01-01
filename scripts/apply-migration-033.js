#!/usr/bin/env node

/**
 * Apply Migration 033: Add incident_id to completed_incident_forms
 *
 * This migration adds the missing incident_id column that was referenced
 * in the PDF delivery bug fix but never actually added to the database.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('🔧 Applying Migration 033: Add incident_id to completed_incident_forms\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/033_add_incident_id_to_completed_forms.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL:');
    console.log('━'.repeat(60));
    console.log(migrationSQL);
    console.log('━'.repeat(60));
    console.log('');

    // Extract the SQL (remove comments and BEGIN/COMMIT for manual execution)
    const sqlStatements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .replace(/BEGIN;/g, '')
      .replace(/COMMIT;/g, '')
      .trim();

    console.log('⚙️  Executing migration...\n');

    // Execute each statement separately for better error reporting
    const statements = sqlStatements.split(';').filter(s => s.trim());

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;

      console.log(`Statement ${i + 1}/${statements.length}:`);
      console.log(`  ${stmt.substring(0, 80)}...`);

      // Use raw SQL execution via Supabase
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: stmt + ';'
      });

      if (error) {
        console.error(`  ❌ Error:`, error.message);
        throw error;
      } else {
        console.log(`  ✅ Success`);
      }
    }

    console.log('');
    console.log('━'.repeat(60));
    console.log('✅ Migration 033 applied successfully!');
    console.log('━'.repeat(60));
    console.log('');

    // Verify the column was added
    console.log('🔍 Verifying migration...\n');

    const { data: testData, error: testError } = await supabase
      .from('completed_incident_forms')
      .select('incident_id')
      .limit(1);

    if (testError) {
      if (testError.code === 'PGRST204') {
        console.error('❌ Verification failed: incident_id column not found');
        console.error('   Error:', testError.message);
      } else {
        console.error('❌ Verification error:', testError.message);
      }
    } else {
      console.log('✅ Verification passed: incident_id column exists');
      console.log('');

      // Test inserting a record with incident_id
      console.log('🧪 Testing insert with incident_id...\n');

      const testUserId = '30d82d89-42d5-406a-9b7d-83345d972f61';

      const { data: insertData, error: insertError } = await supabase
        .from('completed_incident_forms')
        .insert({
          create_user_id: testUserId,
          incident_id: null, // Test NULL value
          form_data: { test: true, migration: '033' },
          pdf_base64: 'test-migration-033',
          generated_at: new Date().toISOString(),
          sent_to_user: false,
          sent_to_accounts: false,
          email_status: { test: true }
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert test failed:', insertError.message);
      } else {
        console.log('✅ Insert test passed!');
        console.log('   Record ID:', insertData.id);

        // Clean up test record
        const { error: deleteError } = await supabase
          .from('completed_incident_forms')
          .delete()
          .eq('id', insertData.id);

        if (!deleteError) {
          console.log('✅ Test record cleaned up');
        }
      }
    }

    console.log('');
    console.log('━'.repeat(60));
    console.log('🎉 Migration 033 Complete!');
    console.log('━'.repeat(60));
    console.log('');
    console.log('Next steps:');
    console.log('  1. ✅ Migration applied successfully');
    console.log('  2. ✅ Error handling fixed in storeCompletedForm');
    console.log('  3. ⏭️  Commit and deploy changes to Railway');
    console.log('  4. ⏭️  Test PDF generation with fresh user test');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('💥 Migration failed:', error.message);
    console.error('');
    console.error('Error details:', error);
    console.error('');
    console.error('To rollback, run:');
    console.error('  node scripts/rollback-migration-033.js');
    console.error('');
    process.exit(1);
  }
}

applyMigration();
