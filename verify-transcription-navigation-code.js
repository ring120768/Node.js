/**
 * Code Verification: Transcription Auto-Navigation Implementation
 *
 * Verifies that the code changes for auto-navigation are correctly implemented
 * without needing to run the full application or authenticate.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Transcription Auto-Navigation Code Implementation\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const htmlPath = path.join(__dirname, 'public/transcription-status.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

let allChecks = [];

// ============================================
// Check 1: Back Button Exists
// ============================================
console.log('1️⃣  Back Button in Analysis Tab');
const backButtonRegex = /Back to Edit Transcription/;
const hasBackButton = backButtonRegex.test(htmlContent);

if (hasBackButton) {
  console.log('   ✅ "Back to Edit Transcription" button found');
  allChecks.push(true);

  // Verify it's in Analysis tab
  const analysisTabStart = htmlContent.indexOf('<!-- Tab Panel: Analysis -->');
  const analysisTabContent = htmlContent.substring(analysisTabStart, analysisTabStart + 2000);
  const backButtonInAnalysis = analysisTabContent.includes('Back to Edit Transcription');

  if (backButtonInAnalysis) {
    console.log('   ✅ Button is located in Analysis tab');
  } else {
    console.log('   ⚠️  Button may not be in Analysis tab');
  }

  // Verify it calls switchTab('transcription')
  const switchTabMatch = analysisTabContent.match(/onclick="switchTab\('transcription'\)"/);
  if (switchTabMatch) {
    console.log('   ✅ Button calls switchTab(\'transcription\')');
  } else {
    console.log('   ❌ Button does not call switchTab(\'transcription\')');
    allChecks.push(false);
  }
} else {
  console.log('   ❌ Back button not found');
  allChecks.push(false);
}
console.log('');

// ============================================
// Check 2: displayAIAnalysis() Signature
// ============================================
console.log('2️⃣  displayAIAnalysis() Function Signature');
const displayFunctionRegex = /function\s+displayAIAnalysis\s*\(\s*analysis\s*,\s*autoSwitch\s*=\s*false\s*\)/;
const hasAutoSwitchParam = displayFunctionRegex.test(htmlContent);

if (hasAutoSwitchParam) {
  console.log('   ✅ Function has autoSwitch parameter with default false');
  allChecks.push(true);
} else {
  console.log('   ❌ Function missing autoSwitch parameter');
  allChecks.push(false);
}
console.log('');

// ============================================
// Check 3: Auto-Switch Logic in displayAIAnalysis()
// ============================================
console.log('3️⃣  Auto-Switch Logic');
const autoSwitchLogicRegex = /if\s*\(\s*autoSwitch\s*\)\s*{\s*switchTab\s*\(\s*['"]analysis['"]\s*\)/;
const hasAutoSwitchLogic = autoSwitchLogicRegex.test(htmlContent);

if (hasAutoSwitchLogic) {
  console.log('   ✅ Auto-switch logic calls switchTab(\'analysis\')');
  allChecks.push(true);

  // Verify it's at the start of the function
  const displayFuncStart = htmlContent.indexOf('function displayAIAnalysis(analysis, autoSwitch = false)');
  const nextSwitchTab = htmlContent.indexOf('switchTab(\'analysis\')', displayFuncStart);
  const nextSummarySection = htmlContent.indexOf('summarySection', displayFuncStart);

  if (nextSwitchTab < nextSummarySection && nextSwitchTab > 0) {
    console.log('   ✅ Auto-switch happens before displaying content');
  } else {
    console.log('   ⚠️  Auto-switch may be in wrong position');
  }
} else {
  console.log('   ❌ Auto-switch logic not found or incorrect');
  allChecks.push(false);
}
console.log('');

// ============================================
// Check 4: Call from generateAIAnalysis()
// ============================================
console.log('4️⃣  Call from generateAIAnalysis()');
const callWithTrueRegex = /displayAIAnalysis\s*\(\s*result\.analysis\s*,\s*true\s*\)/;
const hasCallWithTrue = callWithTrueRegex.test(htmlContent);

if (hasCallWithTrue) {
  console.log('   ✅ generateAIAnalysis() calls displayAIAnalysis(result.analysis, true)');
  allChecks.push(true);
} else {
  console.log('   ❌ generateAIAnalysis() does not pass true for autoSwitch');
  allChecks.push(false);
}
console.log('');

// ============================================
// Check 5: Tab Button Structure
// ============================================
console.log('5️⃣  Tab Button Structure');
// More flexible regex - allows attributes in any order
const recordTabRegex = /<button[^>]*class="tab-button[^"]*"[^>]*data-tab="record"[^>]*>/;
const transcriptionTabRegex = /<button[^>]*class="tab-button[^"]*"[^>]*data-tab="transcription"[^>]*>/;
const analysisTabRegex = /<button[^>]*class="tab-button[^"]*"[^>]*data-tab="analysis"[^>]*>/;

const hasRecordTab = recordTabRegex.test(htmlContent);
const hasTranscriptionTab = transcriptionTabRegex.test(htmlContent);
const hasAnalysisTab = analysisTabRegex.test(htmlContent);

if (hasRecordTab && hasTranscriptionTab && hasAnalysisTab) {
  console.log('   ✅ All three tab buttons present with correct data-tab attributes');
  allChecks.push(true);
} else {
  console.log('   ❌ Tab buttons incomplete:');
  console.log(`      Record: ${hasRecordTab ? '✅' : '❌'}`);
  console.log(`      Transcription: ${hasTranscriptionTab ? '✅' : '❌'}`);
  console.log(`      Analysis: ${hasAnalysisTab ? '✅' : '❌'}`);
  allChecks.push(false);
}
console.log('');

// ============================================
// Check 6: switchTab() Function Exists
// ============================================
console.log('6️⃣  switchTab() Function');
const switchTabFunctionRegex = /function\s+switchTab\s*\(\s*tabName/;
const hasSwitchTabFunction = switchTabFunctionRegex.test(htmlContent);

if (hasSwitchTabFunction) {
  console.log('   ✅ switchTab() function exists');
  allChecks.push(true);
} else {
  console.log('   ❌ switchTab() function not found');
  allChecks.push(false);
}
console.log('');

// ============================================
// Check 7: No Obvious Infinite Loop Issues
// ============================================
console.log('7️⃣  Infinite Loop Prevention');
// Check that switchTab doesn't automatically call displayAIAnalysis without conditions
const switchTabStart = htmlContent.indexOf('function switchTab(tabName');
const switchTabEnd = htmlContent.indexOf('}', switchTabStart + 500); // First closing brace
const switchTabBody = htmlContent.substring(switchTabStart, switchTabEnd);

// Look for conditional call to fetchExistingAnalysis (OK)
const hasConditionalFetch = /if\s*\(\s*tabName\s*===\s*['"]analysis['"]/i.test(switchTabBody);
const hasDisplayAIAnalysisCall = /displayAIAnalysis\s*\(/.test(switchTabBody);

if (hasConditionalFetch && !hasDisplayAIAnalysisCall) {
  console.log('   ✅ switchTab() only conditionally fetches analysis (no direct call to displayAIAnalysis)');
  allChecks.push(true);
} else if (hasDisplayAIAnalysisCall) {
  console.log('   ⚠️  switchTab() may call displayAIAnalysis (potential loop)');
  allChecks.push(false);
} else {
  console.log('   ✅ No obvious infinite loop pattern detected');
  allChecks.push(true);
}
console.log('');

// ============================================
// Final Summary
// ============================================
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 VERIFICATION SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const totalChecks = allChecks.length;
const passedChecks = allChecks.filter(c => c === true).length;
const failedChecks = totalChecks - passedChecks;

console.log(`Total Checks: ${totalChecks}`);
console.log(`✅ Passed: ${passedChecks}`);
console.log(`❌ Failed: ${failedChecks}\n`);

if (failedChecks === 0) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ALL CODE VERIFICATION CHECKS PASSED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎉 Implementation Details:');
  console.log('   • Auto-navigation to Analysis tab after AI completion');
  console.log('   • Back button for returning to Transcription tab');
  console.log('   • Infinite loop prevention using optional parameter');
  console.log('   • All tab navigation structures in place\n');
  console.log('📋 Next Step: Manual testing required (see MANUAL-TEST-TRANSCRIPTION-NAV.md)');
  console.log('   Authentication required for full browser testing.\n');
  process.exit(0);
} else {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('❌ CODE VERIFICATION FAILED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  Some implementation checks did not pass.');
  console.log('   Review the failed checks above and fix the issues.\n');
  process.exit(1);
}
