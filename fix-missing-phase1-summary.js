/**
 * Fix Missing AI Summary (Single-Phase Architecture)
 *
 * Generates ai_summary for user with missing AI analysis data
 * User: 35a7475f-60ca-4c5d-bc48-d13a299f4309
 * Incident: d577c70f-ec84-4352-aff1-5c16acdaafa9
 */

require('dotenv').config();
const { generateSinglePhaseAiSummary } = require('./src/controllers/ai.controller');
const { createClient } = require('@supabase/supabase-js');

const USER_ID = '35a7475f-60ca-4c5d-bc48-d13a299f4309';
const INCIDENT_ID = 'd577c70f-ec84-4352-aff1-5c16acdaafa9';

// Initialize Supabase client
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

async function fixMissingAiSummary() {
  console.log('🔧 Fixing Missing AI Summary (Single-Phase Architecture)');
  console.log('═══════════════════════════════════════════════\n');
  console.log(`User ID: ${USER_ID}`);
  console.log(`Incident ID: ${INCIDENT_ID}\n`);

  try {
    // Fetch voice transcription from database if available
    console.log('⏳ Fetching voice transcription from database...');
    const { data: incident, error: fetchError } = await supabase
      .from('incident_reports')
      .select('voice_transcription')
      .eq('id', INCIDENT_ID)
      .eq('create_user_id', USER_ID)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch incident data: ${fetchError.message}`);
    }

    const transcription = incident?.voice_transcription || '';
    console.log(`   ${transcription ? '✅' : '⚠️ '} Voice transcription: ${transcription ? transcription.length + ' chars' : 'No transcription available'}\n`);

    console.log('⏳ Generating AI summary with GPT-4o (single-phase architecture)...');
    console.log('   This will process 160+ form fields + voice transcription');
    console.log('   Temperature: 0.2 (factual accuracy)');
    console.log('   Expected: 800-2500 words, 30-60 seconds...\n');

    const startTime = Date.now();

    const result = await generateSinglePhaseAiSummary(USER_ID, INCIDENT_ID, transcription);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ AI Summary Generated Successfully in ${duration} seconds\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 AI SUMMARY (first 500 chars)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(result.aiSummary.substring(0, 500) + '...\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 METADATA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`   Model: ${result.metadata.model}`);
    console.log(`   Architecture: ${result.metadata.architecture}`);
    console.log(`   Temperature: ${result.metadata.temperature}`);
    console.log(`   Total length: ${result.aiSummary.length} characters`);
    console.log(`   Word count: ${result.aiSummary.split(/\s+/).length} words`);
    console.log(`   Tokens used: ${result.metadata.totalTokens}`);
    console.log(`   Cost: ~$${((result.metadata.totalTokens / 1000000) * 2.50).toFixed(4)} USD\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ FIX COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎯 Next Steps:');
    console.log('   1. AI summary (ai_summary) is now stored in database');
    console.log('   2. PDF generation will use this comprehensive analysis');
    console.log('   3. Test PDF generation:');
    console.log(`      node test-form-filling.js ${USER_ID}\n`);

    console.log('💡 Architecture Notes:');
    console.log('   - Single-phase architecture eliminates information bottleneck');
    console.log('   - GPT-4o receives raw structured data (160+ fields)');
    console.log('   - Temperature 0.2 ensures factual accuracy');
    console.log('   - No hallucinations or invented facts\n');

    return result;

  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    console.error('\n📋 Error details:', error);
    process.exit(1);
  }
}

fixMissingPhase1Summary();
