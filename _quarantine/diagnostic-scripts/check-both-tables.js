#!/usr/bin/env node

/**
 * Check Both ai_analysis and incident_reports Tables
 * To understand the data flow mystery
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBothTables(userId) {
  console.log('🔍 Checking Both Tables for User:', userId);
  console.log('─'.repeat(80));

  try {
    // Check ai_analysis table
    const { data: aiAnalysis, error: aiError } = await supabase
      .from('ai_analysis')
      .select('id, created_at, summary, combined_report')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false });

    if (aiError) {
      console.log('⚠️  Error checking ai_analysis:', aiError.message);
    } else {
      console.log(`\n📊 ai_analysis table: ${aiAnalysis?.length || 0} record(s)`);
      if (aiAnalysis && aiAnalysis.length > 0) {
        aiAnalysis.forEach((rec, i) => {
          console.log(`   ${i + 1}. Created: ${new Date(rec.created_at).toLocaleString('en-GB')}`);
          console.log(`      Summary: ${rec.summary ? rec.summary.substring(0, 60) + '...' : '(empty)'}`);
          console.log(`      Combined Report: ${rec.combined_report ? rec.combined_report.length + ' chars' : '(empty)'}`);
        });
      }
    }

    // Check incident_reports AI fields
    const { data: incidents, error: incError } = await supabase
      .from('incident_reports')
      .select('id, created_at, voice_transcription, ai_summary, closing_statement, analysis_metadata')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false });

    if (incError) {
      console.log('⚠️  Error checking incident_reports:', incError.message);
    } else {
      console.log(`\n📄 incident_reports table: ${incidents?.length || 0} record(s)`);
      if (incidents && incidents.length > 0) {
        incidents.forEach((rec, i) => {
          console.log(`   ${i + 1}. Created: ${new Date(rec.created_at).toLocaleString('en-GB')}`);
          const meta = rec.analysis_metadata;
          if (meta && meta.timestamp) {
            console.log(`      AI Generated: ${new Date(meta.timestamp).toLocaleString('en-GB')}`);
          }
          console.log(`      Transcription: ${rec.voice_transcription ? rec.voice_transcription.length + ' chars' : '(empty)'}`);
          console.log(`      AI Summary: ${rec.ai_summary ? rec.ai_summary.length + ' chars' : '(empty)'}`);
          console.log(`      Closing Statement: ${rec.closing_statement ? rec.closing_statement.length + ' chars' : '(empty)'}`);
        });
      }
    }

    console.log('\n' + '─'.repeat(80));
    console.log('🔍 Analysis:');
    const hasAiAnalysis = aiAnalysis && aiAnalysis.length > 0;
    const hasIncidentData = incidents && incidents.some(i => i.ai_summary || i.closing_statement);

    if (hasAiAnalysis && hasIncidentData) {
      console.log('✅ Data in BOTH tables - audit trail working as expected');
    } else if (!hasAiAnalysis && hasIncidentData) {
      console.log('⚠️  Data only in incident_reports - ai_analysis audit trail missing');
    } else if (hasAiAnalysis && !hasIncidentData) {
      console.log('❌ Data only in ai_analysis - BUG: not flowing to incident_reports!');
    } else {
      console.log('⚠️  No AI analysis data found in either table');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node check-both-tables.js <user-id>');
  process.exit(1);
}

checkBothTables(userId);
