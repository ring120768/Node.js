#!/usr/bin/env node

/**
 * Normalize ALL emails to lowercase across the entire database
 *
 * This fixes a systemic issue where emails were stored with inconsistent
 * capitalization, causing case-sensitive queries to fail.
 *
 * RFC 5321: Email addresses are case-insensitive, so we normalize to lowercase.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Tables that contain email columns
const TABLES_WITH_EMAILS = [
  { table: 'user_signup', columns: ['email', 'recovery_breakdown_email'] },
  // Add more tables as needed
  // Note: incident_reports doesn't have email columns in current schema
];

async function normalizeEmails() {
  console.log('\n📧 Email Normalization Script');
  console.log('='.repeat(70));
  console.log('\n⚠️  This will convert ALL emails to lowercase across the database');
  console.log('   This ensures case-insensitive email matching per RFC 5321\n');

  let totalUpdated = 0;
  let totalErrors = 0;

  for (const { table, columns } of TABLES_WITH_EMAILS) {
    console.log(`\n📊 Processing table: ${table}`);
    console.log('-'.repeat(70));

    for (const column of columns) {
      try {
        // 1. Fetch all records with this email column
        const { data: records, error: fetchError } = await supabase
          .from(table)
          .select(`id, ${column}`)
          .not(column, 'is', null);

        if (fetchError) {
          console.error(`❌ Error fetching from ${table}.${column}:`, fetchError.message);
          totalErrors++;
          continue;
        }

        if (!records || records.length === 0) {
          console.log(`   ℹ️  No records in ${column}`);
          continue;
        }

        console.log(`   Found ${records.length} records in ${column}`);

        // 2. Find records that need normalization
        const needsUpdate = records.filter(r => {
          const email = r[column];
          return email && email !== email.toLowerCase();
        });

        if (needsUpdate.length === 0) {
          console.log(`   ✅ All emails already lowercase`);
          continue;
        }

        console.log(`   🔄 ${needsUpdate.length} emails need normalization`);

        // 3. Update each record
        let updated = 0;
        let errors = 0;

        for (const record of needsUpdate) {
          const originalEmail = record[column];
          const normalizedEmail = originalEmail.toLowerCase();

          const { error: updateError } = await supabase
            .from(table)
            .update({ [column]: normalizedEmail })
            .eq('id', record.id);

          if (updateError) {
            console.error(`      ❌ Failed to update ${originalEmail}:`, updateError.message);
            errors++;
          } else {
            console.log(`      ✅ ${originalEmail} → ${normalizedEmail}`);
            updated++;
          }
        }

        console.log(`   📈 Updated: ${updated}, Errors: ${errors}`);
        totalUpdated += updated;
        totalErrors += errors;

      } catch (error) {
        console.error(`❌ Unexpected error in ${table}.${column}:`, error.message);
        totalErrors++;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY:\n');
  console.log(`✅ Total emails normalized: ${totalUpdated}`);
  console.log(`❌ Total errors: ${totalErrors}`);

  if (totalErrors === 0 && totalUpdated > 0) {
    console.log('\n🎉 All emails successfully normalized to lowercase!');
  } else if (totalErrors === 0 && totalUpdated === 0) {
    console.log('\n✅ All emails were already lowercase!');
  } else {
    console.log('\n⚠️  Some errors occurred. Review output above.');
  }

  console.log('');
}

// Run
normalizeEmails().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
