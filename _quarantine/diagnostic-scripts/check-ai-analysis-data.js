#!/usr/bin/env node

/**
 * Check if AI analysis data exists in database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAnalysisData() {
  console.log('🔍 Checking for AI analysis data in database...\n');

  // Check for any records with ai_summary
  const { data: records, error } = await supabase
    .from('incident_reports')
    .select('id, create_user_id, ai_summary, closing_statement, final_review, created_at')
    .not('ai_summary', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error querying database:', error.message);
    process.exit(1);
  }

  if (!records || records.length === 0) {
    console.log('⚠️  No AI analysis data found in database');
    console.log('   This could mean:');
    console.log('   1. No AI analysis has been generated yet');
    console.log('   2. Analysis was generated but not stored properly');
    console.log('   3. Data exists but ai_summary column is empty');
    process.exit(0);
  }

  console.log(`✅ Found ${records.length} incident(s) with AI analysis:\n`);

  records.forEach((record, index) => {
    console.log(`Record ${index + 1}:`);
    console.log(`  Incident ID: ${record.id}`);
    console.log(`  User ID: ${record.create_user_id}`);
    console.log(`  Created: ${record.created_at}`);
    console.log(`  ai_summary length: ${record.ai_summary?.length || 0} chars`);
    console.log(`  closing_statement length: ${record.closing_statement?.length || 0} chars`);
    console.log(`  final_review length: ${record.final_review?.length || 0} chars`);
    
    if (record.ai_summary) {
      console.log(`  ai_summary preview: ${record.ai_summary.substring(0, 100)}...`);
    }
    console.log('');
  });
}

checkAnalysisData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
