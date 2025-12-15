/**
 * Test Single-Phase AI Architecture
 *
 * Tests the new single-phase AI summary generation with real data
 * to verify factual accuracy and elimination of hallucinations
 */

require('dotenv').config();
const { generateSinglePhaseAiSummary } = require('./src/controllers/ai.controller.js');
const { createClient } = require('@supabase/supabase-js');

const USER_ID = '35a7475f-60ca-4c5d-bc48-d13a299f4309';
const INCIDENT_ID = 'd577c70f-ec84-4352-aff1-5c16acdaafa9';

// Test transcription (user's personal statement)
const TRANSCRIPTION = `"I was reversing out of a space at Tesco Extra in Watford, Saturday lunchtime so it was absolutely rammed. I'd checked my mirrors, started reversing slowly with my reverse sensors beeping. Suddenly there's this massive crunch - another car reversed into me at the same time from the opposite side. We both stopped immediately. The other driver, elderly gentleman, very apologetic, said he didn't see me. My rear passenger door's got a massive dent, wheel arch's pushed in. His front passenger wing's crumpled. A lady who was loading her shopping saw the whole thing, said we both reversed at exactly the same time. She gave me her number. I got photos of both cars, the parking spaces, and the Tesco car park CCTV cameras - there's one right above where it happened. No injuries but my daughter's car seat's in that door area and I can't fit it in now. Had to leave the car there and get a taxi home."`;

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

async function testNewArchitecture() {
  console.log('🧪 Testing Single-Phase AI Architecture');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('Test Parameters:');
  console.log(`  User ID: ${USER_ID}`);
  console.log(`  Incident ID: ${INCIDENT_ID}`);
  console.log(`  Transcription Length: ${TRANSCRIPTION.length} chars\n`);

  console.log('Expected Corrections (vs Previous Two-Phase Output):');
  console.log('  ✓ Location: "Old Church Hill, Basildon, Essex" (not "Tesco Extra in Watford")');
  console.log('  ✓ Date/Time: "08/12/2025 at 10:30" (not "unspecified")');
  console.log('  ✓ No contradictory injury statements');
  console.log('  ✓ No hallucinated facts');
  console.log('  ✓ DVLA data included\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    console.log('⏳ Calling generateSinglePhaseAiSummary()...\n');

    const startTime = Date.now();
    const result = await generateSinglePhaseAiSummary(USER_ID, INCIDENT_ID, TRANSCRIPTION);
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Generation Successful!\n');

    console.log('📊 Metadata:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(result.metadata, null, 2));
    console.log('');

    const wordCount = result.aiSummary.split(/\s+/).length;
    const charCount = result.aiSummary.length;

    console.log('📏 Summary Statistics:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Words: ${wordCount}`);
    console.log(`  Characters: ${charCount}`);
    console.log(`  Total Elapsed: ${elapsedTime}s`);
    console.log('');

    // Check for expected data points
    console.log('🔍 Factual Accuracy Checks:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const checks = [
      {
        name: 'Correct Location (Basildon)',
        test: result.aiSummary.includes('Basildon'),
        pass: '✅',
        fail: '❌ HALLUCINATION: Location incorrect'
      },
      {
        name: 'No Watford Reference (transcription location)',
        test: !result.aiSummary.includes('Watford') && !result.aiSummary.includes('Tesco'),
        pass: '✅',
        fail: '⚠️  WARNING: Transcription location used instead of form data'
      },
      {
        name: 'Correct Date (08/12/2025)',
        test: result.aiSummary.includes('08/12/2025') || result.aiSummary.includes('8 December 2025'),
        pass: '✅',
        fail: '❌ HALLUCINATION: Date missing or incorrect'
      },
      {
        name: 'Correct Time (10:30)',
        test: result.aiSummary.includes('10:30'),
        pass: '✅',
        fail: '❌ HALLUCINATION: Time missing or incorrect'
      },
      {
        name: 'No "Not Specified" phrases',
        test: !result.aiSummary.toLowerCase().includes('not specified'),
        pass: '✅',
        fail: '⚠️  WARNING: "Not specified" used for documented fields'
      },
      {
        name: 'DVLA Data Present',
        test: result.aiSummary.toLowerCase().includes('dvla') ||
              result.aiSummary.includes('VW') ||
              result.aiSummary.includes('Volkswagen'),
        pass: '✅',
        fail: '⚠️  WARNING: DVLA lookup data may be missing'
      }
    ];

    checks.forEach(check => {
      const status = check.test ? check.pass : check.fail;
      console.log(`  ${status} ${check.name}`);
    });

    console.log('');

    // Check for excessive "not documented" phrases
    const notDocumentedCount = (result.aiSummary.match(/not documented/gi) || []).length;
    console.log(`  "Not documented" phrases: ${notDocumentedCount}`);
    if (notDocumentedCount > 5) {
      console.log('  ⚠️  WARNING: Many fields reported as "not documented" - verify data extraction');
    } else {
      console.log('  ✅ Reasonable use of "not documented"');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Full Summary (first 1000 chars):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(result.aiSummary.substring(0, 1000));
    console.log('\n[... truncated ...]\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Test Complete - Full summary stored in database');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Fetch from database to confirm storage
    console.log('🔄 Verifying database storage...\n');

    const { data: storedData, error: fetchError } = await supabase
      .from('incident_reports')
      .select('ai_summary, form_data_summary_metadata')
      .eq('id', INCIDENT_ID)
      .eq('create_user_id', USER_ID)
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch from database:', fetchError.message);
    } else if (storedData?.ai_summary) {
      console.log('✅ Confirmed: Summary successfully stored in database');
      console.log(`   Stored Word Count: ${storedData.ai_summary.split(/\s+/).length}`);
      console.log(`   Metadata Present: ${storedData.form_data_summary_metadata ? 'Yes' : 'No'}\n`);
    } else {
      console.log('❌ Warning: Summary not found in database\n');
    }

    console.log('💡 Next Steps:');
    console.log('   1. Review factual accuracy checks above');
    console.log('   2. Generate PDF to verify Page 15 displays correctly');
    console.log('   3. If all checks pass, update routes to use new function');
    console.log('   4. Deploy to production\n');

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Test Failed\n');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  SINGLE-PHASE AI ARCHITECTURE TEST');
console.log('  Version: 1.0');
console.log('  Date: 2025-12-08');
console.log('═══════════════════════════════════════════════════════════════\n');

testNewArchitecture();
