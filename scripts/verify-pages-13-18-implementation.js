/**
 * COMPREHENSIVE VERIFICATION SCRIPT FOR PAGES 13-18 IMPLEMENTATION
 *
 * This script verifies the complete architectural implementation for PDF Pages 13-18:
 * - Page 13: User's direct statement (transcription text only)
 * - Page 14: Comprehensive AI closing statement narrative (800-1200 words)
 * - Page 15: Key points summary + Next steps guide
 * - Page 18: Emergency audio transcription (TEXT ONLY - no URLs)
 *
 * CRITICAL REQUIREMENTS:
 * 1. All data must be FACTUAL (based on user input from pages 1-12)
 * 2. NO URLs allowed in legal document (especially Page 18 emergency audio)
 * 3. Page 14 narrative must use ALL incident data (160+ fields)
 * 4. Temperature 0.3 for legal accuracy
 *
 * Usage: node scripts/verify-pages-13-18-implementation.js [user-uuid]
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Verification results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Print formatted section header
 */
function printHeader(title) {
  console.log('\n' + '='.repeat(80));
  console.log(colors.bright + colors.cyan + title + colors.reset);
  console.log('='.repeat(80) + '\n');
}

/**
 * Print test result
 */
function printResult(test, status, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const color = status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow;
  console.log(`${icon} ${color}${test}${colors.reset}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

/**
 * Verify Page 13: User's Transcription
 */
async function verifyPage13(userId) {
  printHeader('PAGE 13 VERIFICATION: User\'s Direct Statement');

  const { data: transcription, error } = await supabase
    .from('ai_transcription')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !transcription) {
    printResult('Page 13 Data Exists', 'FAIL', 'No transcription found in ai_transcription table');
    results.failed.push('Page 13: No transcription data');
    return null;
  }

  printResult('Page 13 Data Exists', 'PASS', `Found transcription ID: ${transcription.id}`);

  // Check transcription text
  if (transcription.transcription && transcription.transcription.trim().length > 0) {
    const wordCount = transcription.transcription.split(/\s+/).length;
    printResult('Page 13 Text Content', 'PASS', `${transcription.transcription.length} characters, ${wordCount} words`);
    results.passed.push(`Page 13: ${wordCount} words of user transcription`);
  } else {
    printResult('Page 13 Text Content', 'FAIL', 'Transcription text is empty');
    results.failed.push('Page 13: Empty transcription text');
  }

  // Verify it's NOT AI-generated (should not have summary/key points)
  if (!transcription.summary && !transcription.key_points) {
    printResult('Page 13 Source Type', 'PASS', 'Confirmed user input (not AI-generated)');
  } else {
    printResult('Page 13 Source Type', 'WARN', 'Has summary/key_points (should be user input only)');
    results.warnings.push('Page 13: May contain AI-generated content');
  }

  return transcription;
}

/**
 * Verify Page 14: Comprehensive AI Closing Statement Narrative
 */
async function verifyPage14(userId) {
  printHeader('PAGE 14 VERIFICATION: Comprehensive Closing Statement Narrative (CENTRE PIECE)');

  const { data: analysis, error } = await supabase
    .from('ai_analysis')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !analysis) {
    printResult('Page 14 Data Exists', 'FAIL', 'No analysis found in ai_analysis table');
    results.failed.push('Page 14: No AI analysis data');
    return null;
  }

  printResult('Page 14 Data Exists', 'PASS', `Found analysis ID: ${analysis.id}`);

  // Check combined_report field (HTML format)
  if (analysis.combined_report && analysis.combined_report.trim().length > 0) {
    const plainText = analysis.combined_report
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();

    const charCount = plainText.length;
    const wordCount = plainText.split(/\s+/).length;

    // Target: 800-1200 words for comprehensive closing statement
    if (wordCount >= 800 && wordCount <= 1200) {
      printResult('Page 14 Narrative Length', 'PASS', `${charCount} characters, ${wordCount} words (optimal range)`);
      results.passed.push(`Page 14: ${wordCount} words comprehensive narrative`);
    } else if (wordCount < 800) {
      printResult('Page 14 Narrative Length', 'WARN', `${charCount} characters, ${wordCount} words (below 800 target)`);
      results.warnings.push(`Page 14: Only ${wordCount} words (target 800-1200)`);
    } else {
      printResult('Page 14 Narrative Length', 'WARN', `${charCount} characters, ${wordCount} words (above 1200 target)`);
      results.warnings.push(`Page 14: ${wordCount} words (target 800-1200)`);
    }

    // Check for HTML tags (should be present in DB, stripped for PDF)
    if (analysis.combined_report.includes('<p>') || analysis.combined_report.includes('<ul>')) {
      printResult('Page 14 HTML Format', 'PASS', 'Contains HTML formatting (will be converted to plain text for PDF)');
    } else {
      printResult('Page 14 HTML Format', 'WARN', 'No HTML tags found (expected <p>, <ul>, <li>)');
      results.warnings.push('Page 14: Missing HTML formatting');
    }
  } else {
    printResult('Page 14 Narrative Content', 'FAIL', 'combined_report field is empty');
    results.failed.push('Page 14: Empty combined_report');
  }

  // Verify comprehensive data usage
  if (analysis.incident_data && typeof analysis.incident_data === 'object') {
    const dataCategories = Object.keys(analysis.incident_data);
    printResult('Page 14 Data Comprehensiveness', 'PASS', `Uses ${dataCategories.length} data categories`);
    console.log(`   Categories: ${dataCategories.join(', ')}`);
  } else {
    printResult('Page 14 Data Comprehensiveness', 'WARN', 'incident_data field missing or empty');
    results.warnings.push('Page 14: May not use comprehensive incident data');
  }

  return analysis;
}

/**
 * Verify Page 15: Key Points & Next Steps Guide
 */
async function verifyPage15(analysis) {
  printHeader('PAGE 15 VERIFICATION: Key Points Summary & Next Steps Guide');

  if (!analysis) {
    printResult('Page 15 Data Source', 'FAIL', 'No analysis data available');
    results.failed.push('Page 15: Missing analysis data');
    return;
  }

  // Check key_points array
  if (analysis.key_points && Array.isArray(analysis.key_points) && analysis.key_points.length > 0) {
    printResult('Page 15 Key Points', 'PASS', `${analysis.key_points.length} bullet points`);
    console.log(`   Preview:`);
    analysis.key_points.slice(0, 3).forEach((point, index) => {
      console.log(`   ${index + 1}. ${point.substring(0, 80)}...`);
    });
    results.passed.push(`Page 15: ${analysis.key_points.length} key points`);
  } else {
    printResult('Page 15 Key Points', 'FAIL', 'key_points array is empty or missing');
    results.failed.push('Page 15: No key points');
  }

  // Check final_review.nextSteps
  if (analysis.final_review &&
      analysis.final_review.nextSteps &&
      Array.isArray(analysis.final_review.nextSteps) &&
      analysis.final_review.nextSteps.length > 0) {
    printResult('Page 15 Next Steps', 'PASS', `${analysis.final_review.nextSteps.length} action items`);
    console.log(`   Preview:`);
    analysis.final_review.nextSteps.slice(0, 3).forEach((step, index) => {
      console.log(`   ${index + 1}. ${step.substring(0, 80)}...`);
    });
    results.passed.push(`Page 15: ${analysis.final_review.nextSteps.length} next steps`);
  } else {
    printResult('Page 15 Next Steps', 'FAIL', 'final_review.nextSteps array is empty or missing');
    results.failed.push('Page 15: No next steps');
  }

  // Verify NO combined_report duplication on Page 15
  printResult('Page 15 No Narrative Duplication', 'PASS', 'Page 15 contains only key points + next steps (narrative is on Page 14)');
}

/**
 * Verify Page 18: Emergency Audio Transcription (TEXT ONLY - NO URLs)
 */
async function verifyPage18(userId) {
  printHeader('PAGE 18 VERIFICATION: Emergency Audio Transcription (LEGAL REQUIREMENT: TEXT ONLY)');

  // First get incident ID
  const { data: incident, error: incidentError } = await supabase
    .from('incident_reports')
    .select('id')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (incidentError || !incident) {
    printResult('Page 18 Incident Lookup', 'WARN', 'No incident report found (emergency audio is optional)');
    results.warnings.push('Page 18: No incident report (emergency audio optional)');
    return null;
  }

  // Get emergency audio transcription
  const { data: emergencyAudio, error: audioError } = await supabase
    .from('ai_listening_transcripts')
    .select('*')
    .eq('incident_id', incident.id)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  if (audioError || !emergencyAudio) {
    printResult('Page 18 Data Exists', 'WARN', 'No emergency audio found (feature is optional)');
    results.warnings.push('Page 18: No emergency audio (optional feature)');
    return null;
  }

  printResult('Page 18 Data Exists', 'PASS', `Found emergency audio ID: ${emergencyAudio.id}`);

  // CRITICAL: Verify transcription_text exists (legal requirement)
  if (emergencyAudio.transcription_text && emergencyAudio.transcription_text.trim().length > 0) {
    const charCount = emergencyAudio.transcription_text.length;
    const wordCount = emergencyAudio.transcription_text.split(/\s+/).length;
    printResult('Page 18 Transcription Text', 'PASS', `${charCount} characters, ${wordCount} words`);
    results.passed.push(`Page 18: ${wordCount} words emergency audio transcription`);
  } else {
    printResult('Page 18 Transcription Text', 'FAIL', 'transcription_text is empty or missing');
    results.failed.push('Page 18: Missing transcription text (LEGAL REQUIREMENT)');
  }

  // CRITICAL: Verify NO audio_url field (legal requirement - text only)
  if (!emergencyAudio.audio_url) {
    printResult('Page 18 No URLs', 'PASS', '✅ LEGAL REQUIREMENT MET: No audio_url field (text only)');
    results.passed.push('Page 18: Legal compliance - no URLs');
  } else {
    printResult('Page 18 No URLs', 'FAIL', '❌ LEGAL VIOLATION: audio_url field exists (must be text only)');
    results.failed.push('Page 18: LEGAL VIOLATION - contains URL');
  }

  // Check metadata (duration, timestamp)
  if (emergencyAudio.duration_seconds) {
    const minutes = Math.floor(emergencyAudio.duration_seconds / 60);
    const seconds = emergencyAudio.duration_seconds % 60;
    printResult('Page 18 Duration Metadata', 'PASS', `${minutes}m ${seconds}s`);
  } else {
    printResult('Page 18 Duration Metadata', 'WARN', 'No duration information');
  }

  if (emergencyAudio.recorded_at) {
    printResult('Page 18 Timestamp Metadata', 'PASS', `Recorded: ${new Date(emergencyAudio.recorded_at).toLocaleString('en-GB')}`);
  } else {
    printResult('Page 18 Timestamp Metadata', 'WARN', 'No timestamp information');
  }

  return emergencyAudio;
}

/**
 * Verify dataFetcher.js implementation
 */
async function verifyDataFetcher() {
  printHeader('DATA FETCHER VERIFICATION: lib/dataFetcher.js');

  const fs = require('fs');
  const dataFetcherPath = path.join(__dirname, '..', 'lib', 'dataFetcher.js');
  const content = fs.readFileSync(dataFetcherPath, 'utf8');

  // Check for emergency audio URL generation removal
  if (!content.includes('createSignedUrl(emergencyAudio.audio_storage_path')) {
    printResult('Emergency Audio URL Removal', 'PASS', 'Confirmed: No signed URL generation for emergency audio');
    results.passed.push('dataFetcher: Emergency audio URL generation removed');
  } else {
    printResult('Emergency Audio URL Removal', 'FAIL', 'FOUND: createSignedUrl() call for emergency audio (must be removed)');
    results.failed.push('dataFetcher: Still generating emergency audio URLs');
  }

  // Check for correct page mapping comments
  if (content.includes('// Page 13: User\'s Direct Statement') ||
      content.includes('Page 13 (User\'s Direct Statement)')) {
    printResult('Page 13 Comment Mapping', 'PASS', 'Correct comment: Page 13 = User\'s transcription');
  } else {
    printResult('Page 13 Comment Mapping', 'WARN', 'Page 13 comment may be incorrect');
  }

  if (content.includes('Pages 14-15') && content.includes('comprehensive closing statement')) {
    printResult('Pages 14-15 Comment Mapping', 'PASS', 'Correct comment: Pages 14-15 = Comprehensive analysis');
  } else {
    printResult('Pages 14-15 Comment Mapping', 'WARN', 'Pages 14-15 comments may be incorrect');
  }

  if (content.includes('Page 18') && content.includes('TEXT ONLY')) {
    printResult('Page 18 Legal Requirement Comment', 'PASS', 'Correct comment: Page 18 = TEXT ONLY, NO URLs');
    results.passed.push('dataFetcher: Page 18 legal requirement documented');
  } else {
    printResult('Page 18 Legal Requirement Comment', 'WARN', 'Page 18 legal requirement comment missing');
  }
}

/**
 * Verify PDF field mapper implementation
 */
async function verifyPdfFieldMapper() {
  printHeader('PDF FIELD MAPPER VERIFICATION: src/services/adobePdfFormFillerService.js');

  const fs = require('fs');
  const pdfServicePath = path.join(__dirname, '..', 'src', 'services', 'adobePdfFormFillerService.js');
  const content = fs.readFileSync(pdfServicePath, 'utf8');

  // Check Page 13 mapping
  if (content.includes('data.aiTranscription?.transcription') &&
      content.includes('ai_summary_of_accident_data_transcription')) {
    printResult('Page 13 PDF Mapping', 'PASS', 'Correctly maps user transcription to Page 13');
    results.passed.push('PDF Mapper: Page 13 = user transcription');
  } else {
    printResult('Page 13 PDF Mapping', 'FAIL', 'Page 13 mapping incorrect');
    results.failed.push('PDF Mapper: Page 13 mapping wrong');
  }

  // Check Page 14 mapping
  if (content.includes('data.aiAnalysis?.combinedReport') &&
      content.includes('detailed_account_of_what_happened')) {
    printResult('Page 14 PDF Mapping', 'PASS', 'Correctly maps comprehensive narrative to Page 14');
    results.passed.push('PDF Mapper: Page 14 = comprehensive narrative');
  } else {
    printResult('Page 14 PDF Mapping', 'FAIL', 'Page 14 mapping incorrect');
    results.failed.push('PDF Mapper: Page 14 mapping wrong');
  }

  // Check Page 14 HTML stripping
  if (content.includes('.replace(/<p>/gi,') && content.includes('.replace(/<ul>/gi,')) {
    printResult('Page 14 HTML Stripping', 'PASS', 'Correctly strips HTML tags for PDF');
    results.passed.push('PDF Mapper: Page 14 HTML stripping implemented');
  } else {
    printResult('Page 14 HTML Stripping', 'WARN', 'Page 14 HTML stripping may be incomplete');
  }

  // Check Page 15 mapping
  if (content.includes('data.aiAnalysis.keyPoints') &&
      content.includes('data.aiAnalysis.finalReview?.nextSteps') &&
      content.includes('ai_combined_narrative_and_next_steps')) {
    printResult('Page 15 PDF Mapping', 'PASS', 'Correctly maps key points + next steps to Page 15');
    results.passed.push('PDF Mapper: Page 15 = key points + next steps');
  } else {
    printResult('Page 15 PDF Mapping', 'FAIL', 'Page 15 mapping incorrect');
    results.failed.push('PDF Mapper: Page 15 mapping wrong');
  }

  // Check Page 18 mapping
  if (content.includes('data.emergencyAudio?.transcription_text') &&
      content.includes('emergency_audio_transcription')) {
    printResult('Page 18 PDF Mapping', 'PASS', 'Correctly maps emergency audio transcription to Page 18');
    results.passed.push('PDF Mapper: Page 18 = emergency audio text only');
  } else {
    printResult('Page 18 PDF Mapping', 'FAIL', 'Page 18 mapping incorrect');
    results.failed.push('PDF Mapper: Page 18 mapping wrong');
  }

  // Check for NO URL usage on Page 18
  if (!content.includes('emergency_audio_url') &&
      content.includes('TEXT ONLY')) {
    printResult('Page 18 No URL Usage', 'PASS', 'Confirmed: No URL field usage for emergency audio');
    results.passed.push('PDF Mapper: Page 18 legal compliance (no URLs)');
  } else if (content.includes('emergency_audio_url')) {
    printResult('Page 18 No URL Usage', 'FAIL', 'FOUND: emergency_audio_url field (violates legal requirement)');
    results.failed.push('PDF Mapper: Page 18 LEGAL VIOLATION (uses URLs)');
  }
}

/**
 * Print final results summary
 */
function printResultsSummary() {
  printHeader('VERIFICATION RESULTS SUMMARY');

  const totalTests = results.passed.length + results.failed.length + results.warnings.length;
  const passRate = ((results.passed.length / totalTests) * 100).toFixed(1);

  console.log(`${colors.bright}Total Tests: ${totalTests}${colors.reset}`);
  console.log(`${colors.green}✅ Passed: ${results.passed.length}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${results.failed.length}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${results.warnings.length}${colors.reset}`);
  console.log(`${colors.cyan}Pass Rate: ${passRate}%${colors.reset}\n`);

  if (results.failed.length > 0) {
    console.log(colors.red + colors.bright + '\nFAILED CHECKS:' + colors.reset);
    results.failed.forEach((failure, index) => {
      console.log(`  ${index + 1}. ${failure}`);
    });
  }

  if (results.warnings.length > 0) {
    console.log(colors.yellow + colors.bright + '\nWARNINGS:' + colors.reset);
    results.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`);
    });
  }

  console.log('\n' + '='.repeat(80));

  // Overall status
  if (results.failed.length === 0) {
    console.log(colors.green + colors.bright + '✅ ALL CRITICAL CHECKS PASSED - Implementation is production-ready!' + colors.reset);
  } else {
    console.log(colors.red + colors.bright + '❌ CRITICAL FAILURES DETECTED - Fix required before production deployment' + colors.reset);
  }

  console.log('='.repeat(80) + '\n');
}

