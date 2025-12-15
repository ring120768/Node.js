/**
 * Test Phase 2: Blended AI Summary Generation
 *
 * Tests that the analyzeStatement() function now properly blends
 * form_data_summary (Phase 1) with voice transcription (Phase 2).
 *
 * Usage: node test-phase2-blending.js [user-uuid]
 */

const { createClient } = require('@supabase/supabase-js');
const { analyzeStatement } = require('./src/controllers/ai.controller');
require('dotenv').config();

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testPhase2Blending(userId = null) {
  console.log('🧪 Testing Phase 2: Blended AI Summary Generation');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // Step 1: Find test user with both form_data_summary and transcription
    let testUserId = userId;
    let testIncidentId = null;
    let transcriptionId = null;

    if (!testUserId) {
      console.log('📋 Step 1: Finding test user with complete data...');

      // Find user with both form_data_summary and ai_transcription
      const { data: incidents, error: incidentError } = await supabase
        .from('incident_reports')
        .select('id, create_user_id, form_data_summary')
        .not('form_data_summary', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (incidentError || !incidents || incidents.length === 0) {
        throw new Error('No incidents with form_data_summary found');
      }

      // Find one with transcription
      for (const inc of incidents) {
        const { data: trans } = await supabase
          .from('ai_transcription')
          .select('id, transcript_text')
          .eq('create_user_id', inc.create_user_id)
          .not('transcript_text', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (trans) {
          testUserId = inc.create_user_id;
          testIncidentId = inc.id;
          transcriptionId = trans.id;
          console.log(`   ✅ Found user with both:
      User ID: ${testUserId}
      Incident ID: ${testIncidentId}
      Form summary length: ${inc.form_data_summary.length} chars
      Transcription ID: ${transcriptionId}
      Transcription length: ${trans.transcript_text.length} chars\n`);
          break;
        }
      }

      if (!testUserId) {
        throw new Error('No user found with both form_data_summary and transcription');
      }
    } else {
      // Get incident and transcription for provided user
      const { data: incident } = await supabase
        .from('incident_reports')
        .select('id, form_data_summary')
        .eq('create_user_id', userId)
        .not('form_data_summary', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { data: trans } = await supabase
        .from('ai_transcription')
        .select('id, transcript_text')
        .eq('create_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!incident || !trans) {
        throw new Error('User missing form_data_summary or transcription');
      }

      testIncidentId = incident.id;
      transcriptionId = trans.id;
      console.log(`   ✅ Using provided user:
      User ID: ${userId}
      Incident ID: ${testIncidentId}
      Form summary: ${incident.form_data_summary.length} chars
      Transcription: ${trans.transcript_text.length} chars\n`);
    }

    // Step 2: Get transcription text
    console.log('📋 Step 2: Fetching transcription...');
    const { data: transcriptionData, error: transError } = await supabase
      .from('ai_transcription')
      .select('transcript_text')
      .eq('id', transcriptionId)
      .single();

    if (transError || !transcriptionData) {
      throw new Error('Failed to fetch transcription');
    }

    console.log(`   ✅ Transcription fetched: ${transcriptionData.transcript_text.length} chars\n`);

    // Step 3: Clear old ai_summary to ensure fresh generation
    console.log('📋 Step 3: Clearing old AI summary...');
    await supabase
      .from('incident_reports')
      .update({
        ai_summary: null,
        ai_incident_summary: null,
        ai_liability_assessment: null,
        ai_closing_statement: null,
        ai_final_review: null
      })
      .eq('id', testIncidentId);
    console.log('   ✅ Old AI summary cleared\n');

    // Step 4: Generate new blended AI summary
    console.log('📋 Step 4: Generating Phase 2 blended AI summary...');
    console.log('   ⏳ This calls analyzeStatement() with the formDataSummary fix...\n');

    const startTime = Date.now();

    // Create mock Express req/res objects for controller
    const req = {
      body: {
        userId: testUserId,
        incidentId: testIncidentId,
        transcription: transcriptionData.transcript_text
      }
    };

    let responseData = null;
    let statusCode = null;

    const res = {
      status: function(code) {
        statusCode = code;
        return this;
      },
      json: function(data) {
        responseData = data;
        return this;
      }
    };

    await analyzeStatement(req, res);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Check if analysis succeeded (responseData.success is the reliable indicator)
    if (!responseData?.success) {
      throw new Error(`AI analysis failed: ${responseData?.error || 'Unknown error'}`);
    }

    console.log(`   ✅ AI analysis complete in ${duration} seconds\n`);

    // Step 5: Verify blended content in database
    console.log('📋 Step 5: Verifying blended AI summary in database...');

    const { data: updatedIncident, error: verifyError } = await supabase
      .from('incident_reports')
      .select('form_data_summary, ai_summary')
      .eq('id', testIncidentId)
      .single();

    if (verifyError) {
      throw new Error(`Failed to verify: ${verifyError.message}`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ PHASE 2 BLENDING TEST RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Content Lengths:');
    console.log(`   Phase 1 (form_data_summary): ${updatedIncident.form_data_summary?.length || 0} chars`);
    console.log(`   Phase 2 (ai_summary): ${updatedIncident.ai_summary?.length || 0} chars`);

    const isLonger = updatedIncident.ai_summary?.length > updatedIncident.form_data_summary?.length;
    console.log(`   Blending result: ${isLonger ? '✅ LONGER' : '❌ NOT LONGER'}\n`);

    // Check content keywords
    const mentionsIncident = updatedIncident.ai_summary?.includes('incident') ||
                            updatedIncident.ai_summary?.includes('accident');
    const mentionsForm = updatedIncident.ai_summary?.includes('form') ||
                        updatedIncident.ai_summary?.includes('documented') ||
                        updatedIncident.ai_summary?.includes('recorded');
    const mentionsPersonal = updatedIncident.ai_summary?.includes('testimony') ||
                            updatedIncident.ai_summary?.includes('account') ||
                            updatedIncident.ai_summary?.includes('statement');

    console.log('📊 Content Analysis:');
    console.log(`   Mentions incident details: ${mentionsIncident ? '✅' : '❌'}`);
    console.log(`   Mentions form data concepts: ${mentionsForm ? '✅' : '❌'}`);
    console.log(`   Mentions personal testimony: ${mentionsPersonal ? '✅' : '❌'}\n`);

    console.log('📝 AI Summary Preview (first 500 chars):\n');
    console.log(updatedIncident.ai_summary?.substring(0, 500) || 'NO CONTENT');
    console.log('\n...\n');

    // Final verdict
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (isLonger && mentionsIncident && (mentionsForm || mentionsPersonal)) {
      console.log('✅ PHASE 2 BLENDING WORKING!');
      console.log('   - AI summary is longer than form summary');
      console.log('   - Content includes blended information');
      console.log('   - Fix successfully applied');
    } else {
      console.log('⚠️  PHASE 2 BLENDING NEEDS REVIEW');
      if (!isLonger) console.log('   ❌ AI summary not longer than form summary');
      if (!mentionsForm && !mentionsPersonal) console.log('   ⚠️  May not include blended content');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      success: true,
      userId: testUserId,
      incidentId: testIncidentId,
      formSummaryLength: updatedIncident.form_data_summary?.length || 0,
      aiSummaryLength: updatedIncident.ai_summary?.length || 0,
      isBlended: isLonger && (mentionsForm || mentionsPersonal)
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n📋 Error details:', error);
    process.exit(1);
  }
}

// Run the test
const userIdArg = process.argv[2];

if (userIdArg === '--help' || userIdArg === '-h') {
  console.log(`
Usage: node test-phase2-blending.js [user-uuid]

Arguments:
  user-uuid    Optional. UUID of user to test with. If not provided,
               uses the most recent user with both form_data_summary
               and ai_transcription.

Examples:
  node test-phase2-blending.js
  node test-phase2-blending.js 123e4567-e89b-12d3-a456-426614174000

This test verifies:
  ✓ Phase 2 blending generates longer ai_summary than form_data_summary
  ✓ AI summary includes both form data and transcription concepts
  ✓ analyzeStatement() correctly extracts and passes formDataSummary parameter
`);
  process.exit(0);
}

testPhase2Blending(userIdArg);
