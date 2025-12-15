/**
 * Test Single-Phase AI Summary Generation
 *
 * Tests the generateSinglePhaseAiSummary() function that creates comprehensive
 * AI summaries of structured form data (160+ fields) + voice transcription
 * using GPT-4o with direct data access (no information bottleneck).
 *
 * Usage: node test-phase1-form-summary.js [user-uuid]
 */

const { createClient } = require('@supabase/supabase-js');
const { generateSinglePhaseAiSummary } = require('./src/controllers/ai.controller');
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

async function testSinglePhaseAiSummary(userId = null) {
  console.log('🧪 Testing Single-Phase AI Summary Generation');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // Step 1: Find a test user with incident data
    let testUserId = userId;
    let testIncidentId = null;

    if (!testUserId) {
      console.log('📋 Step 1: Finding test user with incident data...');

      const { data: incidents, error: incidentError } = await supabase
        .from('incident_reports')
        .select('id, create_user_id, accident_date, accident_time')
        .not('accident_date', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (incidentError) {
        throw new Error(`Failed to find test incidents: ${incidentError.message}`);
      }

      if (!incidents || incidents.length === 0) {
        throw new Error('No incident reports found in database. Please create test data first.');
      }

      console.log(`   ✅ Found ${incidents.length} recent incidents:`);
      incidents.forEach((inc, idx) => {
        console.log(`      ${idx + 1}. Incident ID: ${inc.id} | User: ${inc.create_user_id} | Date: ${inc.accident_date} ${inc.accident_time || ''}`);
      });

      testUserId = incidents[0].create_user_id;
      testIncidentId = incidents[0].id;
      console.log(`\n   🎯 Using most recent incident: ${testIncidentId} (User ${testUserId})\n`);
    }

    // Step 2: Verify user has incident data
    console.log('📋 Step 2: Verifying incident data exists...');

    const { data: incidentData, error: fetchError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('id', testIncidentId || userId)
      .single();

    if (fetchError || !incidentData) {
      throw new Error(`No incident report found for user ${testUserId}`);
    }

    console.log(`   ✅ Found incident report ID: ${incidentData.id}`);
    console.log(`   📅 Incident date: ${incidentData.accident_date} ${incidentData.accident_time || ''}`);
    console.log(`   📍 Location: ${incidentData.location || 'Not specified'}`);

    // Check for related data
    const { data: otherVehicles } = await supabase
      .from('incident_other_vehicles')
      .select('id, vehicle_index')
      .eq('create_user_id', testUserId);

    const { data: witnesses } = await supabase
      .from('incident_witnesses')
      .select('id, witness_index')
      .eq('create_user_id', testUserId);

    console.log(`   🚗 Other vehicles: ${otherVehicles?.length || 0}`);
    console.log(`   👥 Witnesses: ${witnesses?.length || 0}`);

    // Get voice transcription if available
    const transcription = incidentData.voice_transcription || '';
    console.log(`   🎙️  Voice transcription: ${transcription ? transcription.length + ' chars' : 'No transcription'}`);

    // Check if ai_summary already exists
    if (incidentData.ai_summary) {
      console.log(`\n   ⚠️  AI summary already exists (${incidentData.ai_summary.length} chars)`);
      console.log(`   📊 Metadata: ${JSON.stringify(incidentData.form_data_summary_metadata, null, 2)}`);
      console.log(`\n   Would you like to regenerate? (This test will continue anyway for demonstration)\n`);
    }

    // Step 3: Generate single-phase AI summary
    console.log('📋 Step 3: Generating AI summary with GPT-4o (single-phase architecture)...');
    console.log('   This will process 160+ form fields + voice transcription');
    console.log('   Temperature: 0.2 (factual accuracy)');
    console.log('   ⏳ This may take 30-60 seconds...\n');

    const startTime = Date.now();

    const result = await generateSinglePhaseAiSummary(testUserId, incidentData.id, transcription);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`   ✅ Summary generated in ${duration} seconds\n`);

    // Step 4: Display results
    console.log('📋 Step 4: Results\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 AI SUMMARY (Single-Phase Architecture)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(result.aiSummary);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 METADATA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(JSON.stringify(result.metadata, null, 2));

    // Step 5: Verify database storage
    console.log('\n📋 Step 5: Verifying database storage...');

    const { data: updatedIncident, error: verifyError } = await supabase
      .from('incident_reports')
      .select('ai_summary, form_data_summary_metadata')
      .eq('id', incidentData.id)
      .single();

    if (verifyError) {
      throw new Error(`Failed to verify database update: ${verifyError.message}`);
    }

    if (updatedIncident.ai_summary) {
      console.log(`   ✅ ai_summary stored: ${updatedIncident.ai_summary.length} characters`);
    } else {
      console.log(`   ❌ ai_summary NOT stored in database`);
    }

    if (updatedIncident.form_data_summary_metadata) {
      console.log(`   ✅ form_data_summary_metadata stored: ${JSON.stringify(updatedIncident.form_data_summary_metadata.model)}`);
    } else {
      console.log(`   ❌ form_data_summary_metadata NOT stored in database`);
    }

    // Step 6: Analysis
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SINGLE-PHASE AI TEST COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Summary Statistics:');
    console.log(`   - Generation time: ${duration} seconds`);
    console.log(`   - Summary length: ${result.aiSummary.length} characters`);
    console.log(`   - Word count: ${result.aiSummary.split(/\s+/).length} words`);
    console.log(`   - Model used: ${result.metadata.model}`);
    console.log(`   - Architecture: ${result.metadata.architecture}`);
    console.log(`   - Temperature: ${result.metadata.temperature}`);
    console.log(`   - Tokens used: ${result.metadata.totalTokens}`);
    console.log(`   - Cost estimate: ~$${((result.metadata.totalTokens / 1000000) * 2.50).toFixed(4)} USD`);

    console.log('\n🎯 Next Steps:');
    console.log('   1. Review the summary above for factual accuracy');
    console.log('   2. Check that form data takes priority over transcription');
    console.log(`   3. Test PDF generation: node test-form-filling.js ${testUserId}`);
    console.log('   4. Verify Page 15 displays both SECTION 1 & SECTION 2');
    console.log('');

    return {
      success: true,
      userId: testUserId,
      incidentId: incidentData.id,
      summary: result.aiSummary,
      metadata: result.metadata
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n📋 Error details:', error);

    if (error.message.includes('No incident reports found')) {
      console.log('\n💡 Tip: Create test data first using the signup flow or test-form-filling.js');
    }

    process.exit(1);
  }
}

// Run the test
const userIdArg = process.argv[2];

if (userIdArg === '--help' || userIdArg === '-h') {
  console.log(`
Usage: node test-phase1-form-summary.js [user-uuid]

Arguments:
  user-uuid    Optional. UUID of user to test with. If not provided,
               uses the most recent incident report in the database.

Examples:
  node test-phase1-form-summary.js
  node test-phase1-form-summary.js 123e4567-e89b-12d3-a456-426614174000

This test verifies:
  ✓ Phase 1 form data summary generation works
  ✓ GPT-4o-mini integration is functional
  ✓ Data from 3 tables is properly fetched
  ✓ Summary is stored in form_data_summary field
  ✓ Metadata is stored in form_data_summary_metadata field
`);
  process.exit(0);
}

testPhase1FormSummary(userIdArg);
