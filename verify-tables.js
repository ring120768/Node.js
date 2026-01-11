/**
 * Verify Missing Tables Were Created
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyTables() {
  console.log('\n🔍 VERIFYING TABLE EXISTENCE\n');
  console.log('='.repeat(60));

  const tables = [
    'user_signup',
    'incident_reports',
    'incident_other_vehicles',
    'incident_witnesses',
    'user_documents',
    'temp_uploads',
    'ai_transcription',
    'ai_listening_transcripts',
    'completed_incident_forms'
  ];

  const results = [];

  for (const tableName of tables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results.push({
          table: tableName,
          exists: false,
          error: error.message
        });
      } else {
        results.push({
          table: tableName,
          exists: true,
          count: count || 0
        });
      }
    } catch (error) {
      results.push({
        table: tableName,
        exists: false,
        error: error.message
      });
    }
  }

  // Display results
  console.log('\n📊 Table Status:\n');

  results.forEach(result => {
    if (result.exists) {
      console.log(`✅ ${result.table.padEnd(30)} - EXISTS (${result.count} records)`);
    } else {
      console.log(`❌ ${result.table.padEnd(30)} - MISSING`);
      console.log(`   Error: ${result.error}`);
    }
  });

  const allExist = results.every(r => r.exists);

  console.log('\n' + '='.repeat(60));

  if (allExist) {
    console.log('✅ ALL TABLES EXIST - Database is ready!\n');
  } else {
    console.log('⚠️  Some tables are missing - see errors above\n');
  }

  return allExist;
}

verifyTables()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
