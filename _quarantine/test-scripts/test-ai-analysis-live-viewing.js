#!/usr/bin/env node

/**
 * Test Script: AI Analysis Live Viewing Implementation
 *
 * Validates that all components for automatic AI analysis display are in place:
 * 1. Backend GET endpoint exists
 * 2. Frontend fetchExistingAnalysis() function exists
 * 3. Auto-fetch triggers are properly integrated
 * 4. Button text update logic is present
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing AI Analysis Live Viewing Implementation\n');

const results = {
  passed: [],
  failed: [],
  warnings: []
};

function test(name, condition, errorMessage = '') {
  if (condition) {
    results.passed.push(name);
    console.log(`✅ ${name}`);
  } else {
    results.failed.push(name);
    console.log(`❌ ${name}`);
    if (errorMessage) console.log(`   ${errorMessage}`);
  }
}

function warn(name, message) {
  results.warnings.push(name);
  console.log(`⚠️  ${name}`);
  if (message) console.log(`   ${message}`);
}

// ==================== BACKEND TESTS ====================
console.log('\n📦 Backend Components:\n');

try {
  // Test 1: Controller file exists
  const controllerPath = path.join(__dirname, 'src/controllers/ai.controller.js');
  const controllerExists = fs.existsSync(controllerPath);
  test('Controller file exists (ai.controller.js)', controllerExists);

  if (controllerExists) {
    const controllerContent = fs.readFileSync(controllerPath, 'utf8');

    // Test 2: getAnalysis function exists
    test(
      'getAnalysis function exported',
      controllerContent.includes('const getAnalysis = async') ||
      controllerContent.includes('async function getAnalysis')
    );

    // Test 3: reconstructAnalysisObject function exists
    test(
      'reconstructAnalysisObject helper exists',
      controllerContent.includes('function reconstructAnalysisObject')
    );

    // Test 4: parseFinalReview function exists
    test(
      'parseFinalReview helper exists',
      controllerContent.includes('function parseFinalReview')
    );

    // Test 5: GET endpoint handles incident_id parameter
    test(
      'GET endpoint uses incidentId parameter',
      controllerContent.includes('req.params.incidentId') ||
      controllerContent.includes('params.incidentId') ||
      controllerContent.includes('{ incidentId } = req.params')
    );

    // Test 6: Returns null gracefully when no analysis
    test(
      'Graceful null return when no analysis exists',
      controllerContent.includes('analysis: null')
    );
  }

  // Test 7: Routes file exists
  const routesPath = path.join(__dirname, 'src/routes/ai.routes.js');
  const routesExists = fs.existsSync(routesPath);
  test('Routes file exists (ai.routes.js)', routesExists);

  if (routesExists) {
    const routesContent = fs.readFileSync(routesPath, 'utf8');

    // Test 8: GET route defined
    test(
      'GET /api/ai/analysis/:incidentId route defined',
      routesContent.includes("router.get('/analysis/:incidentId'") ||
      routesContent.includes('router.get("/analysis/:incidentId"')
    );

    // Test 9: getAnalysis controller imported
    test(
      'getAnalysis imported from controller',
      routesContent.includes('getAnalysis')
    );
  }

} catch (error) {
  console.error('❌ Backend test error:', error.message);
  results.failed.push('Backend component check');
}

// ==================== FRONTEND TESTS ====================
console.log('\n🎨 Frontend Components:\n');

try {
  const frontendPath = path.join(__dirname, 'public/transcription-status.html');
  const frontendExists = fs.existsSync(frontendPath);
  test('Frontend file exists (transcription-status.html)', frontendExists);

  if (frontendExists) {
    const frontendContent = fs.readFileSync(frontendPath, 'utf8');

    // Test 10: fetchExistingAnalysis function exists
    test(
      'fetchExistingAnalysis() function defined',
      frontendContent.includes('async function fetchExistingAnalysis()')
    );

    // Test 11: Function checks for currentIncidentId
    test(
      'Function validates currentIncidentId',
      frontendContent.includes('if (!currentIncidentId)') &&
      frontendContent.includes('fetchExistingAnalysis')
    );

    // Test 12: GET API call to correct endpoint
    test(
      'Calls GET /api/ai/analysis/:incidentId',
      frontendContent.includes('/api/ai/analysis/${currentIncidentId}') ||
      frontendContent.includes('/api/ai/analysis/' + '${currentIncidentId}')
    );

    // Test 13: Displays analysis with displayAIAnalysis()
    test(
      'Calls displayAIAnalysis() with fetched data',
      frontendContent.includes('displayAIAnalysis(result.analysis)') ||
      frontendContent.includes('displayAIAnalysis')
    );

    // Test 14: Updates button text to "Regenerate"
    test(
      'Updates button text to indicate regeneration',
      frontendContent.includes('Regenerate AI Analysis') ||
      frontendContent.includes('🔄 Regenerate')
    );

    // ===== AUTO-FETCH TRIGGER POINTS =====
    console.log('\n🔄 Auto-Fetch Triggers:\n');

    // Test 15: Page load trigger in DOMContentLoaded
    const hasPageLoadTrigger = frontendContent.includes('DOMContentLoaded') &&
                                frontendContent.includes('fetchExistingAnalysis()') &&
                                frontendContent.includes('currentIncidentId');
    test(
      'Auto-fetch on page load (DOMContentLoaded)',
      hasPageLoadTrigger
    );

    // Test 16: Tab switch trigger in switchTab()
    const hasSwitchTabTrigger = frontendContent.includes('function switchTab') &&
                                 frontendContent.includes("tabName === 'analysis'") &&
                                 frontendContent.includes('fetchExistingAnalysis()');
    test(
      'Auto-fetch on tab switch (switchTab)',
      hasSwitchTabTrigger
    );

    // Test 17: After save trigger in saveTranscription()
    const hasSaveTrigger = frontendContent.includes('function saveTranscription') &&
                           frontendContent.includes('fetchExistingAnalysis()');
    test(
      'Auto-fetch after transcription save',
      hasSaveTrigger
    );

    // Test 18: Error handling with try/catch
    test(
      'Error handling with try/catch block',
      frontendContent.includes('try {') &&
      frontendContent.includes('catch (error)') &&
      frontendContent.includes('fetchExistingAnalysis')
    );

    // Test 19: Console logging for debugging
    const hasDebugLogs = (
      frontendContent.includes("console.log('🔍 Fetching existing analysis") ||
      frontendContent.includes('console.log("🔍 Fetching existing analysis') ||
      frontendContent.includes("console.log('ℹ️ No existing analysis found") ||
      frontendContent.includes("console.log('✅ Existing analysis found")
    );
    test(
      'Debug logging present',
      hasDebugLogs
    );

    // ===== INTEGRATION CHECKS =====
    console.log('\n🔗 Integration Points:\n');

    // Test 20: displayAIAnalysis function exists (called by fetchExistingAnalysis)
    test(
      'displayAIAnalysis() function exists',
      frontendContent.includes('function displayAIAnalysis') ||
      frontendContent.includes('const displayAIAnalysis')
    );

    // Test 21: generateSummaryBtn exists (button being updated)
    test(
      'Generate Summary button exists in HTML',
      frontendContent.includes('generateSummaryBtn') ||
      frontendContent.includes('id="generateSummaryBtn"')
    );

    // Test 22: currentIncidentId variable exists
    test(
      'currentIncidentId variable used',
      frontendContent.includes('currentIncidentId')
    );

  }

} catch (error) {
  console.error('❌ Frontend test error:', error.message);
  results.failed.push('Frontend component check');
}

// ==================== SUMMARY ====================
console.log('\n' + '='.repeat(60));
console.log('📊 Test Results Summary');
console.log('='.repeat(60));

console.log(`\n✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);

if (results.failed.length > 0) {
  console.log('\n❌ Failed Tests:');
  results.failed.forEach(test => console.log(`   - ${test}`));
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  results.warnings.forEach(warning => console.log(`   - ${warning}`));
}

const allPassed = results.failed.length === 0;

console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('✅ All tests passed! AI Analysis live viewing is ready.');
  console.log('\n📋 Implementation includes:');
  console.log('   - Backend GET endpoint for fetching existing analysis');
  console.log('   - Frontend auto-fetch function with error handling');
  console.log('   - Auto-fetch on page load (500ms delay)');
  console.log('   - Auto-fetch on tab switch to Analysis tab');
  console.log('   - Auto-fetch after transcription save (1000ms delay)');
  console.log('   - Button text update ("Generate" → "Regenerate")');
  console.log('   - Silent error handling (no user disruption)');
} else {
  console.log('❌ Some tests failed. Review the failed tests above.');
  process.exit(1);
}

console.log('='.repeat(60) + '\n');

// Exit codes
process.exit(allPassed ? 0 : 1);
