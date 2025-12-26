#!/usr/bin/env node
/**
 * Diagnostic: Check if AI analysis data exists in incident_reports
 *
 * Usage: node check-ai-data.js [userId]
 *
 * If no userId provided, shows latest 10 incident reports with AI field status
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = process.argv[2];

async function checkAIData() {
  console.log('🔍 Checking AI Analysis Data in incident_reports\n');

  if (userId) {
    // Check specific user
    console.log(`Looking up user: ${userId}\n`);

    const { data, error } = await supabase
      .from('incident_reports')
      .select(`
        id,
        create_user_id,
        auth_user_id,
        user_id,
        created_at,
        voice_transcription,
        analysis_metadata,
        quality_review,
        ai_summary,
        closing_statement,
        final_review
      `)
      .or(`auth_user_id.eq.${userId},create_user_id.eq.${userId},user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    if (!data) {
      console.log('❌ No incident report found for this user');
      return;
    }

    console.log('📋 Incident Report Found:\n');
    console.log(`   ID: ${data.id}`);
    console.log(`   Created: ${data.created_at}`);
    console.log('');
    console.log('📊 AI Fields Status:');
    console.log(`   ${data.voice_transcription ? '✅' : '❌'} voice_transcription: ${data.voice_transcription ? data.voice_transcription.substring(0, 80) + '...' : 'EMPTY'}`);
    console.log(`   ${data.analysis_metadata ? '✅' : '❌'} analysis_metadata: ${data.analysis_metadata ? JSON.stringify(data.analysis_metadata).substring(0, 60) : 'EMPTY'}`);
    console.log(`   ${data.quality_review ? '✅' : '❌'} quality_review: ${data.quality_review ? data.quality_review.substring(0, 80) + '...' : 'EMPTY'}`);
    console.log(`   ${data.ai_summary ? '✅' : '❌'} ai_summary: ${data.ai_summary ? data.ai_summary.substring(0, 80) + '...' : 'EMPTY'}`);
    console.log(`   ${data.closing_statement ? '✅' : '❌'} closing_statement: ${data.closing_statement ? data.closing_statement.substring(0, 80) + '...' : 'EMPTY'}`);
    console.log(`   ${data.final_review ? '✅' : '❌'} final_review: ${data.final_review ? data.final_review.substring(0, 80) + '...' : 'EMPTY'}`);

    const aiFieldsPresent = [
      data.voice_transcription,
      data.ai_summary,
      data.closing_statement,
      data.final_review
    ].filter(Boolean).length;

    console.log('');
    if (aiFieldsPresent === 4) {
      console.log('✅ All 4 required AI fields are populated - Pages 13-16 should render correctly');
    } else {
      console.log(`⚠️ Only ${aiFieldsPresent}/4 AI fields populated - Pages 13-16 may be blank`);
      console.log('');
      console.log('💡 To populate AI fields:');
      console.log('   1. User must visit transcription-status.html');
      console.log('   2. Record or upload audio');
      console.log('   3. Click "Analyze" to trigger AI analysis');
      console.log('   4. POST /api/ai/analyze-statement must succeed');
    }

  } else {
    // Show recent incidents with AI status
    console.log('Showing latest 10 incident reports...\n');

    const { data, error } = await supabase
      .from('incident_reports')
      .select(`
        id,
        create_user_id,
        created_at,
        voice_transcription,
        ai_summary,
        closing_statement,
        final_review
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    console.log('ID                                     | Created             | AI Fields');
    console.log('---------------------------------------|---------------------|----------');

    let withAI = 0;
    let withoutAI = 0;

    for (const row of data) {
      const hasVoice = row.voice_transcription ? '✅' : '❌';
      const hasSummary = row.ai_summary ? '✅' : '❌';
      const hasClosing = row.closing_statement ? '✅' : '❌';
      const hasReview = row.final_review ? '✅' : '❌';

      const aiCount = [row.voice_transcription, row.ai_summary, row.closing_statement, row.final_review].filter(Boolean).length;
      if (aiCount === 4) withAI++;
      else withoutAI++;

      console.log(`${row.id} | ${row.created_at?.substring(0, 19)} | ${hasVoice}${hasSummary}${hasClosing}${hasReview} (${aiCount}/4)`);
    }

    console.log('');
    console.log(`Summary: ${withAI} with full AI data, ${withoutAI} missing AI data`);
    console.log('');
    console.log('Legend: ✅voice ✅summary ✅closing ✅review');
    console.log('');
    console.log('To check specific user: node check-ai-data.js <userId>');
  }
}

checkAIData().catch(console.error);