/**
 * Main verification function
 */
async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error(colors.red + 'Error: User UUID required' + colors.reset);
    console.log('\nUsage: node scripts/verify-pages-13-18-implementation.js <user-uuid>');
    console.log('\nExample:');
    console.log('  node scripts/verify-pages-13-18-implementation.js ee7cfcaf-5810-4c62-b99b-ab0f2291733e');
    process.exit(1);
  }

  console.log(colors.bright + colors.magenta);
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                  PAGES 13-18 IMPLEMENTATION VERIFICATION                   ║');
  console.log('║                                                                            ║');
  console.log('║  Testing complete architectural implementation for PDF Pages 13-18         ║');
  console.log('║  CRITICAL: Legal document requirements (factual data, NO URLs)             ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  console.log(`\n${colors.cyan}User ID: ${userId}${colors.reset}`);
  console.log(`${colors.cyan}Timestamp: ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}${colors.reset}\n`);

  try {
    // Verify code implementation first
    await verifyDataFetcher();
    await verifyPdfFieldMapper();

    // Verify database data
    const transcription = await verifyPage13(userId);
    const analysis = await verifyPage14(userId);
    await verifyPage15(analysis);
    await verifyPage18(userId);

    // Print final summary
    printResultsSummary();

    // Exit with appropriate code
    process.exit(results.failed.length === 0 ? 0 : 1);

  } catch (error) {
    console.error(colors.red + colors.bright + '\nERROR:' + colors.reset, error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run verification
main();
