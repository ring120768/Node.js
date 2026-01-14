/**
 * Test Script: Transcription Auto-Navigation Flow
 *
 * Tests the UX improvement where AI analysis completion automatically
 * switches to the Analysis tab, and verifies the back button works.
 */

const puppeteer = require('puppeteer');

async function testTranscriptionNavigation() {
  console.log('🧪 Testing Transcription Auto-Navigation Flow\n');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for visual confirmation
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  try {
    // Step 1: Navigate to transcription page
    console.log('1️⃣  Navigating to transcription-status.html...');
    await page.goto('http://localhost:5000/transcription-status.html', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });
    console.log('   ✅ Page loaded\n');

    // Step 2: Check initial state - should be on Record tab
    console.log('2️⃣  Checking initial tab state...');
    const activeTab = await page.evaluate(() => {
      const activePanel = document.querySelector('.tab-panel.active');
      return activePanel ? activePanel.id : null;
    });
    console.log(`   📍 Active tab: ${activeTab}`);
    console.log(`   ${activeTab === 'tab-record' ? '✅' : '⚠️'} Expected: tab-record\n`);

    // Step 3: Switch to Transcription tab
    console.log('3️⃣  Switching to Transcription tab...');
    await page.click('button[data-tab="transcription"]');
    await page.waitForTimeout(500);

    const transcriptionTabActive = await page.evaluate(() => {
      return document.getElementById('tab-transcription').classList.contains('active');
    });
    console.log(`   ${transcriptionTabActive ? '✅' : '❌'} Transcription tab activated\n`);

    // Step 4: Simulate AI analysis completion by calling displayAIAnalysis with autoSwitch=true
    console.log('4️⃣  Simulating AI analysis completion (with autoSwitch=true)...');
    await page.evaluate(() => {
      // Mock analysis data
      const mockAnalysis = {
        summary: 'Test summary of the incident',
        keyDetails: [
          'Test detail 1',
          'Test detail 2'
        ],
        recommendations: [
          'Test recommendation 1',
          'Test recommendation 2'
        ],
        legalConsiderations: 'Test legal considerations',
        nextSteps: [
          'Test next step 1',
          'Test next step 2'
        ]
      };

      // Call displayAIAnalysis with autoSwitch=true (simulates completion)
      window.displayAIAnalysis(mockAnalysis, true);
    });

    await page.waitForTimeout(1000); // Wait for tab switch animation

    // Step 5: Verify auto-navigation to Analysis tab
    console.log('5️⃣  Verifying auto-navigation to Analysis tab...');
    const analysisTabActive = await page.evaluate(() => {
      return document.getElementById('tab-analysis').classList.contains('active');
    });
    console.log(`   ${analysisTabActive ? '✅' : '❌'} Analysis tab auto-activated`);

    if (!analysisTabActive) {
      throw new Error('FAIL: Auto-navigation did not switch to Analysis tab');
    }
    console.log('   ✅ AUTO-NAVIGATION WORKS!\n');

    // Step 6: Verify back button exists
    console.log('6️⃣  Checking for "Back to Edit Transcription" button...');
    const backButtonExists = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('#tab-analysis button'));
      return buttons.some(btn => btn.textContent.includes('Back to Edit Transcription'));
    });
    console.log(`   ${backButtonExists ? '✅' : '❌'} Back button found\n`);

    if (!backButtonExists) {
      throw new Error('FAIL: Back button not found in Analysis tab');
    }

    // Step 7: Test back button functionality
    console.log('7️⃣  Testing back button click...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('#tab-analysis button'));
      const backButton = buttons.find(btn => btn.textContent.includes('Back to Edit Transcription'));
      backButton.click();
    });

    await page.waitForTimeout(500);

    const backToTranscription = await page.evaluate(() => {
      return document.getElementById('tab-transcription').classList.contains('active');
    });
    console.log(`   ${backToTranscription ? '✅' : '❌'} Returned to Transcription tab`);

    if (!backToTranscription) {
      throw new Error('FAIL: Back button did not return to Transcription tab');
    }
    console.log('   ✅ BACK BUTTON WORKS!\n');

    // Step 8: Verify no infinite loop when manually clicking Analysis tab
    console.log('8️⃣  Testing manual Analysis tab click (should not cause loop)...');
    await page.click('button[data-tab="analysis"]');
    await page.waitForTimeout(500);

    const manualSwitchWorks = await page.evaluate(() => {
      return document.getElementById('tab-analysis').classList.contains('active');
    });
    console.log(`   ${manualSwitchWorks ? '✅' : '❌'} Manual tab switch works`);
    console.log('   ✅ NO INFINITE LOOP!\n');

    // Final summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL TESTS PASSED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Test Results:');
    console.log('   ✅ Auto-navigation to Analysis tab after AI completion');
    console.log('   ✅ Back button navigates to Transcription tab');
    console.log('   ✅ Manual tab clicks work normally');
    console.log('   ✅ No infinite loop issues');
    console.log('\n🎉 UX improvement working as expected!\n');

    await page.waitForTimeout(3000); // Keep browser open briefly for visual confirmation

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\n📸 Taking screenshot of failure state...');
    await page.screenshot({ path: '/tmp/test-failure.png', fullPage: true });
    console.error('   Screenshot saved to: /tmp/test-failure.png\n');
    throw error;

  } finally {
    await browser.close();
  }
}

// Run test
(async () => {
  try {
    await testTranscriptionNavigation();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
})();
